import { Request, Response } from 'express';
import { Pool } from 'pg';
import { OrderModel } from '../models/Order';
import { InquiryModel } from '../models/Inquiry';
import { NotificationService } from '../services/NotificationService';
import { CreateOrderRequest, UpdateOrderRequest, UpdateOrderStatusRequest } from '../types/order';
import { AuthenticatedRequest } from '../types/user';
import { canUserAccessOrder, canUserModifyOrder, canUserDeleteOrder } from '../utils/permissionUtils';
import { notifyOrderConfirmed, notifyStatusUpdate } from '../utils/socketUtils';

export class OrderController {
  private orderModel: OrderModel;
  private inquiryModel: InquiryModel;
  private notificationService: NotificationService;

  constructor(db: Pool) {
    this.orderModel = new OrderModel(db);
    this.inquiryModel = new InquiryModel(db);
    this.notificationService = new NotificationService(db);
  }

  /**
   * 获取所有订单（支持分页和筛选）
   */
  static async getAllOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const { page = 1, limit = 10, status, createdBy } = req.query;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);

      // 构建查询选项
      const options: any = {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      };

      if (status) {
        options.status = status as string;
      }

      // 根据用户角色过滤订单
      if (user.role === 'buyer') {
        // 买方只能看到自己创建的订单
        options.createdBy = user.id;
      } else if (user.role === 'supplier') {
        // 供应商可以看到所有订单，但可以按创建者筛选
        if (createdBy) {
          options.createdBy = createdBy as string;
        }
      } else if (user.role === 'admin') {
        // 管理员可以看到所有订单，支持按创建者筛选
        if (createdBy) {
          options.createdBy = createdBy as string;
        }
      }

      const result = await orderModel.findAll(options);

      res.json({
        success: true,
        data: {
          orders: result.orders,
          pagination: {
            page: options.page,
            limit: options.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / options.limit)
          }
        }
      });
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ORDERS_ERROR',
          message: '获取订单列表失败'
        }
      });
    }
  }

  /**
   * 根据ID获取订单详情
   */
  static async getOrderById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);

      const order = await orderModel.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: '订单不存在'
          }
        });
      }

      // 检查用户权限
      if (!canUserAccessOrder(user, order)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权访问此订单'
          }
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'GET_ORDER_ERROR',
          message: '获取订单详情失败'
        }
      });
    }
  }

  /**
   * 创建订单（支持从询单转换和独立创建）
   */
  static async createOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const orderData: CreateOrderRequest = req.body;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);
      const inquiryModel = new InquiryModel(db);
      const notificationService = new NotificationService(db);

      // 只有买方用户可以创建订单
      if (user.role !== 'buyer') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '只有买方用户可以创建订单'
          }
        });
      }

      // 如果是从询单转换，需要验证询单存在且用户有权限
      if (orderData.inquiryId) {
        const inquiry = await inquiryModel.findById(orderData.inquiryId);
        if (!inquiry) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'INQUIRY_NOT_FOUND',
              message: '询单不存在'
            }
          });
        }

        // 检查用户是否有权限操作此询单
        if (inquiry.createdBy !== user.id) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: '无权操作此询单'
            }
          });
        }

        // 检查询单状态是否允许转换为订单
        if (inquiry.status !== 'replied') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INQUIRY_STATUS',
              message: '只有已回复的询单才能转换为订单'
            }
          });
        }

        // 更新询单状态为已转换
        await inquiryModel.update(inquiry.id, { status: 'converted' });
      }

      // 创建订单
      const order = await orderModel.create({
        inquiryId: orderData.inquiryId,
        productName: orderData.productName,
        materialType: orderData.materialType,
        specifications: orderData.specifications,
        specialRequirements: orderData.specialRequirements,
        unitPrice: orderData.unitPrice,
        quantity: orderData.quantity,
        totalPrice: orderData.totalPrice,
        createdBy: user.id
      });

      // 发送订单创建通知给供应商
      await notificationService.createNotification({
        userId: 'supplier-notification', // 这里需要根据实际业务逻辑确定通知的供应商
        type: 'order_created',
        title: '新订单创建',
        content: `订单 ${order.orderNumber} 已创建，请及时确认`,
        relatedId: order.id,
        relatedType: 'order'
      });

      res.status(201).json({
        success: true,
        data: order,
        message: '订单创建成功'
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_ORDER_ERROR',
          message: '创建订单失败'
        }
      });
    }
  }

  /**
   * 更新订单信息
   */
  static async updateOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateOrderRequest = req.body;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);

      const order = await orderModel.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: '订单不存在'
          }
        });
      }

      // 检查用户权限
      if (!canUserModifyOrder(user, order)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权修改此订单'
          }
        });
      }

      // 检查订单状态是否允许修改
      if (!orderModel.canModify(order)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_STATUS',
            message: '当前订单状态不允许修改'
          }
        });
      }

      // 计算新的总价（如果单价或数量发生变化）
      const newUnitPrice = updateData.unitPrice ?? order.unitPrice;
      const newQuantity = updateData.quantity ?? order.quantity;
      const newTotalPrice = newUnitPrice * newQuantity;

      const updatedOrder = await orderModel.update(id, {
        ...updateData,
        totalPrice: newTotalPrice
      });

      res.json({
        success: true,
        data: updatedOrder,
        message: '订单更新成功'
      });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ORDER_ERROR',
          message: '更新订单失败'
        }
      });
    }
  }

  /**
   * 更新订单状态
   */
  static async updateOrderStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { status, confirmedBy }: UpdateOrderStatusRequest = req.body;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);
      const notificationService = new NotificationService(db);

      const order = await orderModel.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: '订单不存在'
          }
        });
      }

      // 检查状态转换是否有效
      if (!orderModel.canUpdateStatus(order.status, status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `无法从 ${order.status} 状态转换到 ${status} 状态`
          }
        });
      }

      // 根据状态转换检查用户权限
      if (status === 'confirmed' && user.role !== 'supplier') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '只有供应商可以确认订单'
          }
        });
      }

      if (['production', 'shipped'].includes(status) && user.role !== 'supplier') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '只有供应商可以更新生产和发货状态'
          }
        });
      }

      if (status === 'completed' && user.role !== 'buyer') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '只有买方可以确认订单完成'
          }
        });
      }

      // 更新订单状态
      const updateData: any = { status };
      if (status === 'confirmed' && confirmedBy) {
        updateData.confirmedBy = confirmedBy;
      }

      const updatedOrder = await orderModel.update(id, updateData);

      // 发送状态变更通知
      const notificationUserId = status === 'confirmed' ? order.createdBy : 
                                status === 'completed' ? order.confirmedBy : 
                                order.createdBy;

      if (notificationUserId) {
        await notificationService.createNotification({
          userId: notificationUserId,
          type: 'status_updated',
          title: '订单状态更新',
          content: `订单 ${order.orderNumber} 状态已更新为 ${status}`,
          relatedId: order.id,
          relatedType: 'order'
        });
      }

      // 发送实时通知
      if (status === 'confirmed') {
        notifyOrderConfirmed(id, updatedOrder);
      } else {
        notifyStatusUpdate(id, 'order', status, user.username);
      }

      res.json({
        success: true,
        data: updatedOrder,
        message: '订单状态更新成功'
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_ORDER_STATUS_ERROR',
          message: '更新订单状态失败'
        }
      });
    }
  }

  /**
   * 作废订单
   */
  static async cancelOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);
      const notificationService = new NotificationService(db);

      const order = await orderModel.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: '订单不存在'
          }
        });
      }

      // 检查用户权限
      // 买方只能作废自己创建的订单，供应商可以作废任何订单，管理员可以作废任何订单
      if (user.role === 'buyer' && order.createdBy !== user.id) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权作废此订单'
          }
        });
      }

      // 检查订单状态是否允许作废
      if (!orderModel.canCancel(order)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ORDER_STATUS',
            message: '当前订单状态不允许作废'
          }
        });
      }

      // 如果订单已被供应商确认，买方不能作废
      if (order.status === 'confirmed' && user.role === 'buyer') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ORDER_CONFIRMED',
            message: '订单已被供应商确认，无法作废'
          }
        });
      }

      const updatedOrder = await orderModel.update(id, { status: 'cancelled' });

      // 发送作废通知
      const notificationUserId = user.role === 'buyer' ? order.confirmedBy : order.createdBy;
      if (notificationUserId) {
        await notificationService.createNotification({
          userId: notificationUserId,
          type: 'status_updated',
          title: '订单已作废',
          content: `订单 ${order.orderNumber} 已被作废`,
          relatedId: order.id,
          relatedType: 'order'
        });
      }

      res.json({
        success: true,
        data: updatedOrder,
        message: '订单作废成功'
      });
    } catch (error) {
      console.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_ORDER_ERROR',
          message: '作废订单失败'
        }
      });
    }
  }

  /**
   * 删除订单（仅管理员）
   */
  static async deleteOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = req.app.get('db') as Pool;
      const orderModel = new OrderModel(db);

      const order = await orderModel.findById(id);
      if (!order) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'ORDER_NOT_FOUND',
            message: '订单不存在'
          }
        });
      }

      // 检查用户权限
      if (!canUserDeleteOrder(user, order)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: '无权删除此订单'
          }
        });
      }

      const deleted = await orderModel.delete(id);
      if (!deleted) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'DELETE_FAILED',
            message: '删除订单失败'
          }
        });
      }

      res.json({
        success: true,
        message: '订单删除成功'
      });
    } catch (error) {
      console.error('Delete order error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_ORDER_ERROR',
          message: '删除订单失败'
        }
      });
    }
  }
}