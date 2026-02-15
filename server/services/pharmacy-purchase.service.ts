// server/services/pharmacy-purchase.service.ts
import { db } from "../db";
import { purchaseOrders, purchaseOrderItems, suppliers } from "../../shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";

/**
 * Get all suppliers for a hospital
 */
export const getSuppliers = async (hospitalId: number) => {
  try {
    return await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.hospitalId, hospitalId), eq(suppliers.isActive, true)))
      .orderBy(suppliers.name);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
};

/**
 * Create supplier
 */
export const createSupplier = async (data: {
  hospitalId: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  gstNumber?: string;
}) => {
  try {
    const [created] = await db
      .insert(suppliers)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    return created;
  } catch (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
};

/**
 * Get purchase orders
 */
export const getPurchaseOrders = async (hospitalId: number, filters?: {
  status?: string;
  supplierId?: number;
}) => {
  try {
    let query = db
      .select({
        po: purchaseOrders,
        supplier: suppliers,
      })
      .from(purchaseOrders)
      .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.hospitalId, hospitalId));

    if (filters?.status) {
      query = (query as any).where(eq(purchaseOrders.status, filters.status));
    }

    if (filters?.supplierId) {
      query = (query as any).where(eq(purchaseOrders.supplierId, filters.supplierId));
    }

    const results = await query.orderBy(desc(purchaseOrders.createdAt));

    // Get items for each PO
    const posWithItems = await Promise.all(
      results.map(async (result) => {
        const items = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, result.po.id));

        return {
          ...result.po,
          supplier: result.supplier,
          items,
        };
      })
    );

    return posWithItems;
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    throw error;
  }
};

/**
 * Create purchase order
 */
export const createPurchaseOrder = async (data: {
  hospitalId: number;
  supplierId: number;
  poNumber: string;
  orderDate?: Date;
  expectedDeliveryDate?: Date;
  items: Array<{
    medicineCatalogId: number;
    batchNumber?: string;
    expiryDate?: Date;
    quantity: number;
    unit: string;
    unitPrice: number;
  }>;
  notes?: string;
  createdByUserId: number;
}) => {
  try {
    // Calculate totals
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = totalAmount * 0.18; // 18% GST (can be made configurable)
    const finalAmount = totalAmount + taxAmount;

    // Create PO
    const [po] = await db
      .insert(purchaseOrders)
      .values({
        hospitalId: data.hospitalId,
        supplierId: data.supplierId,
        poNumber: data.poNumber,
        orderDate: data.orderDate || new Date(),
        expectedDeliveryDate: data.expectedDeliveryDate,
        status: "pending",
        totalAmount: String(totalAmount),
        taxAmount: String(taxAmount),
        finalAmount: String(finalAmount),
        notes: data.notes,
        createdByUserId: data.createdByUserId,
        createdAt: new Date(),
      })
      .returning();

    // Create PO items
    const items = await Promise.all(
      data.items.map((item) =>
        db
          .insert(purchaseOrderItems)
          .values({
            purchaseOrderId: po.id,
            medicineCatalogId: item.medicineCatalogId,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.quantity * item.unitPrice),
            createdAt: new Date(),
          })
          .returning()
      )
    );

    return { ...po, items };
  } catch (error) {
    console.error("Error creating purchase order:", error);
    throw error;
  }
};

/**
 * Receive purchase order (add stock to inventory)
 */
export const receivePurchaseOrder = async (data: {
  purchaseOrderId: number;
  hospitalId: number;
  receivedByUserId: number;
  items: Array<{
    itemId: number;
    receivedQuantity: number;
  }>;
}) => {
  try {
    // Update PO status
    await db
      .update(purchaseOrders)
      .set({
        status: "received",
        receivedByUserId: data.receivedByUserId,
        receivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(purchaseOrders.id, data.purchaseOrderId),
          eq(purchaseOrders.hospitalId, data.hospitalId)
        )
      );

    // Update received quantities and add to inventory
    for (const item of data.items) {
      const [poItem] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, item.itemId))
        .limit(1);

      if (!poItem) continue;

      await db
        .update(purchaseOrderItems)
        .set({
          receivedQuantity: item.receivedQuantity,
        })
        .where(eq(purchaseOrderItems.id, item.itemId));

      // Add to inventory
      const { addStock } = await import("./pharmacy-inventory.service");
      await addStock({
        hospitalId: data.hospitalId,
        medicineCatalogId: poItem.medicineCatalogId,
        batchNumber: poItem.batchNumber || `BATCH-${Date.now()}`,
        expiryDate: poItem.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
        quantity: item.receivedQuantity,
        unit: poItem.unit,
        purchasePrice: parseFloat(poItem.unitPrice),
        referenceType: "purchase_order",
        referenceId: data.purchaseOrderId,
        reason: "Purchase order received",
        performedByUserId: data.receivedByUserId,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error receiving purchase order:", error);
    throw error;
  }
};
