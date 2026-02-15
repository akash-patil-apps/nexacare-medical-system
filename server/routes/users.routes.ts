// server/routes/users.routes.ts
import { Router } from 'express';
import { registerUser, findUserById } from '../services/users.service';
import { insertUserSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();

// Register User
router.post('/', async (req, res) => {
  try {
    const data = insertUserSchema.parse(req.body) as unknown as Parameters<typeof registerUser>[0];
    const user = await registerUser(data);
    res.status(201).json(user);
  } catch (err) {
    console.error('User registration error:', err);
    res.status(400).json({ message: 'Invalid data', error: err });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await findUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('User fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
