import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  partnerTargetsTable,
  insertPartnerTargetSchema,
  type PartnerTargetStatus,
} from "@workspace/db";

const router: IRouter = Router();

// GET /targets — list all, with optional ?productId, ?status, ?partnerCategory
router.get("/targets", async (req, res) => {
  const { productId, status, partnerCategory } = req.query as Record<
    string,
    string | undefined
  >;

  const rows = await db
    .select()
    .from(partnerTargetsTable)
    .where(
      and(
        productId ? eq(partnerTargetsTable.productId, productId) : undefined,
        status
          ? eq(
              partnerTargetsTable.status,
              status as PartnerTargetStatus,
            )
          : undefined,
        partnerCategory
          ? eq(partnerTargetsTable.partnerCategory, partnerCategory)
          : undefined,
      ),
    )
    .orderBy(partnerTargetsTable.createdAt);

  res.json(rows);
});

// GET /targets/:id
router.get("/targets/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .select()
    .from(partnerTargetsTable)
    .where(eq(partnerTargetsTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Target not found" });
    return;
  }
  res.json(rows[0]);
});

// POST /targets
router.post("/targets", async (req, res) => {
  const parsed = insertPartnerTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [target] = await db
    .insert(partnerTargetsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(target);
});

// PUT /targets/:id
router.put("/targets/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = insertPartnerTargetSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const rows = await db
    .update(partnerTargetsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(partnerTargetsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Target not found" });
    return;
  }
  res.json(rows[0]);
});

// DELETE /targets/:id
router.delete("/targets/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .delete(partnerTargetsTable)
    .where(eq(partnerTargetsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Target not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
