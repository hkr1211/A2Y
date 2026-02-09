import {
  QuotationRepository,
  QuotationRow,
} from '../repositories/QuotationRepository.js';
import {
  InquiryRepository,
} from '../repositories/InquiryRepository.js';
import { AppError } from '../shared/errors.js';
import { JwtPayload } from '../shared/types.js';
import { logger } from '../utils/logger.js';

function toQuotationResponse(row: QuotationRow) {
  return {
    id: row.id,
    inquiryId: row.inquiry_id,
    version: row.version,
    unitPrice: parseFloat(row.unit_price),
    totalPrice: parseFloat(row.total_price),
    deliveryDays: row.delivery_days,
    remarks: row.remarks,
    isWithdrawn: row.is_withdrawn,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export class QuotationService {
  constructor(
    private quotationRepo: QuotationRepository,
    private inquiryRepo: InquiryRepository
  ) {}

  async create(
    data: {
      inquiryId: string;
      unitPrice: number;
      totalPrice: number;
      deliveryDays: number;
      remarks?: string;
    },
    user: JwtPayload
  ) {
    // Verify inquiry exists and status allows quoting
    const inquiry = await this.inquiryRepo.findById(data.inquiryId);
    if (!inquiry) throw AppError.notFound('询单不存在');

    if (!['published', 'quoted'].includes(inquiry.status)) {
      throw AppError.business('询单当前状态不允许报价');
    }

    // Get next version number
    const version = await this.quotationRepo.getNextVersion(data.inquiryId);

    // Create quotation
    const quotation = await this.quotationRepo.create({
      inquiry_id: data.inquiryId,
      version,
      unit_price: data.unitPrice,
      total_price: data.totalPrice,
      delivery_days: data.deliveryDays,
      remarks: data.remarks || null,
      created_by: user.userId,
    });

    // Update inquiry status to quoted if it was published
    if (inquiry.status === 'published') {
      await this.inquiryRepo.update(inquiry.id, { status: 'quoted' });
    }

    logger.info(
      `[AUDIT] User ${user.username} created quotation v${version} for inquiry ${inquiry.inquiry_number}`
    );

    return toQuotationResponse(quotation);
  }

  async withdraw(inquiryId: string, user: JwtPayload) {
    // Verify inquiry exists
    const inquiry = await this.inquiryRepo.findById(inquiryId);
    if (!inquiry) throw AppError.notFound('询单不存在');

    // Cannot withdraw if inquiry is converted to order
    if (inquiry.status === 'converted') {
      throw AppError.business('询单已转为订单，不能撤回报价');
    }

    if (inquiry.status === 'cancelled') {
      throw AppError.business('询单已取消，不能撤回报价');
    }

    // Withdraw all quotations by this supplier for this inquiry
    const count = await this.quotationRepo.withdrawByInquiryId(
      inquiryId,
      user.userId
    );

    if (count === 0) {
      throw AppError.business('没有可撤回的报价');
    }

    // Check if any active quotations remain
    const hasActive =
      await this.quotationRepo.hasActiveQuotations(inquiryId);

    // If no active quotations remain, revert inquiry status to published
    if (!hasActive && inquiry.status === 'quoted') {
      await this.inquiryRepo.update(inquiryId, { status: 'published' });
    }

    logger.info(
      `[AUDIT] User ${user.username} withdrew ${count} quotation(s) for inquiry ${inquiry.inquiry_number}`
    );

    return { message: '报价已撤回' };
  }
}
