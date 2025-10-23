import { Response } from 'express';
import mongoose from 'mongoose';
import Order, { IOrderItem, IPaymentRecord } from '../models/Order';
import Guest from '../models/Guest';
import ChangeLog from '../models/ChangeLog';
import { AuthRequest } from '../middleware/auth';
import { OrderStatus, PaymentStatus, ItemStatus, PaymentMethod } from '../types';
import { ChangeType, EntityType } from '../models/ChangeLog';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { guestId, guestDetails, items, collectionDate, collectionTime, paymentMethod } = req.body;

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: IOrderItem) => {
      item.totalPrice = item.price * item.quantity;
      return sum + item.totalPrice;
    }, 0);

    let finalGuestDetails = guestDetails;
    let guestRef = guestId;

    // If guestId is provided, fetch guest details from Guest profile
    if (guestId) {
      const guest = await Guest.findById(guestId);
      if (!guest || guest.isDeleted) {
        res.status(404).json({ message: 'Guest profile not found' });
        return;
      }
      finalGuestDetails = {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        address: guest.address
      };
    } else if (guestDetails && guestDetails.email) {
      // No guestId provided, but we have guest details - check if guest exists or create new
      let guest = await Guest.findOne({
        email: guestDetails.email.toLowerCase(),
        isDeleted: false
      });

      if (!guest) {
        // Create new guest profile
        guest = new Guest({
          name: guestDetails.name,
          email: guestDetails.email,
          phone: guestDetails.phone,
          address: guestDetails.address,
          createdBy: new mongoose.Types.ObjectId(req.user?.userId),
          lastModifiedBy: new mongoose.Types.ObjectId(req.user?.userId)
        });
        await guest.save();

        // Log guest creation
        await ChangeLog.create({
          entityType: EntityType.ORDER,
          entityId: guest._id,
          changeType: ChangeType.CREATE,
          changedBy: new mongoose.Types.ObjectId(req.user?.userId),
          changes: [],
          description: 'Guest profile auto-created from order'
        });
      }

      // Use the guest profile (existing or newly created)
      guestRef = guest._id;
      finalGuestDetails = {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        address: guest.address
      };
    }

    // Set collection person to guest by default
    const collectionPerson = {
      name: finalGuestDetails.name,
      email: finalGuestDetails.email,
      phone: finalGuestDetails.phone
    };

    const order = new Order({
      guest: guestRef,
      guestDetails: finalGuestDetails,
      collectionPerson,
      items,
      totalAmount,
      collectionDate,
      collectionTime,
      paymentMethod,
      createdBy: new mongoose.Types.ObjectId(req.user?.userId),
      lastModifiedBy: new mongoose.Types.ObjectId(req.user?.userId),
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          changedBy: new mongoose.Types.ObjectId(req.user?.userId),
          changedAt: new Date(),
          notes: 'Order created'
        }
      ]
    });

    await order.save();

    // Log the creation
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: order._id,
      changeType: ChangeType.CREATE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [],
      description: 'Order created'
    });

    await order.populate('items.menuItem');
    await order.populate('guest');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating order' });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, date, includeDeleted } = req.query;

    const query: any = {};

    // Don't show deleted orders unless specifically requested by admin
    if (includeDeleted !== 'true' || req.user?.role !== 'admin') {
      query.isDeleted = false;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date as string);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.collectionDate = { $gte: startDate, $lt: endDate };
    }

    const orders = await Order.find(query)
      .populate('guest', 'name email phone address')
      .populate('items.menuItem')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .sort({ collectionDate: 1, collectionTime: 1 });

    res.json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching orders' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('guest', 'name email phone address totalOrders totalSpent')
      .populate('items.menuItem')
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('statusHistory.changedBy', 'name email');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Don't show deleted orders to non-admin users
    if (order.isDeleted && req.user?.role !== 'admin') {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching order' });
  }
};

