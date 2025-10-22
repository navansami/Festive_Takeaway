export enum UserRole {
  OPERATIONS = 'operations',
  ORDER_TAKER = 'order-taker',
  ADMIN = 'admin'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  ON_HOLD = 'on_hold',
  COLLECTED = 'collected',
  AWAITING_COLLECTION = 'awaiting_collection',
  DELAYED = 'delayed',
  DELETED = 'deleted'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

export enum ItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  NOT_COLLECTED = 'not_collected',
  COLLECTED = 'collected'
}

export enum MenuCategory {
  ROASTS = 'roasts',
  SMOKED_SALMON = 'smoked_salmon',
  POTATOES = 'potatoes',
  VEGETABLES = 'vegetables',
  SAUCES = 'sauces',
  DESSERTS = 'desserts'
}
