import mongoose, { Document, Schema } from 'mongoose';
import { MenuCategory } from '../types';

export interface IPricing {
  servingSize: string;
  price: number;
}

export interface IPackageConstraints {
  servingSize: string; // Which pricing option this applies to
  allowedSides?: {
    maxCount: number;
    servingSize: string; // e.g., "For 4 people"
    categories: string[]; // e.g., ["potatoes", "vegetables"]
  };
  allowedSauces?: {
    maxCount: number;
    servingSize: string; // e.g., "Small"
  };
}

export interface IMenuItem extends Document {
  name: string;
  description?: string;
  category: MenuCategory;
  pricing: IPricing[];
  allergens?: string[];
  isAvailable: boolean;
  packageConstraints?: IPackageConstraints[]; // For combo packages like "Turkey with Sides"
  createdAt: Date;
  updatedAt: Date;
}

const pricingSchema = new Schema<IPricing>(
  {
    servingSize: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { _id: false }
);

const packageConstraintsSchema = new Schema<IPackageConstraints>(
  {
    servingSize: {
      type: String,
      required: true
    },
    allowedSides: {
      maxCount: { type: Number },
      servingSize: { type: String },
      categories: { type: [String] }
    },
    allowedSauces: {
      maxCount: { type: Number },
      servingSize: { type: String }
    }
  },
  { _id: false }
);

const menuItemSchema = new Schema<IMenuItem>(
  {
    name: {
      type: String,
      required: [true, 'Menu item name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: Object.values(MenuCategory),
      required: [true, 'Category is required']
    },
    pricing: {
      type: [pricingSchema],
      required: true,
      validate: {
        validator: function (v: IPricing[]) {
          return v.length > 0;
        },
        message: 'At least one pricing option is required'
      }
    },
    allergens: {
      type: [String],
      default: []
    },
    isAvailable: {
      type: Boolean,
      default: true
    },
    packageConstraints: {
      type: [packageConstraintsSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
