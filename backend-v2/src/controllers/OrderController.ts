import { Response } from 'express';
import { OrderService } from '../services/OrderService.js';
import { AuthRequest } from '../shared/types.js';
import { ok, created, paginated } from '../shared/response.js';

export class OrderController {
  constructor(private orderService: OrderService) {}

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

    const result = await this.orderService.list({
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
    const order = await this.orderService.getById(req.params.id);
    res.json(ok(order));
  };

  create = async (req: AuthRequest, res: Response): Promise<void> => {
    let order;
    if (req.body.inquiryId) {
      order = await this.orderService.createFromInquiry(
        req.body.inquiryId,
        req.user!
      );
    } else {
      order = await this.orderService.createStandalone(req.body, req.user!);
    }
    res.status(201).json(created(order));
  };

  action = async (req: AuthRequest, res: Response): Promise<void> => {
    const order = await this.orderService.performAction(
      req.params.id,
      req.body.action,
      req.user!,
      req.body.reason
    );
    res.json(ok(order));
  };
}
