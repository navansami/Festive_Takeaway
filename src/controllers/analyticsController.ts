import { Response } from 'express';
import Order from '../models/Order';
import Guest from '../models/Guest';
import { AuthRequest } from '../middleware/auth';
import { OrderStatus } from '../types';
import ExcelJS from 'exceljs';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get date 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get all orders (excluding deleted)
    const allOrders = await Order.find({ isDeleted: false }).populate('items.menuItem');

    // Get today's orders
    const todayOrders = await Order.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      isDeleted: false
    });

    // Get last 30 days orders
    const last30DaysOrders = await Order.find({
      createdAt: { $gte: thirtyDaysAgo },
      isDeleted: false
    }).sort({ createdAt: 1 });

    // Get upcoming collections (next 7 days)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(now.getDate() + 7);
    const upcomingCollections = await Order.find({
      collectionDate: { $gte: todayStart, $lte: sevenDaysFromNow },
      status: { $in: [OrderStatus.CONFIRMED, OrderStatus.PENDING] },
      isDeleted: false
    }).sort({ collectionDate: 1, collectionTime: 1 }).limit(10);

    // Calculate total statistics
    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalPaid = allOrders.reduce((sum, o) => sum + o.totalPaid, 0);
    const totalOrders = allOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Today's statistics
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const todayOrdersCount = todayOrders.length;

    // Status counts
    const statusCounts: any = {};
    Object.values(OrderStatus).forEach(status => {
      statusCounts[status] = allOrders.filter(o => o.status === status).length;
    });

    // Revenue trend (last 30 days, grouped by day)
    const revenueTrend: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = last30DaysOrders.filter(o => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr;
      });

      revenueTrend.push({
        date: dateStr,
        revenue: dayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        orders: dayOrders.length
      });
    }

    // Top selling items
    const itemSummary: any = {};
    allOrders.forEach(order => {
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

    const topItems = Object.values(itemSummary)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 10);

    // Get total guests count
    const totalGuests = await Guest.countDocuments({ isDeleted: false });

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalPaid,
        totalOrders,
        averageOrderValue,
        todayRevenue,
        todayOrdersCount,
        totalGuests,
        statusCounts,
        revenueTrend,
        topItems,
        upcomingCollections: upcomingCollections.map(o => ({
          _id: o._id,
          orderNumber: o.orderNumber,
          guestName: o.guestDetails.name,
          collectionDate: o.collectionDate,
          collectionTime: o.collectionTime,
          totalAmount: o.totalAmount,
          status: o.status
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching dashboard stats' });
  }
};

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
