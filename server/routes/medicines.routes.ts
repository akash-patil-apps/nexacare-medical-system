// server/routes/medicines.routes.ts
// Medicine/Inventory API - Accessible to all dashboards that need medicine data
import { Router } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { prescriptions, medicationOrders } from '../../shared/schema';
import { eq, and, sql, desc, gte, lte, or, isNull } from 'drizzle-orm';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Get all medicines from prescriptions and medication orders
 * This provides a unified medicine list for all dashboards
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const { search, limit = 100 } = req.query;

    // Get unique medicines from prescriptions
    const prescriptionMedicines = await db
      .selectDistinct({
        name: prescriptions.medicationName,
      })
      .from(prescriptions)
      .where(
        search
          ? sql`LOWER(${prescriptions.medicationName}) LIKE LOWER(${'%' + search + '%'})`
          : undefined
      )
      .limit(+(limit as number));

    // Get unique medicines from medication orders
    const orderMedicines = await db
      .selectDistinct({
        name: medicationOrders.medicationName,
      })
      .from(medicationOrders)
      .where(
        search
          ? sql`LOWER(${medicationOrders.medicationName}) LIKE LOWER(${'%' + search + '%'})`
          : undefined
      )
      .limit(+(limit as number));

    // Combine and deduplicate
    const allMedicines = new Set<string>();
    prescriptionMedicines.forEach(m => allMedicines.add(m.name));
    orderMedicines.forEach(m => allMedicines.add(m.name));

    const medicines = Array.from(allMedicines)
      .map(name => ({ name }))
      .sort((a, b) => a.name.localeCompare(b.name));

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
 * Search medicines
 */
router.get('/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;

    // Search in prescriptions
    const prescriptionResults = await db
      .selectDistinct({
        name: prescriptions.medicationName,
      })
      .from(prescriptions)
      .where(sql`LOWER(${prescriptions.medicationName}) LIKE LOWER(${searchTerm})`)
      .limit(50);

    // Search in medication orders
    const orderResults = await db
      .selectDistinct({
        name: medicationOrders.medicationName,
      })
      .from(medicationOrders)
      .where(sql`LOWER(${medicationOrders.medicationName}) LIKE LOWER(${searchTerm})`)
      .limit(50);

    // Combine and deduplicate
    const allResults = new Set<string>();
    prescriptionResults.forEach(m => allResults.add(m.name));
    orderResults.forEach(m => allResults.add(m.name));

    const results = Array.from(allResults)
      .map(name => ({ name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json(results);
  } catch (err: any) {
    console.error('❌ Search medicines error:', err);
    res.status(500).json({ message: 'Failed to search medicines' });
  }
});

export default router;