export const updateOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.isDeleted) {
      res.status(400).json({ message: 'Cannot update a deleted order' });
      return;
    }

    const changes: any[] = [];
    const {
      guestId,
      guestDetails,
      collectionPerson,
      items,
      collectionDate,
      collectionTime,
      paymentMethod
    } = req.body;

    // Handle guest profile update
    if (guestId !== undefined) {
      if (guestId && guestId !== order.guest?.toString()) {
        const guest = await Guest.findById(guestId);
        if (!guest || guest.isDeleted) {
          res.status(404).json({ message: 'Guest profile not found' });
          return;
        }
        changes.push({
          field: 'guest',
          oldValue: order.guest,
          newValue: guestId
        });
        order.guest = guestId;
        order.guestDetails = {
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          address: guest.address
        };
      }
    } else if (guestDetails && guestDetails.email) {
      // No guestId provided, but we have guest details - check if guest exists or create new
      let guest = await Guest.findOne({
        email: guestDetails.email.toLowerCase(),
        isDeleted: false
      });

      if (!guest) {
        // Create new guest profile
        guest = new Guest({
          name: guestDetails.name,
          email: guestDetails.email,
          phone: guestDetails.phone,
          address: guestDetails.address,
          createdBy: new mongoose.Types.ObjectId(req.user?.userId),
          lastModifiedBy: new mongoose.Types.ObjectId(req.user?.userId)
        });
        await guest.save();

        // Log guest creation
        await ChangeLog.create({
          entityType: EntityType.ORDER,
          entityId: guest._id,
          changeType: ChangeType.CREATE,
          changedBy: new mongoose.Types.ObjectId(req.user?.userId),
          changes: [],
          description: 'Guest profile auto-created from order update'
        });
      }

      // Use the guest profile (existing or newly created)
      changes.push({
        field: 'guest',
        oldValue: order.guest,
        newValue: guest._id
      });
      order.guest = guest._id as mongoose.Types.ObjectId;
      order.guestDetails = {
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        address: guest.address
      };
    }

    if (collectionPerson) {
      changes.push({
        field: 'collectionPerson',
        oldValue: order.collectionPerson,
        newValue: collectionPerson
      });
      order.collectionPerson = collectionPerson;
    }

    if (items) {
      changes.push({
        field: 'items',
        oldValue: order.items.length + ' items',
        newValue: items.length + ' items'
      });

      // Recalculate total
      const totalAmount = items.reduce((sum: number, item: IOrderItem) => {
        item.totalPrice = item.price * item.quantity;
        return sum + item.totalPrice;
      }, 0);

      order.items = items;
      order.totalAmount = totalAmount;
    }

    if (collectionDate) {
      changes.push({
        field: 'collectionDate',
        oldValue: order.collectionDate,
        newValue: collectionDate
      });
      order.collectionDate = collectionDate;
    }

    if (collectionTime) {
      changes.push({
        field: 'collectionTime',
        oldValue: order.collectionTime,
        newValue: collectionTime
      });
      order.collectionTime = collectionTime;
    }

    if (paymentMethod) {
      changes.push({
        field: 'paymentMethod',
        oldValue: order.paymentMethod,
        newValue: paymentMethod
      });
      order.paymentMethod = paymentMethod;
    }

    order.lastModifiedBy = req.user?.userId as any;
    await order.save();

    // Log changes
    if (changes.length > 0) {
      await ChangeLog.create({
        entityType: EntityType.ORDER,
        entityId: order._id,
        changeType: ChangeType.UPDATE,
        changedBy: new mongoose.Types.ObjectId(req.user?.userId),
        changes,
        description: 'Order updated'
      });
    }

    await order.populate('items.menuItem');
    await order.populate('guest');

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating order' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;

    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.isDeleted) {
      res.status(400).json({ message: 'Cannot update status of a deleted order' });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    order.lastModifiedBy = req.user?.userId as any;

    // Add to status history
    order.statusHistory.push({
      status,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changedAt: new Date(),
      notes
    });

    await order.save();

    // Log the status change
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: order._id,
      changeType: ChangeType.STATUS_CHANGE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [
        {
          field: 'status',
          oldValue: oldStatus,
          newValue: status
        }
      ],
      description: notes || `Status changed from ${oldStatus} to ${status}`
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating order status' });
  }
};

