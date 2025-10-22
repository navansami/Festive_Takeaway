import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const generateToken = (payload: JWTPayload): string => {
  const jwtAny = jwt as any;
  return jwtAny.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
  } catch (error) {
    return null;
  }
};
