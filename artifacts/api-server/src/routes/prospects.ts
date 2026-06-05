import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  partnerProspectsTable,
  insertPartnerProspectSchema,
  type PartnerProspectStatus,
} from "@workspace/db";

const router: IRouter = Router();

// GET /prospects — list all, with optional ?status, ?partnerCategory
router.get("/prospects", async (req, res) => {
  const { status, partnerCategory } = req.query as Record<
    string,
    string | undefined
  >;

  const rows = await db
    .select()
    .from(partnerProspectsTable)
    .where(
      and(
        status
          ? eq(
              partnerProspectsTable.status,
              status as PartnerProspectStatus,
            )
          : undefined,
        partnerCategory
          ? eq(partnerProspectsTable.partnerCategory, partnerCategory)
          : undefined,
      ),
    )
    .orderBy(partnerProspectsTable.createdAt);

  res.json(rows);
});

// GET /prospects/:id
router.get("/prospects/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .select()
    .from(partnerProspectsTable)
    .where(eq(partnerProspectsTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }
  res.json(rows[0]);
});

// POST /prospects
router.post("/prospects", async (req, res) => {
  const parsed = insertPartnerProspectSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [prospect] = await db
    .insert(partnerProspectsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(prospect);
});

// PUT /prospects/:id
router.put("/prospects/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = insertPartnerProspectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const rows = await db
    .update(partnerProspectsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(partnerProspectsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }
  res.json(rows[0]);
});

// DELETE /prospects/:id
router.delete("/prospects/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .delete(partnerProspectsTable)
    .where(eq(partnerProspectsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
