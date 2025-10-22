import express from 'express';
import {
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} from '../controllers/menuItemController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// Public routes (accessible to all authenticated users)
router.get('/', authenticate, getAllMenuItems);
router.get('/:id', authenticate, getMenuItemById);

// Admin only routes
router.post('/', authenticate, authorize(UserRole.ADMIN), createMenuItem);
router.patch('/:id', authenticate, authorize(UserRole.ADMIN), updateMenuItem);
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), deleteMenuItem);

export default router;
