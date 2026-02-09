import {
  OrderRepository,
  OrderRow,
  OrderListRow,
} from '../repositories/OrderRepository.js';
import { InquiryRepository } from '../repositories/InquiryRepository.js';
import { QuotationRepository } from '../repositories/QuotationRepository.js';
import {
  FileAttachmentRepository,
  FileAttachmentWithUploader,
} from '../repositories/FileAttachmentRepository.js';
import { AppError } from '../shared/errors.js';
import { JwtPayload } from '../shared/types.js';
import { logger } from '../utils/logger.js';

function toOrderResponse(row: OrderRow) {
  return {
    id: row.id,
    orderNumber: row.order_number,
    inquiryId: row.inquiry_id,
    productName: row.product_name,
    materialType: row.material_type,
    specifications: row.specifications,
    specialRequirements: row.special_requirements,
    unitPrice: parseFloat(row.unit_price),
    quantity: row.quantity,
    totalPrice: parseFloat(row.total_price),
    status: row.status,
    createdBy: row.created_by,
    confirmedBy: row.confirmed_by,
    rejectReason: row.reject_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAttachmentResponse(row: FileAttachmentWithUploader) {
  return {
    id: row.id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    uploadedBy: {
      id: row.uploaded_by,
      username: row.uploader_username,
    },
    createdAt: row.created_at,
  };
}

function toOrderListResponse(row: OrderListRow) {
  return {
    ...toOrderResponse(row),
    createdBy: {
      id: row.created_by,
      username: row.creator_username,
    },
    confirmedBy: row.confirmed_by
      ? {
          id: row.confirmed_by,
          username: row.confirmer_username!,
        }
      : null,
  };
}

export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private inquiryRepo: InquiryRepository,
    private quotationRepo: QuotationRepository,
    private fileRepo?: FileAttachmentRepository
  ) {}

  async list(params: {
    page: number;
    pageSize: number;
    search: string;
    sort: string;
    order: string;
    status?: string;
  }) {
    const { items, total } = await this.orderRepo.findAll(params);
    return {
      items: items.map(toOrderListResponse),
      total,
    };
  }

  async getById(id: string) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw AppError.notFound('订单不存在');

    const response = toOrderResponse(order);

    // Add related inquiry info if exists
    let relatedInquiry = null;
    if (order.inquiry_id) {
      const inquiry = await this.inquiryRepo.findById(order.inquiry_id);
      if (inquiry) {
        relatedInquiry = {
          id: inquiry.id,
          inquiryNumber: inquiry.inquiry_number,
        };
      }
    }

    // Fetch attachments if repo is available
    let attachments: FileAttachmentWithUploader[] = [];
    if (this.fileRepo) {
      attachments = await this.fileRepo.findByRelated('order', id);
    }

    return {
      ...response,
      relatedInquiry,
      attachments: attachments.map(toAttachmentResponse),
    };
  }

  async createFromInquiry(inquiryId: string, user: JwtPayload) {
    const inquiry = await this.inquiryRepo.findById(inquiryId);
    if (!inquiry) throw AppError.notFound('询单不存在');

    if (inquiry.status !== 'quoted') {
      throw AppError.business('只有已报价的询单可以转为订单');
    }

    // Get the latest active quotation
    const quotation =
      await this.quotationRepo.findActiveByInquiryId(inquiryId);
    if (!quotation) {
      throw AppError.business('没有有效的报价');
    }

    const orderNumber = await this.orderRepo.generateOrderNumber();

    const order = await this.orderRepo.create({
      order_number: orderNumber,
      inquiry_id: inquiryId,
      product_name: inquiry.product_name,
      material_type: inquiry.material_type,
      specifications: inquiry.specifications,
      special_requirements: inquiry.special_requirements,
      unit_price: parseFloat(quotation.unit_price),
      quantity: inquiry.quantity,
      total_price: parseFloat(quotation.total_price),
      created_by: user.userId,
    });

    // Update inquiry status to converted
    await this.inquiryRepo.update(inquiryId, { status: 'converted' });

    logger.info(
      `[AUDIT] User ${user.username} created order ${orderNumber} from inquiry ${inquiry.inquiry_number}`
    );

    return toOrderResponse(order);
  }

  async createStandalone(
    data: {
      productName: string;
      materialType: string;
      specifications: string;
      specialRequirements?: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    },
    user: JwtPayload
  ) {
    const orderNumber = await this.orderRepo.generateOrderNumber();

    const order = await this.orderRepo.create({
      order_number: orderNumber,
      product_name: data.productName,
      material_type: data.materialType,
      specifications: data.specifications,
      special_requirements: data.specialRequirements || null,
      unit_price: data.unitPrice,
      quantity: data.quantity,
      total_price: data.totalPrice,
      created_by: user.userId,
    });

    logger.info(
      `[AUDIT] User ${user.username} created standalone order ${orderNumber}`
    );

    return toOrderResponse(order);
  }

  async performAction(
    id: string,
    action: string,
    user: JwtPayload,
    reason?: string
  ) {
    const order = await this.orderRepo.findById(id);
    if (!order) throw AppError.notFound('订单不存在');

    const updateData: Partial<{
      status: string;
      confirmed_by: string;
      reject_reason: string;
    }> = {};

    switch (action) {
      case 'cancel':
        if (order.created_by !== user.userId) {
          throw AppError.forbidden('只有创建者可以取消订单');
        }
        if (order.status !== 'pending') {
          throw AppError.business('只有待确认的订单可以取消');
        }
        updateData.status = 'cancelled';
        break;

      case 'reject':
        if (user.role !== 'supplier') {
          throw AppError.forbidden('只有供应商可以拒绝订单');
        }
        if (order.status !== 'pending') {
          throw AppError.business('只有待确认的订单可以拒绝');
        }
        updateData.status = 'rejected';
        updateData.reject_reason = reason || '';
        break;

      case 'confirm':
        if (user.role !== 'supplier') {
          throw AppError.forbidden('只有供应商可以确认订单');
        }
        if (order.status !== 'pending') {
          throw AppError.business('只有待确认的订单可以确认');
        }
        updateData.status = 'confirmed';
        updateData.confirmed_by = user.userId;
        break;

      case 'start_production':
        if (user.role !== 'supplier') {
          throw AppError.forbidden('只有供应商可以开始生产');
        }
        if (order.status !== 'confirmed') {
          throw AppError.business('只有已确认的订单可以开始生产');
        }
        updateData.status = 'production';
        break;

      case 'ship':
        if (user.role !== 'supplier') {
          throw AppError.forbidden('只有供应商可以发货');
        }
        if (order.status !== 'production') {
          throw AppError.business('只有生产中的订单可以发货');
        }
        updateData.status = 'shipped';
        break;

      case 'complete':
        if (order.created_by !== user.userId) {
          throw AppError.forbidden('只有创建者可以确认收货');
        }
        if (order.status !== 'shipped') {
          throw AppError.business('只有已发货的订单可以确认收货');
        }
        updateData.status = 'completed';
        break;

      default:
        throw AppError.validation(`不支持的操作: ${action}`);
    }

    const updated = await this.orderRepo.update(id, updateData);
    if (!updated) throw AppError.internal('状态更新失败');

    logger.info(
      `[AUDIT] User ${user.username} ${action} order ${order.order_number}`
    );

    return toOrderResponse(updated);
  }
}
