import { Router } from 'express';
import { QuotationController } from '../controllers/QuotationController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// 所有报价路由都需要认证
router.use(authenticateToken);

/**
 * @route POST /api/quotations
 * @desc 创建报价（供应商回复询单）
 * @access 供应商用户
 */
router.post('/', requireRole(['supplier']), QuotationController.createQuotation);

/**
 * @route GET /api/quotations/user
 * @desc 获取当前用户的所有报价
 * @access 供应商用户
 */
router.get('/user', requireRole(['supplier']), QuotationController.getUserQuotations);

/**
 * @route GET /api/quotations/inquiry/:inquiryId
 * @desc 根据询单ID获取报价
 * @access 认证用户
 */
router.get('/inquiry/:inquiryId', QuotationController.getQuotationByInquiry);

/**
 * @route GET /api/quotations/:id
 * @desc 获取报价详情
 * @access 认证用户
 */
router.get('/:id', QuotationController.getQuotation);

/**
 * @route PUT /api/quotations/:id
 * @desc 更新报价
 * @access 供应商用户（仅自己创建的报价）
 */
router.put('/:id', requireRole(['supplier']), QuotationController.updateQuotation);

/**
 * @route POST /api/quotations/:id/cancel
 * @desc 作废报价
 * @access 供应商用户（仅自己创建的报价）
 */
router.post('/:id/cancel', requireRole(['supplier']), QuotationController.cancelQuotation);

/**
 * @route DELETE /api/quotations/:id
 * @desc 删除报价
 * @access 管理员
 */
router.delete('/:id', requireRole(['admin']), QuotationController.deleteQuotation);

export default router;