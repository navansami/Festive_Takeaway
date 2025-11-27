import express from 'express';
import {
  getDashboardStats,
  getDailyAnalytics,
  getDateRangeAnalytics,
  getMonthlyCategoryBreakdown,
  exportOrdersToExcel
} from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/daily', getDailyAnalytics);
router.get('/range', getDateRangeAnalytics);
router.get('/monthly-categories', getMonthlyCategoryBreakdown);
router.get('/export', exportOrdersToExcel);

export default router;
