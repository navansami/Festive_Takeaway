import { Response } from 'express';
import Enquiry, { EnquiryStatus } from '../models/Enquiry';
import Order from '../models/Order';
import { AuthRequest } from '../middleware/auth';
import { OrderStatus } from '../types';

export const createEnquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      guestName,
      guestEmail,
      guestPhone,
      guestAddress,
      enquiryDetails,
      desiredCollectionDate,
      desiredCollectionTime,
      notes
    } = req.body;

    const enquiry = await Enquiry.create({
      guestName,
      guestEmail,
      guestPhone,
      guestAddress,
      enquiryDetails,
      desiredCollectionDate,
      desiredCollectionTime,
      notes,
      createdBy: req.user?.userId,
      lastModifiedBy: req.user?.userId
    });

    res.status(201).json({
      success: true,
      message: 'Enquiry created successfully',
      enquiry
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error creating enquiry' });
  }
};

export const getAllEnquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;

    const query: any = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const enquiries = await Enquiry.find(query)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('convertedToOrder')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: enquiries.length,
      enquiries
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching enquiries' });
  }
};

export const getEnquiryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('convertedToOrder');

    if (!enquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    res.json({ success: true, enquiry });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error fetching enquiry' });
  }
};

export const updateEnquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    const {
      guestName,
      guestEmail,
      guestPhone,
      guestAddress,
      enquiryDetails,
      desiredCollectionDate,
      desiredCollectionTime,
      status,
      notes
    } = req.body;

    if (guestName) enquiry.guestName = guestName;
    if (guestEmail !== undefined) enquiry.guestEmail = guestEmail;
    if (guestPhone !== undefined) enquiry.guestPhone = guestPhone;
    if (guestAddress !== undefined) enquiry.guestAddress = guestAddress;
    if (enquiryDetails) enquiry.enquiryDetails = enquiryDetails;
    if (desiredCollectionDate) enquiry.desiredCollectionDate = desiredCollectionDate;
    if (desiredCollectionTime !== undefined) enquiry.desiredCollectionTime = desiredCollectionTime;
    if (status && Object.values(EnquiryStatus).includes(status)) enquiry.status = status;
    if (notes !== undefined) enquiry.notes = notes;

    enquiry.lastModifiedBy = req.user?.userId as any;
    await enquiry.save();

    res.json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error updating enquiry' });
  }
};

export const convertToOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    if (enquiry.status === EnquiryStatus.CONVERTED) {
      res.status(400).json({ message: 'Enquiry has already been converted to an order' });
      return;
    }

    const {
      items,
      collectionDate,
      collectionTime,
      paymentMethod,
      guestEmail,
      guestPhone,
      guestAddress
    } = req.body;

    // Validate required fields
    if (!guestEmail || !guestPhone || !guestAddress) {
      res.status(400).json({
        message: 'Guest email, phone, and address are required to create an order'
      });
      return;
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => {
      item.totalPrice = item.price * item.quantity;
      return sum + item.totalPrice;
    }, 0);

    // Create order from enquiry
    const order = await Order.create({
      guestDetails: {
        name: enquiry.guestName,
        email: guestEmail,
        phone: guestPhone,
        address: guestAddress
      },
      collectionPerson: {
        name: enquiry.guestName,
        email: guestEmail,
        phone: guestPhone
      },
      items,
      totalAmount,
      collectionDate: collectionDate || enquiry.desiredCollectionDate,
      collectionTime: collectionTime || enquiry.desiredCollectionTime,
      paymentMethod,
      createdBy: req.user?.userId,
      lastModifiedBy: req.user?.userId,
      statusHistory: [
        {
          status: OrderStatus.PENDING,
          changedBy: req.user?.userId as any,
          changedAt: new Date(),
          notes: `Converted from enquiry #${enquiry._id}`
        }
      ]
    });

    // Update enquiry
    enquiry.status = EnquiryStatus.CONVERTED;
    enquiry.convertedToOrder = order._id as any;
    enquiry.lastModifiedBy = req.user?.userId as any;
    await enquiry.save();

    await order.populate('items.menuItem');

    res.status(201).json({
      success: true,
      message: 'Enquiry converted to order successfully',
      order,
      enquiry
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error converting enquiry to order' });
  }
};

export const deleteEnquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    await enquiry.deleteOne();

    res.json({
      success: true,
      message: 'Enquiry deleted successfully'
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Error deleting enquiry' });
  }
};
