import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

  console.log('🔐 Auth middleware - Auth header:', authHeader);
  console.log('🔐 Auth middleware - Token:', token ? `${token.substring(0, 20)}...` : 'none');
  console.log('🔐 Auth middleware - JWT_SECRET:', JWT_SECRET ? 'present' : 'missing');

  if (!token) {
    console.log('❌ Auth middleware - No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('✅ Auth middleware - Token decoded successfully:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ Auth middleware - Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

export function authorizeRoles(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    console.log('🔐 Role authorization - Required roles:', roles);
    console.log('🔐 Role authorization - User:', req.user);
    
    if (!req.user) {
      console.log('❌ Role authorization - No user found');
      return res.status(401).json({ message: 'Authentication required' });
    }

    console.log('🔐 Role authorization - User role:', req.user.role);
    console.log('🔐 Role authorization - Role check:', roles.includes(req.user.role));

    if (!roles.includes(req.user.role)) {
      console.log('❌ Role authorization - Insufficient permissions. User role:', req.user.role, 'Required:', roles);
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    console.log('✅ Role authorization - Access granted');
    next();
  };
}

export function generateToken(user: { id: number; mobileNumber: string; role: string; fullName: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}
