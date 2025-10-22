import mongoose, { Document, Schema } from 'mongoose';

export enum EnquiryStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  CONVERTED = 'converted',
  CLOSED = 'closed'
}

export interface IEnquiry extends Document {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestAddress?: string;
  enquiryDetails: string;
  desiredCollectionDate?: Date;
  desiredCollectionTime?: string;
  status: EnquiryStatus;
  convertedToOrder?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  lastModifiedBy: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const enquirySchema = new Schema<IEnquiry>(
  {
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    guestPhone: {
      type: String,
      trim: true
    },
    guestAddress: {
      type: String,
      trim: true
    },
    enquiryDetails: {
      type: String,
      required: [true, 'Enquiry details are required'],
      trim: true
    },
    desiredCollectionDate: {
      type: Date
    },
    desiredCollectionTime: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(EnquiryStatus),
      default: EnquiryStatus.NEW
    },
    convertedToOrder: {
      type: Schema.Types.ObjectId,
      ref: 'Order'
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
    notes: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IEnquiry>('Enquiry', enquirySchema);
