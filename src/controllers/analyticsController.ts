import { Response } from 'express';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { OrderStatus } from '../types';
import ExcelJS from 'exceljs';

export const getDailyAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    const startDate = new Date(targetDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      collectionDate: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }).populate('items.menuItem');

    // Calculate analytics
    const itemSummary: any = {};
    let totalRevenue = 0;
    let totalOrders = orders.length;
    const statusCounts: any = {};

    orders.forEach(order => {
      // Revenue
      totalRevenue += order.totalPaid;

      // Status counts
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

      // Item summary
      order.items.forEach(item => {
        const key = `${item.name} - ${item.servingSize}`;
        if (!itemSummary[key]) {
          itemSummary[key] = {
            name: item.name,
            servingSize: item.servingSize,
            quantity: 0,
            totalRevenue: 0
          };
        }
        itemSummary[key].quantity += item.quantity;
        itemSummary[key].totalRevenue += item.totalPrice;
      });
    });

    res.json({
      success: true,
      date: targetDate,
      analytics: {
        totalOrders,
        totalRevenue,
        statusCounts,
        itemSummary: Object.values(itemSummary),
        confirmedOrders: statusCounts[OrderStatus.CONFIRMED] || 0,
        pendingOrders: statusCounts[OrderStatus.PENDING] || 0,
        collectedOrders: statusCounts[OrderStatus.COLLECTED] || 0
      },
      orders
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching analytics' });
  }
};

export const getDateRangeAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ message: 'Please provide startDate and endDate' });
      return;
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      collectionDate: { $gte: start, $lte: end },
      isDeleted: false
    }).populate('items.menuItem');

    // Calculate analytics
    const itemSummary: any = {};
    let totalRevenue = 0;
    let totalOrders = orders.length;
    const statusCounts: any = {};
    const dailyBreakdown: any = {};

    orders.forEach(order => {
      // Revenue
      totalRevenue += order.totalPaid;

      // Status counts
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

      // Daily breakdown
      const dateKey = order.collectionDate.toISOString().split('T')[0];
      if (!dailyBreakdown[dateKey]) {
        dailyBreakdown[dateKey] = {
          date: dateKey,
          orders: 0,
          revenue: 0
        };
      }
      dailyBreakdown[dateKey].orders += 1;
      dailyBreakdown[dateKey].revenue += order.totalPaid;

      // Item summary
      order.items.forEach(item => {
        const key = `${item.name} - ${item.servingSize}`;
        if (!itemSummary[key]) {
          itemSummary[key] = {
            name: item.name,
            servingSize: item.servingSize,
            quantity: 0,
            totalRevenue: 0
          };
        }
        itemSummary[key].quantity += item.quantity;
        itemSummary[key].totalRevenue += item.totalPrice;
      });
    });

    res.json({
      success: true,
      dateRange: { startDate: start, endDate: end },
      analytics: {
        totalOrders,
        totalRevenue,
        statusCounts,
        itemSummary: Object.values(itemSummary),
        dailyBreakdown: Object.values(dailyBreakdown)
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching analytics' });
  }
};

export const exportOrdersToExcel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, date } = req.query;

    let query: any = { isDeleted: false };

    if (date) {
      const targetDate = new Date(date as string);
      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);
      query.collectionDate = { $gte: start, $lte: end };
    } else if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      query.collectionDate = { $gte: start, $lte: end };
    }

    const orders = await Order.find(query)
      .populate('items.menuItem')
      .populate('createdBy', 'name')
      .sort({ collectionDate: 1, collectionTime: 1 });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    // Define columns
    worksheet.columns = [
      { header: 'Order Number', key: 'orderNumber', width: 15 },
      { header: 'Guest Name', key: 'guestName', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Collection Date', key: 'collectionDate', width: 15 },
      { header: 'Collection Time', key: 'collectionTime', width: 15 },
      { header: 'Collection Person', key: 'collectionPerson', width: 20 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Total Amount (AED)', key: 'totalAmount', width: 18 },
      { header: 'Total Paid (AED)', key: 'totalPaid', width: 18 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Order Status', key: 'status', width: 15 },
      { header: 'Created By', key: 'createdBy', width: 20 }
    ];

    // Add header style
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data
    orders.forEach(order => {
      const itemsList = order.items
        .map(item => `${item.name} (${item.servingSize}) x ${item.quantity}`)
        .join(', ');

      worksheet.addRow({
        orderNumber: order.orderNumber,
        guestName: order.guestDetails.name,
        email: order.guestDetails.email,
        phone: order.guestDetails.phone,
        collectionDate: new Date(order.collectionDate).toLocaleDateString(),
        collectionTime: order.collectionTime,
        collectionPerson: order.collectionPerson.name,
        items: itemsList,
        totalAmount: order.totalAmount,
        totalPaid: order.totalPaid,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        status: order.status,
        createdBy: (order.createdBy as any)?.name || 'Unknown'
      });
    });

    // Set response headers
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=orders-${Date.now()}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error exporting orders' });
  }
};