export const addPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, method, notes } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ message: 'Invalid payment amount' });
      return;
    }

    if (!Object.values(PaymentMethod).includes(method)) {
      res.status(400).json({ message: 'Invalid payment method' });
      return;
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.isDeleted) {
      res.status(400).json({ message: 'Cannot add payment to a deleted order' });
      return;
    }

    const paymentRecord: IPaymentRecord = {
      amount,
      method,
      receivedAt: new Date(),
      notes
    };

    order.paymentRecords.push(paymentRecord);
    order.totalPaid += amount;

    // Update payment status
    if (order.totalPaid >= order.totalAmount) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (order.totalPaid > 0) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    }

    order.lastModifiedBy = req.user?.userId as any;
    await order.save();

    // Log payment
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: order._id,
      changeType: ChangeType.PAYMENT_ADD,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [
        {
          field: 'payment',
          oldValue: order.totalPaid - amount,
          newValue: order.totalPaid
        }
      ],
      description: `Payment of ${amount} AED received via ${method}`
    });

    res.json({
      success: true,
      message: 'Payment added successfully',
      order
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error adding payment' });
  }
};

export const updateOrderItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { itemId } = req.params;
    const { status, notes } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.isDeleted) {
      res.status(400).json({ message: 'Cannot update items in a deleted order' });
      return;
    }

    const item = order.items.find((item: any) => item._id?.toString() === itemId);

    if (!item) {
      res.status(404).json({ message: 'Item not found in order' });
      return;
    }

    const oldStatus = item.status;

    if (status && Object.values(ItemStatus).includes(status)) {
      item.status = status;
    }

    if (notes !== undefined) {
      item.notes = notes;
    }

    order.lastModifiedBy = req.user?.userId as any;
    await order.save();

    // Log item update
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: order._id,
      changeType: ChangeType.ITEM_UPDATE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [
        {
          field: `item.${item.name}.status`,
          oldValue: oldStatus,
          newValue: status
        }
      ],
      description: `Item "${item.name}" status updated to ${status}`
    });

    res.json({
      success: true,
      message: 'Order item updated successfully',
      order
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating order item' });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Soft delete
    order.isDeleted = true;
    order.status = OrderStatus.DELETED;
    order.lastModifiedBy = req.user?.userId as any;

    order.statusHistory.push({
      status: OrderStatus.DELETED,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changedAt: new Date(),
      notes: 'Order deleted by admin'
    });

    await order.save();

    // Log deletion
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: order._id,
      changeType: ChangeType.DELETE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [],
      description: 'Order soft deleted'
    });

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting order' });
  }
};

export const getOrderChangeLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const logs = await ChangeLog.find({
      entityType: EntityType.ORDER,
      entityId: req.params.id
    })
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching change logs' });
  }
};

export const searchGuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      res.json({
        success: true,
        guests: []
      });
      return;
    }

    const searchTerm = query.trim();

    // Search in Guest profiles first (new system)
    const guestProfiles = await Guest.find({
      isDeleted: false,
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('_id name email phone address totalOrders totalSpent')
      .sort({ name: 1 })
      .limit(10);

    // Also search in orders for matching guest details (backward compatibility for old orders without profiles)
    const orders = await Order.find({
      isDeleted: false,
      guest: { $exists: false }, // Only orders without guest profile reference
      $or: [
        { 'guestDetails.name': { $regex: searchTerm, $options: 'i' } },
        { 'guestDetails.email': { $regex: searchTerm, $options: 'i' } },
        { 'guestDetails.phone': { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .select('guestDetails')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get unique guests from orders (deduplicate by phone number)
    const guestsMap = new Map();
    orders.forEach(order => {
      const phone = order.guestDetails.phone;
      if (!guestsMap.has(phone)) {
        guestsMap.set(phone, {
          name: order.guestDetails.name,
          email: order.guestDetails.email,
          phone: order.guestDetails.phone,
          address: order.guestDetails.address
        });
      }
    });

    const legacyGuests = Array.from(guestsMap.values());

    // Combine results - profiles first, then legacy
    const guests = [
      ...guestProfiles.map(g => ({
        _id: g._id,
        name: g.name,
        email: g.email,
        phone: g.phone,
        address: g.address,
        totalOrders: g.totalOrders,
        totalSpent: g.totalSpent,
        hasProfile: true
      })),
      ...legacyGuests.map(g => ({
        ...g,
        hasProfile: false
      }))
    ];

    res.json({
      success: true,
      count: guests.length,
      guests
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error searching guests' });
  }
};
