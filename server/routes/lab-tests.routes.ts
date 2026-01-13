// server/routes/lab-tests.routes.ts
// Lab Test Catalog API - Accessible to all dashboards that need lab test data
import { Router } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { labTestCatalog } from '../../shared/schema';
import { eq, or, ilike, and } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Get all lab tests from catalog
 * Accessible to doctors, nurses, lab technicians, and other dashboards
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, category, subCategory, limit = 200 } = req.query;

    let query = db
      .select()
      .from(labTestCatalog)
      .where(eq(labTestCatalog.isActive, true));

    // Apply search filter
    if (search && typeof search === 'string') {
      query = query.where(
        or(
          ilike(labTestCatalog.name, `%${search}%`),
          ilike(labTestCatalog.code, `%${search}%`),
          ilike(labTestCatalog.description, `%${search}%`)
        )!
      );
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      query = query.where(eq(labTestCatalog.category, category));
    }

    // Apply subCategory filter
    if (subCategory && typeof subCategory === 'string') {
      query = query.where(eq(labTestCatalog.subCategory, subCategory));
    }

    const tests = await query
      .limit(+(limit as number))
      .orderBy(labTestCatalog.name);

    res.json(tests);
  } catch (err: any) {
    console.error('❌ Get lab tests error:', err);
    res.status(500).json({ message: 'Failed to fetch lab tests' });
  }
});

/**
 * Get lab test by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const [test] = await db
      .select()
      .from(labTestCatalog)
      .where(eq(labTestCatalog.id, +id))
      .limit(1);

    if (!test) {
      return res.status(404).json({ message: 'Lab test not found' });
    }

    res.json(test);
  } catch (err: any) {
    console.error('❌ Get lab test error:', err);
    res.status(500).json({ message: 'Failed to fetch lab test' });
  }
});

/**
 * Get lab test categories
 */
router.get('/categories/list', async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await db
      .selectDistinct({
        category: labTestCatalog.category,
      })
      .from(labTestCatalog)
      .where(eq(labTestCatalog.isActive, true));

    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (err: any) {
    console.error('❌ Get lab test categories error:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

export default router;

