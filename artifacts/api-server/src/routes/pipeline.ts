import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  pipelineEntriesTable,
  pipelineEventsTable,
  insertPipelineEntrySchema,
  insertPipelineEventSchema,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/pipeline", async (req, res) => {
  const { productId, creatorId } = req.query as Record<string, string | undefined>;

  let rows;
  if (productId && creatorId) {
    rows = await db
      .select()
      .from(pipelineEntriesTable)
      .where(
        and(
          eq(pipelineEntriesTable.productId, productId),
          eq(pipelineEntriesTable.creatorId, creatorId),
        ),
      );
  } else if (productId) {
    rows = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.productId, productId));
  } else if (creatorId) {
    rows = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.creatorId, creatorId));
  } else {
    rows = await db
      .select()
      .from(pipelineEntriesTable)
      .orderBy(pipelineEntriesTable.updatedAt);
  }

  res.json(rows);
});

router.get("/pipeline/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .select()
    .from(pipelineEntriesTable)
    .where(eq(pipelineEntriesTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Pipeline entry not found" });
    return;
  }
  res.json(rows[0]);
});

router.get("/pipeline/:id/events", async (req, res) => {
  const { id } = req.params;
  const events = await db
    .select()
    .from(pipelineEventsTable)
    .where(eq(pipelineEventsTable.pipelineEntryId, id))
    .orderBy(pipelineEventsTable.createdAt);
  res.json(events);
});

router.post("/pipeline", async (req, res) => {
  const parsed = insertPipelineEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [entry] = await db
    .insert(pipelineEntriesTable)
    .values(parsed.data)
    .returning();

  await db.insert(pipelineEventsTable).values({
    pipelineEntryId: entry.id,
    fromStage: null,
    toStage: entry.stage,
    notes: "Entry created",
  });

  res.status(201).json(entry);
});

router.put("/pipeline/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = insertPipelineEntrySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const existing = await db
    .select()
    .from(pipelineEntriesTable)
    .where(eq(pipelineEntriesTable.id, id));
  if (existing.length === 0) {
    res.status(404).json({ error: "Pipeline entry not found" });
    return;
  }

  const prev = existing[0];
  const [updated] = await db
    .update(pipelineEntriesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(pipelineEntriesTable.id, id))
    .returning();

  if (parsed.data.stage && parsed.data.stage !== prev.stage) {
    await db.insert(pipelineEventsTable).values({
      pipelineEntryId: id,
      fromStage: prev.stage,
      toStage: parsed.data.stage,
      notes: (req.body as { stageNote?: string }).stageNote ?? null,
    });
  }

  res.json(updated);
});

router.post("/pipeline/:id/events", async (req, res) => {
  const { id } = req.params;
  const parsed = insertPipelineEventSchema
    .omit({ pipelineEntryId: true })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [event] = await db
    .insert(pipelineEventsTable)
    .values({ ...parsed.data, pipelineEntryId: id })
    .returning();
  res.status(201).json(event);
});

router.delete("/pipeline/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .delete(pipelineEntriesTable)
    .where(eq(pipelineEntriesTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Pipeline entry not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
