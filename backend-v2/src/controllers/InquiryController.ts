import { Response } from 'express';
import { InquiryService } from '../services/InquiryService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created, paginated } from '../shared/response.js';

export class InquiryController {
  constructor(private inquiryService: InquiryService) {}

  list = async (req: AuthRequest, res: Response): Promise<void> => {
    const { page, pageSize, search, sort, order, status } =
      req.query as unknown as {
        page: number;
        pageSize: number;
        search: string;
        sort: string;
        order: string;
        status?: string;
      };

    const result = await this.inquiryService.list({
      page,
      pageSize,
      search,
      sort,
      order,
      status,
    });

    res.json(paginated(result.items, result.total, page, pageSize));
  };

  getById = async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await this.inquiryService.getById(req.params.id);
    res.json(ok(inquiry));
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await this.inquiryService.create(req.body, req.user!);
    res.status(201).json(created(inquiry));
  };

  update = async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await this.inquiryService.update(
      req.params.id,
      req.body,
      req.user!
    );
    res.json(ok(inquiry));
  };

  action = async (req: AuthRequest, res: Response): Promise<void> => {
    const inquiry = await this.inquiryService.performAction(
      req.params.id,
      req.body.action,
      req.user!
    );
    res.json(ok(inquiry));
  };
}
