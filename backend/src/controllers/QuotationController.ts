import { Request, Response } from 'express';
import { Pool } from 'pg';
import { QuotationModel } from '../models/Quotation';
import { CreateQuotationRequest, UpdateQuotationRequest, QuotationResponse } from '../types/quotation';
import { AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';
import { notifyNewQuotation } from '../utils/socketUtils';

export class QuotationController {
  private quotationModel: QuotationModel;

  constructor(private db: Pool) {
    this.quotationModel = new QuotationModel(db);
  }

  /**
   * 创建报价（供应商回复询单）
   */
  static async createQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inquiryId, unitPrice, totalPrice, deliveryTime, remarks } = req.body as CreateQuotationRequest;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 验证用户角色
      if (userRole !== 'supplier') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只有供应商用户可以创建报价'
          }
        });
        return;
      }

      // 验证必填字段
      if (!inquiryId || !unitPrice || !totalPrice || !deliveryTime) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: '询单ID、单价、总价和工期为必填字段'
          }
        });
        return;
      }

      const quotationModel = new QuotationModel(req.db);
      const quotation = await quotationModel.create({
        inquiryId,
        unitPrice,
        totalPrice,
        deliveryTime,
        remarks
      }, userId);

      // 获取询单信息以发送通知
      const inquiryQuery = 'SELECT created_by FROM inquiries WHERE id = $1';
      const inquiryResult = await req.db.query(inquiryQuery, [inquiryId]);
      
      if (inquiryResult.rows.length > 0) {
        const buyerUserId = inquiryResult.rows[0].created_by;
        
        // 创建报价通知
        const notificationService = new NotificationService(req.db);
        try {
          await notificationService.createQuotationNotification(
            quotation.id,
            quotation.inquiryId,
            buyerUserId
          );
        } catch (notificationError) {
          console.error('Failed to create quotation notification:', notificationError);
          // 不影响报价创建的主流程
        }
        
        // 发送实时通知
        notifyNewQuotation(inquiryId, quotation);
      }

      const response: QuotationResponse = {
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      };

      res.status(201).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Create quotation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '创建报价失败'
        }
      });
    }
  }

  /**
   * 获取报价详情
   */
  static async getQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const quotationModel = new QuotationModel(req.db);
      const quotation = await quotationModel.findById(id);

      if (!quotation) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QUOTATION_NOT_FOUND',
            message: '报价不存在'
          }
        });
        return;
      }

      // 权限检查：供应商只能查看自己创建的报价，买方可以查看所有报价
      if (userRole === 'supplier' && quotation.createdBy !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只能查看自己创建的报价'
          }
        });
        return;
      }

      const response: QuotationResponse = {
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Get quotation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取报价失败'
        }
      });
    }
  }

  /**
   * 根据询单ID获取报价
   */
  static async getQuotationByInquiry(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { inquiryId } = req.params;

      const quotationModel = new QuotationModel(req.db);
      const quotation = await quotationModel.findByInquiryId(inquiryId);

      if (!quotation) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QUOTATION_NOT_FOUND',
            message: '该询单暂无报价'
          }
        });
        return;
      }

      const response: QuotationResponse = {
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Get quotation by inquiry error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取报价失败'
        }
      });
    }
  }

  /**
   * 获取用户的所有报价
   */
  static async getUserQuotations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 只有供应商可以查看自己的报价列表
      if (userRole !== 'supplier') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只有供应商用户可以查看报价列表'
          }
        });
        return;
      }

      const quotationModel = new QuotationModel(req.db);
      const quotations = await quotationModel.findByCreatedBy(userId);

      const response: QuotationResponse[] = quotations.map(quotation => ({
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      }));

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Get user quotations error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取报价列表失败'
        }
      });
    }
  }

  /**
   * 更新报价
   */
  static async updateQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body as UpdateQuotationRequest;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 验证用户角色
      if (userRole !== 'supplier') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只有供应商用户可以修改报价'
          }
        });
        return;
      }

      const quotationModel = new QuotationModel(req.db);
      const quotation = await quotationModel.update(id, updateData, userId);

      const response: QuotationResponse = {
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Update quotation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '更新报价失败'
        }
      });
    }
  }

  /**
   * 作废报价
   */
  static async cancelQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // 验证用户角色
      if (userRole !== 'supplier') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只有供应商用户可以作废报价'
          }
        });
        return;
      }

      const quotationModel = new QuotationModel(req.db);
      const quotation = await quotationModel.cancel(id, userId);

      const response: QuotationResponse = {
        id: quotation.id,
        inquiryId: quotation.inquiryId,
        unitPrice: quotation.unitPrice,
        totalPrice: quotation.totalPrice,
        deliveryTime: quotation.deliveryTime,
        remarks: quotation.remarks,
        status: quotation.status,
        createdBy: quotation.createdBy,
        createdAt: quotation.createdAt.toISOString(),
        updatedAt: quotation.updatedAt.toISOString()
      };

      res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Cancel quotation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : '作废报价失败'
        }
      });
    }
  }

  /**
   * 删除报价（仅管理员）
   */
  static async deleteQuotation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userRole = req.user!.role;

      // 验证用户角色
      if (userRole !== 'admin') {
        res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: '只有管理员可以删除报价'
          }
        });
        return;
      }

      const quotationModel = new QuotationModel(req.db);
      const deleted = await quotationModel.delete(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QUOTATION_NOT_FOUND',
            message: '报价不存在'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: '报价删除成功'
      });
    } catch (error) {
      console.error('Delete quotation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '删除报价失败'
        }
      });
    }
  }
}