// server/routes/medicines.routes.ts
// Medicine/Inventory API - Accessible to all dashboards that need medicine data
import { Router } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { prescriptions, medicationOrders, medicineCatalog } from '../../shared/schema';
import { eq, and, sql, desc, gte, lte, or, isNull, like, ilike } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Get all medicines from catalog
 * This provides a unified medicine list for all dashboards
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, category, type, limit = 500 } = req.query; // Increased default limit

    const conditions = [eq(medicineCatalog.isActive, true)];

    // Apply search filter (only if search term provided)
    if (search && typeof search === 'string' && search.trim()) {
      conditions.push(
        or(
          ilike(medicineCatalog.name, `%${search}%`),
          ilike(medicineCatalog.genericName, `%${search}%`),
          ilike(medicineCatalog.brandName, `%${search}%`)
        )!
      );
    }

    // Apply category filter
    if (category && typeof category === 'string') {
      conditions.push(eq(medicineCatalog.category, category));
    }

    // Apply type filter
    if (type && typeof type === 'string') {
      conditions.push(eq(medicineCatalog.type, type));
    }

    const medicines = await db
      .select()
      .from(medicineCatalog)
      .where(and(...conditions))
      .limit(+(limit as number))
      .orderBy(medicineCatalog.name); // Already sorted alphabetically

    // Set cache headers for better performance
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.json(medicines);
  } catch (err: any) {
    console.error('❌ Get medicines error:', err);
    res.status(500).json({ message: 'Failed to fetch medicines' });
  }
});

/**
 * Get medicine usage statistics
 */
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    // Get medicine counts from prescriptions
    const prescriptionStats = await db
      .select({
        medicationName: prescriptions.medicationName,
        count: sql<number>`COUNT(*)`,
      })
      .from(prescriptions)
      .groupBy(prescriptions.medicationName)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(20);

    // Get medicine counts from medication orders
    const orderStats = await db
      .select({
        medicationName: medicationOrders.medicationName,
        count: sql<number>`COUNT(*)`,
      })
      .from(medicationOrders)
      .where(eq(medicationOrders.status, 'active'))
      .groupBy(medicationOrders.medicationName)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(20);

    // Combine stats
    const statsMap = new Map<string, number>();
    prescriptionStats.forEach(s => {
      statsMap.set(s.medicationName, (statsMap.get(s.medicationName) || 0) + s.count);
    });
    orderStats.forEach(s => {
      statsMap.set(s.medicationName, (statsMap.get(s.medicationName) || 0) + s.count);
    });

    const stats = Array.from(statsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    res.json(stats);
  } catch (err: any) {
    console.error('❌ Get medicine stats error:', err);
    res.status(500).json({ message: 'Failed to fetch medicine stats' });
  }
});

/**
 * Get medicine by ID
 */
router.get('/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const [medicine] = await db
      .select()
      .from(medicineCatalog)
      .where(eq(medicineCatalog.id, +id))
      .limit(1);

    if (!medicine) {
      return res.status(404).json({ message: 'Medicine not found' });
    }

    res.json(medicine);
  } catch (err: any) {
    console.error('❌ Get medicine error:', err);
    res.status(500).json({ message: 'Failed to fetch medicine' });
  }
});

/**
 * Get medicine categories
 */
router.get('/categories/list', async (req: AuthenticatedRequest, res) => {
  try {
    const categories = await db
      .selectDistinct({
        category: medicineCatalog.category,
      })
      .from(medicineCatalog)
      .where(eq(medicineCatalog.isActive, true));

    res.json(categories.map(c => c.category).filter(Boolean));
  } catch (err: any) {
    console.error('❌ Get medicine categories error:', err);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

/**
 * Get medicine types
 */
router.get('/types/list', async (req: AuthenticatedRequest, res) => {
  try {
    const types = await db
      .selectDistinct({
        type: medicineCatalog.type,
      })
      .from(medicineCatalog)
      .where(eq(medicineCatalog.isActive, true));

    res.json(types.map(t => t.type).filter(Boolean));
  } catch (err: any) {
    console.error('❌ Get medicine types error:', err);
    res.status(500).json({ message: 'Failed to fetch types' });
  }
});

export default router;


