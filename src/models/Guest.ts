import mongoose, { Document, Schema } from 'mongoose';

export interface IGuest extends Document {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes?: string;
  dietaryRequirements?: string;
  preferredContactMethod?: 'email' | 'phone';
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const guestSchema = new Schema<IGuest>(
  {
    name: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: [true, 'Guest email is required'],
      trim: true,
      lowercase: true,
      index: true,
      validate: {
        validator: function (v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: {
      type: String,
      required: [true, 'Guest phone is required'],
      trim: true,
      index: true
    },
    address: {
      type: String,
      required: [true, 'Guest address is required'],
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    dietaryRequirements: {
      type: String,
      trim: true
    },
    preferredContactMethod: {
      type: String,
      enum: ['email', 'phone'],
      default: 'email'
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    lastOrderDate: {
      type: Date
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

// Indexes for searching
guestSchema.index({ name: 'text', email: 'text', phone: 'text' });
guestSchema.index({ isDeleted: 1, createdAt: -1 });

export default mongoose.model<IGuest>('Guest', guestSchema);
