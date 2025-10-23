import { Response } from 'express';
import mongoose from 'mongoose';
import Guest from '../models/Guest';
import Order from '../models/Order';
import ChangeLog from '../models/ChangeLog';
import { AuthRequest } from '../middleware/auth';
import { ChangeType, EntityType } from '../models/ChangeLog';

export const getAllGuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const includeDeleted = req.query.includeDeleted === 'true' && req.user?.role === 'admin';

    const query: any = {};

    // Don't show deleted guests unless specifically requested by admin
    if (!includeDeleted) {
      query.isDeleted = false;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [guests, total] = await Promise.all([
      Guest.find(query)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Guest.countDocuments(query)
    ]);

    res.json({
      success: true,
      guests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching guests' });
  }
};

export const getGuestById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guest = await Guest.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email');

    if (!guest) {
      res.status(404).json({ message: 'Guest not found' });
      return;
    }

    // Don't show deleted guests to non-admin users
    if (guest.isDeleted && req.user?.role !== 'admin') {
      res.status(404).json({ message: 'Guest not found' });
      return;
    }

    res.json({ success: true, guest });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching guest' });
  }
};

export const getGuestOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guestId = req.params.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const includeDeleted = req.query.includeDeleted === 'true' && req.user?.role === 'admin';

    // Verify guest exists
    const guest = await Guest.findById(guestId);
    if (!guest) {
      res.status(404).json({ message: 'Guest not found' });
      return;
    }

    const query: any = { guest: guestId };

    if (!includeDeleted) {
      query.isDeleted = false;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('items.menuItem')
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email')
        .sort({ collectionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching guest orders' });
  }
};

export const createGuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, address, notes, dietaryRequirements, preferredContactMethod } = req.body;

    // Check if guest with same email already exists
    const existingGuest = await Guest.findOne({ email, isDeleted: false });
    if (existingGuest) {
      res.status(400).json({ message: 'A guest with this email already exists' });
      return;
    }

    const guest = new Guest({
      name,
      email,
      phone,
      address,
      notes,
      dietaryRequirements,
      preferredContactMethod,
      createdBy: new mongoose.Types.ObjectId(req.user?.userId),
      lastModifiedBy: new mongoose.Types.ObjectId(req.user?.userId)
    });

    await guest.save();

    // Log the creation
    await ChangeLog.create({
      entityType: EntityType.ORDER, // We'll use ORDER for now, you can extend EntityType if needed
      entityId: guest._id,
      changeType: ChangeType.CREATE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [],
      description: 'Guest profile created'
    });

    await guest.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Guest created successfully',
      guest
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating guest' });
  }
};

export const updateGuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guest = await Guest.findById(req.params.id);

    if (!guest) {
      res.status(404).json({ message: 'Guest not found' });
      return;
    }

    if (guest.isDeleted) {
      res.status(400).json({ message: 'Cannot update a deleted guest' });
      return;
    }

    const changes: any[] = [];
    const { name, email, phone, address, notes, dietaryRequirements, preferredContactMethod } = req.body;

    // Check if email is being changed and if it already exists
    if (email && email !== guest.email) {
      const existingGuest = await Guest.findOne({ email, isDeleted: false, _id: { $ne: guest._id } });
      if (existingGuest) {
        res.status(400).json({ message: 'A guest with this email already exists' });
        return;
      }
    }

    // Track changes
    if (name && name !== guest.name) {
      changes.push({ field: 'name', oldValue: guest.name, newValue: name });
      guest.name = name;
    }

    if (email && email !== guest.email) {
      changes.push({ field: 'email', oldValue: guest.email, newValue: email });
      guest.email = email;
    }

    if (phone && phone !== guest.phone) {
      changes.push({ field: 'phone', oldValue: guest.phone, newValue: phone });
      guest.phone = phone;
    }

    if (address && address !== guest.address) {
      changes.push({ field: 'address', oldValue: guest.address, newValue: address });
      guest.address = address;
    }

    if (notes !== undefined && notes !== guest.notes) {
      changes.push({ field: 'notes', oldValue: guest.notes, newValue: notes });
      guest.notes = notes;
    }

    if (dietaryRequirements !== undefined && dietaryRequirements !== guest.dietaryRequirements) {
      changes.push({ field: 'dietaryRequirements', oldValue: guest.dietaryRequirements, newValue: dietaryRequirements });
      guest.dietaryRequirements = dietaryRequirements;
    }

    if (preferredContactMethod && preferredContactMethod !== guest.preferredContactMethod) {
      changes.push({ field: 'preferredContactMethod', oldValue: guest.preferredContactMethod, newValue: preferredContactMethod });
      guest.preferredContactMethod = preferredContactMethod;
    }

    guest.lastModifiedBy = new mongoose.Types.ObjectId(req.user?.userId);
    await guest.save();

    // Log the changes
    if (changes.length > 0) {
      await ChangeLog.create({
        entityType: EntityType.ORDER,
        entityId: guest._id,
        changeType: ChangeType.UPDATE,
        changedBy: new mongoose.Types.ObjectId(req.user?.userId),
        changes,
        description: 'Guest profile updated'
      });
    }

    await guest.populate('lastModifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Guest updated successfully',
      guest
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating guest' });
  }
};

export const deleteGuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const guest = await Guest.findById(req.params.id);

    if (!guest) {
      res.status(404).json({ message: 'Guest not found' });
      return;
    }

    if (guest.isDeleted) {
      res.status(400).json({ message: 'Guest is already deleted' });
      return;
    }

    // Check if guest has any orders
    const orderCount = await Order.countDocuments({ guest: guest._id, isDeleted: false });
    if (orderCount > 0) {
      res.status(400).json({
        message: 'Cannot delete guest with existing orders. Please delete or reassign the orders first.',
        orderCount
      });
      return;
    }

    // Soft delete
    guest.isDeleted = true;
    guest.lastModifiedBy = new mongoose.Types.ObjectId(req.user?.userId);
    await guest.save();

    // Log the deletion
    await ChangeLog.create({
      entityType: EntityType.ORDER,
      entityId: guest._id,
      changeType: ChangeType.DELETE,
      changedBy: new mongoose.Types.ObjectId(req.user?.userId),
      changes: [],
      description: 'Guest profile deleted'
    });

    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting guest' });
  }
};

export const searchGuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      res.json({ success: true, guests: [] });
      return;
    }

    const guests = await Guest.find({
      isDeleted: false,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phone: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email phone address totalOrders totalSpent lastOrderDate')
      .sort({ name: 1 })
      .limit(10);

    res.json({ success: true, guests });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error searching guests' });
  }
};
