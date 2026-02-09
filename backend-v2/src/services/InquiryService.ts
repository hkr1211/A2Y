import {
  InquiryRepository,
  InquiryRow,
  InquiryListRow,
} from '../repositories/InquiryRepository.js';
import {
  QuotationRepository,
  QuotationWithCreator,
} from '../repositories/QuotationRepository.js';
import {
  FileAttachmentRepository,
  FileAttachmentWithUploader,
} from '../repositories/FileAttachmentRepository.js';
import { AppError } from '../shared/errors.js';
import { JwtPayload } from '../shared/types.js';
import { logger } from '../utils/logger.js';

function toInquiryResponse(row: InquiryRow) {
  return {
    id: row.id,
    inquiryNumber: row.inquiry_number,
    productName: row.product_name,
    materialType: row.material_type,
    specifications: row.specifications,
    specialRequirements: row.special_requirements,
    quantity: row.quantity,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInquiryListResponse(row: InquiryListRow) {
  return {
    ...toInquiryResponse(row),
    createdBy: {
      id: row.created_by,
      username: row.creator_username,
    },
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

function toQuotationResponse(row: QuotationWithCreator) {
  return {
    id: row.id,
    version: row.version,
    unitPrice: parseFloat(row.unit_price),
    totalPrice: parseFloat(row.total_price),
    deliveryDays: row.delivery_days,
    remarks: row.remarks,
    isWithdrawn: row.is_withdrawn,
    createdBy: {
      id: row.created_by,
      username: row.creator_username,
    },
    createdAt: row.created_at,
  };
}

export class InquiryService {
  constructor(
    private inquiryRepo: InquiryRepository,
    private quotationRepo?: QuotationRepository,
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
    const { items, total } = await this.inquiryRepo.findAll(params);
    return {
      items: items.map(toInquiryListResponse),
      total,
    };
  }

  async getById(id: string) {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw AppError.notFound('询单不存在');

    // Fetch quotations if repo is available
    let quotations: QuotationWithCreator[] = [];
    if (this.quotationRepo) {
      quotations = await this.quotationRepo.findByInquiryId(id);
    }

    // Fetch attachments if repo is available
    let attachments: FileAttachmentWithUploader[] = [];
    if (this.fileRepo) {
      attachments = await this.fileRepo.findByRelated('inquiry', id);
    }

    return {
      ...toInquiryResponse(inquiry),
      createdBy: inquiry.created_by,
      attachments: attachments.map(toAttachmentResponse),
      quotations: quotations.map(toQuotationResponse),
    };
  }

  async create(
    data: {
      productName: string;
      materialType: string;
      specifications: string;
      specialRequirements?: string;
      quantity: number;
    },
    user: JwtPayload
  ) {
    const inquiryNumber = await this.inquiryRepo.generateInquiryNumber();

    const inquiry = await this.inquiryRepo.create({
      inquiry_number: inquiryNumber,
      product_name: data.productName,
      material_type: data.materialType,
      specifications: data.specifications,
      special_requirements: data.specialRequirements || null,
      quantity: data.quantity,
      created_by: user.userId,
    });

    logger.info(
      `[AUDIT] User ${user.username} created inquiry ${inquiryNumber}`
    );

    return toInquiryResponse(inquiry);
  }

  async update(
    id: string,
    data: Partial<{
      productName: string;
      materialType: string;
      specifications: string;
      specialRequirements: string | null;
      quantity: number;
    }>,
    user: JwtPayload
  ) {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw AppError.notFound('询单不存在');

    // Only creator can modify
    if (inquiry.created_by !== user.userId) {
      throw AppError.forbidden('只能修改自己创建的询单');
    }

    // Only draft or published (without quotations) can be modified
    if (!['draft', 'published'].includes(inquiry.status)) {
      throw AppError.business('询单当前状态不允许修改');
    }

    // If published, check if there are active quotations
    if (inquiry.status === 'published' && this.quotationRepo) {
      const hasQuotations =
        await this.quotationRepo.hasActiveQuotations(id);
      if (hasQuotations) {
        throw AppError.business('已有报价的询单不允许修改');
      }
    }

    const updateData: Record<string, unknown> = {};
    if (data.productName !== undefined)
      updateData.product_name = data.productName;
    if (data.materialType !== undefined)
      updateData.material_type = data.materialType;
    if (data.specifications !== undefined)
      updateData.specifications = data.specifications;
    if (data.specialRequirements !== undefined)
      updateData.special_requirements = data.specialRequirements;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;

    const updated = await this.inquiryRepo.update(id, updateData);
    if (!updated) throw AppError.internal('更新失败');

    logger.info(
      `[AUDIT] User ${user.username} updated inquiry ${inquiry.inquiry_number}`
    );

    return toInquiryResponse(updated);
  }

  async performAction(
    id: string,
    action: string,
    user: JwtPayload
  ) {
    const inquiry = await this.inquiryRepo.findById(id);
    if (!inquiry) throw AppError.notFound('询单不存在');

    // Only creator can perform actions
    if (inquiry.created_by !== user.userId) {
      throw AppError.forbidden('只能操作自己创建的询单');
    }

    let newStatus: string;

    switch (action) {
      case 'publish':
        if (inquiry.status !== 'draft') {
          throw AppError.business('只有草稿状态的询单可以发布');
        }
        newStatus = 'published';
        break;

      case 'cancel':
        if (inquiry.status !== 'published') {
          throw AppError.business('只有已发布状态的询单可以作废');
        }
        // Check if there are active quotations
        if (this.quotationRepo) {
          const hasQuotations =
            await this.quotationRepo.hasActiveQuotations(id);
          if (hasQuotations) {
            throw AppError.business('已有报价的询单不能作废');
          }
        }
        newStatus = 'cancelled';
        break;

      default:
        throw AppError.validation(`不支持的操作: ${action}`);
    }

    const updated = await this.inquiryRepo.update(id, {
      status: newStatus,
    });
    if (!updated) throw AppError.internal('状态更新失败');

    logger.info(
      `[AUDIT] User ${user.username} ${action} inquiry ${inquiry.inquiry_number}`
    );

    return toInquiryResponse(updated);
  }
}
