// server/routes/auth.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import {
  sendOtp,
  verifyOtp,
  registerUser,
  loginUser,
  sendLoginOtp,
  loginUserWithOtp,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} from '../services/auth.service.js';
import {
  registrationSchema,
  loginSchema,
} from '../../shared/schema.js';

const router = Router();

// Send OTP for registration
router.post('/otp/send', async (req, res) => {
  try {
    const { mobileNumber, role } = req.body;
    
    if (!mobileNumber || !role) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: !mobileNumber ? ['mobileNumber'] : ['role']
      });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await sendOtp(mobileNumber, role);
    res.json(result);
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(400).json({ 
      message: 'Failed to send OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify OTP (for registration - no password required yet)
router.post('/otp/verify', async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    if (!mobileNumber || !otp) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: !mobileNumber ? ['mobileNumber'] : ['otp']
      });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format. Must be 6 digits' });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await verifyOtp(mobileNumber, otp);
    res.json(result);
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'OTP verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Register user (after OTP is verified)
router.post('/register', async (req, res) => {
  try {
    const validated = registrationSchema.parse(req.body) as z.infer<typeof registrationSchema> & { email?: string };
    if (validated.role !== 'patient' && (!validated.email || !String(validated.email).trim())) {
      return res.status(400).json({ message: 'Email is required for this role' });
    }
    if (validated.role === 'patient' && (!validated.email || !String(validated.email).trim())) {
      validated.email = `pat_${validated.mobileNumber}_${Date.now()}@nexacare.local`;
    }
    const result = await registerUser(validated as Parameters<typeof registerUser>[0]);
    res.json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ 
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send OTP for login
router.post('/login/otp/send', async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await sendLoginOtp(mobileNumber);
    res.json(result);
  } catch (error) {
    console.error('Send login OTP error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to send login OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify OTP for login
router.post('/login/otp/verify', async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    if (!mobileNumber || !otp) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: !mobileNumber ? ['mobileNumber'] : ['otp']
      });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format. Must be 6 digits' });
    }

    const result = await loginUserWithOtp({ mobileNumber, otp });
    res.json(result);
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Login OTP verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Login only accepts POST; GET returns 405 so the route is clearly "method not allowed" (not 404)
router.get('/login', (_req, res) => {
  res.set('Allow', 'POST');
  res.status(405).json({
    message: 'Method Not Allowed',
    allow: 'POST',
    hint: 'Use POST with body { mobileNumber, password }',
  });
});

// Login with password
router.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body) as { mobileNumber: string; password: string };
    const result = await loginUser(validated);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Send OTP for password reset
router.post('/password-reset/otp/send', async (req, res) => {
  try {
    const { mobileNumber } = req.body;
    
    if (!mobileNumber) {
      return res.status(400).json({ message: 'Mobile number is required' });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await sendPasswordResetOtp(mobileNumber);
    res.json(result);
  } catch (error) {
    console.error('Send password reset OTP error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Failed to send OTP',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify OTP for password reset
router.post('/password-reset/otp/verify', async (req, res) => {
  try {
    const { mobileNumber, otp } = req.body;
    
    if (!mobileNumber || !otp) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: !mobileNumber ? ['mobileNumber'] : ['otp']
      });
    }

    if (typeof otp !== 'string' || otp.length !== 6 || !/^[0-9]{6}$/.test(otp)) {
      return res.status(400).json({ message: 'Invalid OTP format. Must be 6 digits' });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await verifyPasswordResetOtp(mobileNumber, otp);
    res.json(result);
  } catch (error) {
    console.error('Password reset OTP verification error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'OTP verification failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Reset password after OTP verification
router.post('/password-reset/reset', async (req, res) => {
  try {
    const { mobileNumber, newPassword } = req.body;
    
    if (!mobileNumber || !newPassword) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        missingFields: !mobileNumber ? ['mobileNumber'] : ['newPassword']
      });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    if (typeof mobileNumber !== 'string' || mobileNumber.length < 10 || mobileNumber.length > 15) {
      return res.status(400).json({ message: 'Invalid mobile number format' });
    }

    const result = await resetPassword(mobileNumber, newPassword);
    res.json(result);
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ 
      message: error instanceof Error ? error.message : 'Password reset failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
