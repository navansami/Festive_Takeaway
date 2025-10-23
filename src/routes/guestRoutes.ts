import express from 'express';
import {
  getAllGuests,
  getGuestById,
  getGuestOrders,
  createGuest,
  updateGuest,
  deleteGuest,
  searchGuests
} from '../controllers/guestController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Routes accessible by all authenticated users
router.get('/', getAllGuests);
router.get('/search', searchGuests);
router.get('/:id', getGuestById);
router.get('/:id/orders', getGuestOrders);

// Routes for order-taker and admin
router.post(
  '/',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  createGuest
);
router.patch(
  '/:id',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  updateGuest
);

// Admin only routes
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  deleteGuest
);

export default router;
