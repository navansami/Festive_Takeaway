import express from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  addPayment,
  updateOrderItem,
  deleteOrder,
  getOrderChangeLogs,
  searchGuests
} from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', getAllOrders);
router.get('/search/guests', searchGuests);
router.get('/:id', getOrderById);
router.get('/:id/change-logs', getOrderChangeLogs);

// Routes for order-taker and admin
router.post(
  '/',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  createOrder
);
router.patch(
  '/:id',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  updateOrder
);
router.patch(
  '/:id/status',
  authenticate,
  updateOrderStatus
);
router.post(
  '/:id/payments',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  addPayment
);
router.patch(
  '/:id/items/:itemId',
  authenticate,
  updateOrderItem
);

// Admin only routes
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  deleteOrder
);

export default router;
