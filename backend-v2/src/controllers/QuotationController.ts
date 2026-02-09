import { Response } from 'express';
import { QuotationService } from '../services/QuotationService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created } from '../shared/response.js';

export class QuotationController {
  constructor(private quotationService: QuotationService) {}

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const quotation = await this.quotationService.create(
      req.body,
      req.user!
    );
    res.status(201).json(created(quotation));
  };

  withdraw = async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await this.quotationService.withdraw(
      req.params.inquiryId,
      req.user!
    );
    res.json(ok(result));
  };
}
