import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import {
  db,
  pipelineEntriesTable,
  pipelineEventsTable,
  outreachMessagesTable,
} from "@workspace/db";
import { generateId } from "../lib/id";
import { validateBody } from "../lib/validate";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const STAGES = ["New", "Contacted", "Interested", "Negotiating", "Active", "Rejected"] as const;

const CreatePipelineEntrySchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1),
  creatorId: z.string().min(1),
  stage: z.enum(STAGES).default("New"),
  notes: z.string().max(2000).optional().nullable(),
  proposedRate: z.number().positive().optional().nullable(),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
});

const UpdatePipelineEntrySchema = z.object({
  stage: z.enum(STAGES).optional(),
  notes: z.string().max(2000).optional().nullable(),
  proposedRate: z.number().positive().optional().nullable(),
  agreedRate: z.number().positive().optional().nullable(),
  dealType: z.string().max(100).optional().nullable(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  stageNote: z.string().max(500).optional(), // Written to pipeline_events
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/pipeline */
router.get("/", async (req, res, next) => {
  try {
    let rows = await db.select().from(pipelineEntriesTable);
    const { productId, creatorId, stage } = req.query;
    if (productId && typeof productId === "string") {
      rows = rows.filter((r) => r.productId === productId);
    }
    if (creatorId && typeof creatorId === "string") {
      rows = rows.filter((r) => r.creatorId === creatorId);
    }
    if (stage && typeof stage === "string") {
      rows = rows.filter((r) => r.stage === stage);
    }
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

/** GET /api/pipeline/:id */
router.get("/:id", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, String(req.params.id)))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Pipeline entry not found" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** POST /api/pipeline */
router.post("/", validateBody(CreatePipelineEntrySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreatePipelineEntrySchema>;
    const id = body.id ?? generateId("pipe");
    const now = new Date();

    await db.insert(pipelineEntriesTable).values({
      id,
      productId: body.productId,
      creatorId: body.creatorId,
      stage: body.stage,
      notes: body.notes ?? null,
      proposedRate: body.proposedRate ?? null,
      priority: body.priority,
      createdAt: now,
      updatedAt: now,
    });

    // Log initial pipeline event
    await db.insert(pipelineEventsTable).values({
      id: generateId("evt"),
      pipelineEntryId: id,
      fromStage: null,
      toStage: body.stage,
      note: "Entry created",
      changedAt: now,
    });

    const rows = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, id))
      .limit(1);

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/pipeline/:id */
router.put("/:id", validateBody(UpdatePipelineEntrySchema), async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Pipeline entry not found" });
      return;
    }

    const current = existing[0];
    const body = req.body as z.infer<typeof UpdatePipelineEntrySchema>;
    const now = new Date();

    // If stage is changing, log an event
    if (body.stage && body.stage !== current.stage) {
      await db.insert(pipelineEventsTable).values({
        id: generateId("evt"),
        pipelineEntryId: String(req.params.id),
        fromStage: current.stage,
        toStage: body.stage,
        note: body.stageNote ?? null,
        changedAt: now,
      });
    }

    const { stageNote: _stageNote, ...updateFields } = body;
    await db
      .update(pipelineEntriesTable)
      .set({ ...updateFields, updatedAt: now })
      .where(eq(pipelineEntriesTable.id, String(req.params.id)));

    const updated = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, String(req.params.id)))
      .limit(1);

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/pipeline/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Pipeline entry not found" });
      return;
    }

    await db
      .delete(pipelineEntriesTable)
      .where(eq(pipelineEntriesTable.id, String(req.params.id)));

    res.json({ success: true, deleted: String(req.params.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
