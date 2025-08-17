import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// 所有订单路由都需要认证
router.use(requireAuth);

// 获取所有订单（支持分页和筛选）
router.get('/', OrderController.getAllOrders);

// 获取订单详情
router.get('/:id', OrderController.getOrderById);

// 创建订单（只有买方可以创建）
router.post('/', requireRole(['buyer']), OrderController.createOrder);

// 更新订单信息
router.put('/:id', OrderController.updateOrder);

// 更新订单状态
router.patch('/:id/status', OrderController.updateOrderStatus);

// 作废订单
router.patch('/:id/cancel', OrderController.cancelOrder);

// 删除订单（只有管理员可以删除）
router.delete('/:id', requireRole(['admin']), OrderController.deleteOrder);

export default router;