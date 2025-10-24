import mongoose, { Document, Schema } from 'mongoose';
import { MenuCategory } from '../types';

export interface IPricing {
  servingSize: string;
  price: number;
}

export interface IBundleConfig {
  servingSize: string; // Which pricing option this applies to (e.g., "6kgs For 8 people")
  maxPortions: number; // Max portions for sides (e.g., 2 or 4)
  maxSauces: number; // Max sauces included
  allowMixing: boolean; // Whether different serving sizes can be mixed
  portionValues?: { // Define portion values for different serving sizes
    servingSize: string; // e.g., "For 4 people"
    portionValue: number; // e.g., 1 portion
  }[];
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
  bundleConfig?: IBundleConfig[]; // Bundle configuration for items with sides
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

const bundleConfigSchema = new Schema<IBundleConfig>(
  {
    servingSize: {
      type: String,
      required: true
    },
    maxPortions: {
      type: Number,
      required: true,
      min: 0
    },
    maxSauces: {
      type: Number,
      required: true,
      min: 0
    },
    allowMixing: {
      type: Boolean,
      required: true,
      default: false
    },
    portionValues: [{
      servingSize: { type: String, required: true },
      portionValue: { type: Number, required: true, min: 0 }
    }]
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
    bundleConfig: {
      type: [bundleConfigSchema],
      default: []
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
