// server/routes/radiology-tests.routes.ts
// Radiology Test Catalog API - Accessible to all dashboards that need radiology test data
import { Router } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { radiologyTestCatalog } from '../../shared/schema';
import { eq, or, ilike, and } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Get all radiology tests from catalog
 * Accessible to doctors, nurses, radiology technicians, and other dashboards
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, category, subCategory, bodyPart, limit = 200 } = req.query;

    const conditions = [eq(radiologyTestCatalog.isActive, true)];

    // Apply search filter
    if (search && typeof search === 'string') {
      conditions.push(
        or(
          ilike(radiologyTestCatalog.name, `%${search}%`),
          ilike(radiologyTestCatalog.code, `%${search}%`),
          ilike(radiologyTestCatalog.description, `%${search}%`)
        )!
      );
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      conditions.push(eq(radiologyTestCatalog.category, category));
    }

    // Apply subCategory filter
    if (subCategory && typeof subCategory === 'string') {
      conditions.push(eq(radiologyTestCatalog.subCategory, subCategory));
    }

    // Apply bodyPart filter
    if (bodyPart && typeof bodyPart === 'string') {
      conditions.push(eq(radiologyTestCatalog.bodyPart, bodyPart));
    }

    const tests = await db
      .select()
      .from(radiologyTestCatalog)
      .where(and(...conditions))
      .limit(+(limit as number))
      .orderBy(radiologyTestCatalog.name);

    res.json(tests);
  } catch (err: any) {
    console.error('❌ Get radiology tests error:', err);
    res.status(500).json({ message: 'Failed to fetch radiology tests' });
  }
});

/**
 * Get radiology test by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const [test] = await db
      .select()
      .from(radiologyTestCatalog)
      .where(eq(radiologyTestCatalog.id, +id))
      .limit(1);

    if (!test) {
      return res.status(404).json({ message: 'Radiology test not found' });
    }

    res.json(test);
  } catch (err: any) {
    console.error('❌ Get radiology test error:', err);
    res.status(500).json({ message: 'Failed to fetch radiology test' });
  }
});

/**
 * Get radiology test categories
 */
router.get('/categories/list', async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await db
      .selectDistinct({
        category: radiologyTestCatalog.category,
      })
      .from(radiologyTestCatalog)
      .where(eq(radiologyTestCatalog.isActive, true));

    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (err: any) {
    console.error('❌ Get radiology test categories error:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

export default router;

