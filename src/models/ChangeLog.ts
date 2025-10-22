import mongoose, { Document, Schema } from 'mongoose';

export enum ChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  STATUS_CHANGE = 'status_change',
  ITEM_ADD = 'item_add',
  ITEM_REMOVE = 'item_remove',
  ITEM_UPDATE = 'item_update',
  PAYMENT_ADD = 'payment_add'
}

export enum EntityType {
  ORDER = 'order',
  ENQUIRY = 'enquiry',
  USER = 'user'
}

export interface IChangeLog extends Document {
  entityType: EntityType;
  entityId: mongoose.Types.ObjectId;
  changeType: ChangeType;
  changedBy: mongoose.Types.ObjectId;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  description?: string;
  createdAt: Date;
}

const changeLogSchema = new Schema<IChangeLog>(
  {
    entityType: {
      type: String,
      enum: Object.values(EntityType),
      required: true
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType'
    },
    changeType: {
      type: String,
      enum: Object.values(ChangeType),
      required: true
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changes: [
      {
        field: {
          type: String,
          required: true
        },
        oldValue: {
          type: Schema.Types.Mixed
        },
        newValue: {
          type: Schema.Types.Mixed
        }
      }
    ],
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Index for efficient querying
changeLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model<IChangeLog>('ChangeLog', changeLogSchema);
