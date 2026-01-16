// server/services/pharmacy-inventory.service.ts
import { db } from "../db";
import {
  pharmacyInventory,
  pharmacyStockMovements,
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
  dispensations,
  dispensationItems,
  medicineCatalog,
} from "../../shared/schema";
import { eq, and, sql, desc, gte, lte, or, ilike } from "drizzle-orm";

/**
 * Get all inventory items for a hospital
 */
export const getInventory = async (hospitalId: number, filters?: {
  search?: string;
  lowStock?: boolean;
  expired?: boolean;
  medicineCatalogId?: number;
}) => {
  try {
    let query = db
      .select({
        inventory: pharmacyInventory,
        medicine: medicineCatalog,
      })
      .from(pharmacyInventory)
      .innerJoin(medicineCatalog, eq(pharmacyInventory.medicineCatalogId, medicineCatalog.id))
      .where(eq(pharmacyInventory.hospitalId, hospitalId));

    if (filters?.medicineCatalogId) {
      query = query.where(eq(pharmacyInventory.medicineCatalogId, filters.medicineCatalogId));
    }

    if (filters?.search) {
      query = query.where(
        or(
          ilike(medicineCatalog.name, `%${filters.search}%`),
          ilike(pharmacyInventory.batchNumber, `%${filters.search}%`)
        )
      );
    }

    if (filters?.lowStock) {
      query = query.where(
        sql`${pharmacyInventory.quantity} <= ${pharmacyInventory.reorderLevel}`
      );
    }

    if (filters?.expired) {
      query = query.where(sql`${pharmacyInventory.expiryDate} < NOW()`);
    }

    const results = await query.orderBy(desc(pharmacyInventory.createdAt));

    // Calculate low stock and expired flags
    const now = new Date();
    return results.map((item) => {
      const expiryDate = item.inventory.expiryDate ? new Date(item.inventory.expiryDate) : null;
      const isExpired = expiryDate ? expiryDate < now : false;
      const isLowStock = item.inventory.quantity <= (item.inventory.reorderLevel || 10);
      const isExpiringSoon = expiryDate
        ? expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
        : false;

      return {
        ...item.inventory,
        medicine: item.medicine,
        isExpired,
        isLowStock,
        isExpiringSoon,
      };
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    throw error;
  }
};

/**
 * Get inventory by ID
 */
export const getInventoryById = async (inventoryId: number, hospitalId: number) => {
  try {
    const [result] = await db
      .select({
        inventory: pharmacyInventory,
        medicine: medicineCatalog,
      })
      .from(pharmacyInventory)
      .innerJoin(medicineCatalog, eq(pharmacyInventory.medicineCatalogId, medicineCatalog.id))
      .where(
        and(
          eq(pharmacyInventory.id, inventoryId),
          eq(pharmacyInventory.hospitalId, hospitalId)
        )
      )
      .limit(1);

    if (!result) {
      throw new Error("Inventory item not found");
    }

    return {
      ...result.inventory,
      medicine: result.medicine,
    };
  } catch (error) {
    console.error("Error fetching inventory by ID:", error);
    throw error;
  }
};

/**
 * Add stock to inventory (purchase or adjustment)
 */
export const addStock = async (data: {
  hospitalId: number;
  medicineCatalogId: number;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unit: string;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  location?: string;
  reorderLevel?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  referenceType?: string;
  referenceId?: number;
  reason?: string;
  performedByUserId: number;
}) => {
  try {
    // Check if inventory item with same batch exists
    const existing = await db
      .select()
      .from(pharmacyInventory)
      .where(
        and(
          eq(pharmacyInventory.hospitalId, data.hospitalId),
          eq(pharmacyInventory.medicineCatalogId, data.medicineCatalogId),
          eq(pharmacyInventory.batchNumber, data.batchNumber)
        )
      )
      .limit(1);

    let inventoryId: number;
    let newQuantity: number;

    if (existing.length > 0) {
      // Update existing inventory
      newQuantity = existing[0].quantity + data.quantity;
      const [updated] = await db
        .update(pharmacyInventory)
        .set({
          quantity: newQuantity,
          updatedAt: new Date(),
        })
        .where(eq(pharmacyInventory.id, existing[0].id))
        .returning();

      inventoryId = updated.id;
    } else {
      // Create new inventory item
      const [created] = await db
        .insert(pharmacyInventory)
        .values({
          hospitalId: data.hospitalId,
          medicineCatalogId: data.medicineCatalogId,
          batchNumber: data.batchNumber,
          expiryDate: data.expiryDate,
          quantity: data.quantity,
          unit: data.unit,
          purchasePrice: data.purchasePrice ? String(data.purchasePrice) : null,
          sellingPrice: data.sellingPrice ? String(data.sellingPrice) : null,
          mrp: data.mrp ? String(data.mrp) : null,
          location: data.location,
          reorderLevel: data.reorderLevel || 10,
          minStockLevel: data.minStockLevel || 5,
          maxStockLevel: data.maxStockLevel,
          createdAt: new Date(),
        })
        .returning();

      inventoryId = created.id;
      newQuantity = data.quantity;
    }

    // Record stock movement
    await db.insert(pharmacyStockMovements).values({
      hospitalId: data.hospitalId,
      inventoryId,
      movementType: data.referenceType === "purchase_order" ? "purchase" : "adjustment",
      quantity: data.quantity,
      unit: data.unit,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      reason: data.reason || "Stock added",
      performedByUserId: data.performedByUserId,
      createdAt: new Date(),
    });

    return { inventoryId, newQuantity };
  } catch (error) {
    console.error("Error adding stock:", error);
    throw error;
  }
};

/**
 * Reduce stock (sale, expiry, damage, etc.)
 */
export const reduceStock = async (data: {
  inventoryId: number;
  hospitalId: number;
  quantity: number;
  movementType: "sale" | "return" | "expiry" | "damage" | "adjustment" | "transfer";
  referenceType?: string;
  referenceId?: number;
  reason?: string;
  performedByUserId: number;
}) => {
  try {
    // Get current inventory
    const [inventory] = await db
      .select()
      .from(pharmacyInventory)
      .where(
        and(
          eq(pharmacyInventory.id, data.inventoryId),
          eq(pharmacyInventory.hospitalId, data.hospitalId)
        )
      )
      .limit(1);

    if (!inventory) {
      throw new Error("Inventory item not found");
    }

    if (inventory.quantity < data.quantity) {
      throw new Error(`Insufficient stock. Available: ${inventory.quantity}, Requested: ${data.quantity}`);
    }

    // Update inventory
    const newQuantity = inventory.quantity - data.quantity;
    await db
      .update(pharmacyInventory)
      .set({
        quantity: newQuantity,
        updatedAt: new Date(),
      })
      .where(eq(pharmacyInventory.id, data.inventoryId));

    // Record stock movement
    await db.insert(pharmacyStockMovements).values({
      hospitalId: data.hospitalId,
      inventoryId: data.inventoryId,
      movementType: data.movementType,
      quantity: -data.quantity, // Negative for out
      unit: inventory.unit,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      reason: data.reason,
      performedByUserId: data.performedByUserId,
      createdAt: new Date(),
    });

    return { newQuantity };
  } catch (error) {
    console.error("Error reducing stock:", error);
    throw error;
  }
};

/**
 * Get stock movements
 */
export const getStockMovements = async (
  hospitalId: number,
  filters?: {
    inventoryId?: number;
    movementType?: string;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  try {
    let query = db
      .select({
        movement: pharmacyStockMovements,
        inventory: pharmacyInventory,
        medicine: medicineCatalog,
        user: {
          id: sql<number>`${pharmacyStockMovements.performedByUserId}`,
        },
      })
      .from(pharmacyStockMovements)
      .innerJoin(pharmacyInventory, eq(pharmacyStockMovements.inventoryId, pharmacyInventory.id))
      .innerJoin(medicineCatalog, eq(pharmacyInventory.medicineCatalogId, medicineCatalog.id))
      .where(eq(pharmacyStockMovements.hospitalId, hospitalId));

    if (filters?.inventoryId) {
      query = query.where(eq(pharmacyStockMovements.inventoryId, filters.inventoryId));
    }

    if (filters?.movementType) {
      query = query.where(eq(pharmacyStockMovements.movementType, filters.movementType));
    }

    if (filters?.startDate) {
      query = query.where(gte(pharmacyStockMovements.createdAt, filters.startDate));
    }

    if (filters?.endDate) {
      query = query.where(lte(pharmacyStockMovements.createdAt, filters.endDate));
    }

    return await query.orderBy(desc(pharmacyStockMovements.createdAt));
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    throw error;
  }
};

/**
 * Get low stock alerts
 */
export const getLowStockAlerts = async (hospitalId: number) => {
  try {
    const inventory = await getInventory(hospitalId, { lowStock: true });
    return inventory.filter((item) => item.isLowStock);
  } catch (error) {
    console.error("Error fetching low stock alerts:", error);
    throw error;
  }
};

/**
 * Get expired/expiring soon items
 */
export const getExpiryAlerts = async (hospitalId: number) => {
  try {
    const inventory = await getInventory(hospitalId);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return inventory.filter((item) => {
      if (!item.expiryDate) return false;
      const expiry = new Date(item.expiryDate);
      return expiry <= thirtyDaysFromNow;
    });
  } catch (error) {
    console.error("Error fetching expiry alerts:", error);
    throw error;
  }
};
