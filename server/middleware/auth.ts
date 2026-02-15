import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { getJwtSecret } from '../env.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    mobileNumber: string;
    role: string;
    fullName: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    req.user = decoded;
    next();
  } catch (error) {
    console.error('❌ Auth middleware - Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Convert to lowercase for case-insensitive comparison
    const userRole = req.user.role.toLowerCase();
    const allowedRoles = roles.map(role => role.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      console.error('❌ Role authorization - Insufficient permissions. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({ 
        message: `Access denied. This action requires one of the following roles: ${roles.join(', ')}. Your current role is: ${req.user.role}` 
      });
    }

    next();
  };
}

export function generateToken(user: { id: number; mobileNumber: string; role: string; fullName: string }) {
  return jwt.sign(user, getJwtSecret(), { expiresIn: '24h' });
}
