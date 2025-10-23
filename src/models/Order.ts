import mongoose, { Document, Schema } from 'mongoose';
import { OrderStatus, PaymentStatus, PaymentMethod, ItemStatus } from '../types';

export interface IOrderItem {
  menuItem: mongoose.Types.ObjectId;
  name: string;
  servingSize: string;
  quantity: number;
  price: number;
  totalPrice: number;
  status: ItemStatus;
  notes?: string;
}

export interface IPaymentRecord {
  amount: number;
  method: PaymentMethod;
  receivedAt: Date;
  notes?: string;
}

export interface IStatusHistory {
  status: OrderStatus;
  changedBy: mongoose.Types.ObjectId;
  changedAt: Date;
  notes?: string;
}

export interface IGuestDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  guest?: mongoose.Types.ObjectId; // Reference to Guest profile
  guestDetails: IGuestDetails; // Kept for backward compatibility
  collectionPerson: {
    name: string;
    email?: string;
    phone?: string;
  };
  items: IOrderItem[];
  totalAmount: number;
  collectionDate: Date;
  collectionTime: string;
  status: OrderStatus;
  statusHistory: IStatusHistory[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentRecords: IPaymentRecord[];
  totalPaid: number;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    menuItem: {
      type: Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    servingSize: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: Object.values(ItemStatus),
      default: ItemStatus.PENDING
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true
    },
    receivedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const statusHistorySchema = new Schema<IStatusHistory>(
  {
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      trim: true
    }
  },
  { _id: true }
);

const guestDetailsSchema = new Schema<IGuestDetails>(
  {
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Guest email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Guest phone is required'],
      trim: true
    },
    address: {
      type: String,
      required: [true, 'Guest address is required'],
      trim: true
    }
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      unique: true,
      sparse: true
    },
    guest: {
      type: Schema.Types.ObjectId,
      ref: 'Guest',
      index: true
    },
    guestDetails: {
      type: guestDetailsSchema,
      required: true
    },
    collectionPerson: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      email: {
        type: String,
        trim: true,
        lowercase: true
      },
      phone: {
        type: String,
        trim: true
      }
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: function (v: IOrderItem[]) {
          return v.length > 0;
        },
        message: 'At least one item is required'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    collectionDate: {
      type: Date,
      required: [true, 'Collection date is required']
    },
    collectionTime: {
      type: String,
      required: [true, 'Collection time is required']
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING
    },
    paymentRecords: {
      type: [paymentRecordSchema],
      default: []
    },
    totalPaid: {
      type: Number,
      default: 0,
      min: 0
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Auto-increment order number
orderSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastOrder = await mongoose.model<IOrder>('Order').findOne().sort({ createdAt: -1 });
    let orderNumber = 'FTP-0001';

    if (lastOrder && lastOrder.orderNumber) {
      const lastNumber = parseInt(lastOrder.orderNumber.split('-')[1]);
      const newNumber = (lastNumber + 1).toString().padStart(4, '0');
      orderNumber = `FTP-${newNumber}`;
    }

    this.orderNumber = orderNumber;
  }
  next();
});

// Update guest statistics after order is saved
orderSchema.post('save', async function (doc) {
  if (doc.guest && !doc.isDeleted) {
    try {
      const Guest = mongoose.model('Guest');
      const Order = mongoose.model<IOrder>('Order');

      // Calculate guest statistics
      const orders = await Order.find({ guest: doc.guest, isDeleted: false });
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + order.totalAmount, 0);
      const lastOrderDate = orders.length > 0
        ? orders.sort((a, b) => b.collectionDate.getTime() - a.collectionDate.getTime())[0].collectionDate
        : undefined;

      await Guest.findByIdAndUpdate(doc.guest, {
        totalOrders,
        totalSpent,
        lastOrderDate
      });
    } catch (error) {
      console.error('Error updating guest statistics:', error);
    }
  }
});

export default mongoose.model<IOrder>('Order', orderSchema);
