import express from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Change own password
router.patch('/change-password', changePassword);

// Admin only routes
router.get('/', authorize(UserRole.ADMIN), getAllUsers);
router.post('/', authorize(UserRole.ADMIN), createUser);
router.get('/:id', authorize(UserRole.ADMIN), getUserById);
router.patch('/:id', authorize(UserRole.ADMIN), updateUser);
router.delete('/:id', authorize(UserRole.ADMIN), deleteUser);

export default router;
