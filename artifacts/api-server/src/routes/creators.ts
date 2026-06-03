import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  creatorsTable,
  creatorScoresTable,
  insertCreatorSchema,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/creators", async (_req, res) => {
  const creators = await db
    .select()
    .from(creatorsTable)
    .orderBy(creatorsTable.createdAt);
  res.json(creators);
});

router.get("/creators/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .select()
    .from(creatorsTable)
    .where(eq(creatorsTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }
  res.json(rows[0]);
});

router.get("/creators/:id/scores", async (req, res) => {
  const { id } = req.params;
  const scores = await db
    .select()
    .from(creatorScoresTable)
    .where(eq(creatorScoresTable.creatorId, id));
  res.json(scores);
});

router.get("/creators/:id/scores/:productId", async (req, res) => {
  const { id, productId } = req.params;
  const { and } = await import("drizzle-orm");
  const rows = await db
    .select()
    .from(creatorScoresTable)
    .where(
      and(
        eq(creatorScoresTable.creatorId, id),
        eq(creatorScoresTable.productId, productId),
      ),
    );
  if (rows.length === 0) {
    res.status(404).json({ error: "Score not found for this creator/product" });
    return;
  }
  res.json(rows[0]);
});

router.post("/creators", async (req, res) => {
  const parsed = insertCreatorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [creator] = await db
    .insert(creatorsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(creator);
});

router.put("/creators/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = insertCreatorSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const rows = await db
    .update(creatorsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(creatorsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }
  res.json(rows[0]);
});

router.delete("/creators/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .delete(creatorsTable)
    .where(eq(creatorsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Creator not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
