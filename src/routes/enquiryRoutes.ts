import express from 'express';
import {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquiry,
  convertToOrder,
  deleteEnquiry
} from '../controllers/enquiryController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// All authenticated users can create and view enquiries
router.post('/', createEnquiry);
router.get('/', getAllEnquiries);
router.get('/:id', getEnquiryById);

// Order-taker and admin can update and convert
router.patch(
  '/:id',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  updateEnquiry
);
router.post(
  '/:id/convert',
  authorize(UserRole.ORDER_TAKER, UserRole.ADMIN),
  convertToOrder
);

// Admin only can delete
router.delete(
  '/:id',
  authorize(UserRole.ADMIN),
  deleteEnquiry
);

export default router;
