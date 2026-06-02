import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, persistDb, schema } from "../db";
import { validateBody } from "../lib/validate";
import { generateId } from "../lib/id";

const router = Router();
const { pipelineItems, outreachMessages } = schema;

// ─── Allowed Statuses ─────────────────────────────────────────────────────────

const PIPELINE_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Negotiating",
  "Active",
  "Rejected",
] as const;

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreatePipelineSchema = z.object({
  productId: z.string().min(1),
  creatorId: z.string().min(1),
  status: z.enum(PIPELINE_STATUSES).default("New"),
  notes: z.string().max(2000).optional().nullable(),
  proposedRate: z.number().positive().optional().nullable(),
  agreedRate: z.number().positive().optional().nullable(),
  campaignBrief: z.string().max(5000).optional().nullable(),
  expectedDeliveryDate: z.string().datetime().optional().nullable(),
  priority: z.number().int().min(0).max(10).default(0),
});

const UpdatePipelineSchema = CreatePipelineSchema.partial();

const CreateOutreachSchema = z.object({
  pipelineItemId: z.string().min(1),
  creatorId: z.string().min(1),
  productId: z.string().min(1),
  subject: z.string().max(500).optional().nullable(),
  body: z.string().min(1).max(10000),
  channel: z.enum(["email", "dm", "platform"]).default("email"),
  direction: z.enum(["outbound", "inbound"]).default("outbound"),
  status: z.enum(["draft", "sent", "delivered", "read", "replied"]).default("draft"),
  sentAt: z.string().datetime().optional().nullable(),
});

// ─── Pipeline Routes ──────────────────────────────────────────────────────────

/** GET /api/pipeline */
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { productId, creatorId, status } = req.query;
    let rows = db.select().from(pipelineItems).all();

    if (productId && typeof productId === "string") {
      rows = rows.filter((r) => r.productId === productId);
    }
    if (creatorId && typeof creatorId === "string") {
      rows = rows.filter((r) => r.creatorId === creatorId);
    }
    if (status && typeof status === "string") {
      rows = rows.filter((r) => r.status === status);
    }

    res.json({ data: rows.map(deserializePipeline), count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pipeline", detail: String(err) });
  }
});

/** GET /api/pipeline/messages/all */
router.get("/messages/all", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.select().from(outreachMessages).all();
    res.json({ data: rows.map(deserializeMessage), count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages", detail: String(err) });
  }
});

/** GET /api/pipeline/:id */
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.select().from(pipelineItems).where(eq(pipelineItems.id, req.params.id)).get();
    if (!row) {
      res.status(404).json({ error: "Pipeline item not found" });
      return;
    }
    res.json({ data: deserializePipeline(row) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pipeline item", detail: String(err) });
  }
});

/** POST /api/pipeline */
router.post("/", validateBody(CreatePipelineSchema), (req, res) => {
  try {
    const db = getDb();
    const body = req.body as z.infer<typeof CreatePipelineSchema>;
    const now = Date.now();
    const item = {
      id: generateId("pipe"),
      productId: body.productId,
      creatorId: body.creatorId,
      status: body.status,
      notes: body.notes ?? null,
      proposedRate: body.proposedRate ?? null,
      agreedRate: body.agreedRate ?? null,
      campaignBrief: body.campaignBrief ?? null,
      expectedDeliveryDate: body.expectedDeliveryDate
        ? new Date(body.expectedDeliveryDate).getTime()
        : null,
      priority: body.priority,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(pipelineItems).values(item).run();
    persistDb();
    const created = db.select().from(pipelineItems).where(eq(pipelineItems.id, item.id)).get()!;
    res.status(201).json({ data: deserializePipeline(created) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create pipeline item", detail: String(err) });
  }
});

/** PUT /api/pipeline/:id */
router.put("/:id", validateBody(UpdatePipelineSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(pipelineItems).where(eq(pipelineItems.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Pipeline item not found" });
      return;
    }
    const body = req.body as z.infer<typeof UpdatePipelineSchema>;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    const directFields = [
      "productId", "creatorId", "status", "notes",
      "proposedRate", "agreedRate", "campaignBrief", "priority",
    ] as const;

    for (const field of directFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    if (body.expectedDeliveryDate !== undefined) {
      updates.expectedDeliveryDate = body.expectedDeliveryDate
        ? new Date(body.expectedDeliveryDate).getTime()
        : null;
    }

    db.update(pipelineItems).set(updates).where(eq(pipelineItems.id, req.params.id)).run();
    persistDb();
    const updated = db.select().from(pipelineItems).where(eq(pipelineItems.id, req.params.id)).get()!;
    res.json({ data: deserializePipeline(updated) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update pipeline item", detail: String(err) });
  }
});

/** DELETE /api/pipeline/:id */
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(pipelineItems).where(eq(pipelineItems.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Pipeline item not found" });
      return;
    }
    db.delete(pipelineItems).where(eq(pipelineItems.id, req.params.id)).run();
    persistDb();
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete pipeline item", detail: String(err) });
  }
});

/** GET /api/pipeline/:id/messages */
router.get("/:id/messages", (req, res) => {
  try {
    const db = getDb();
    const rows = db
      .select()
      .from(outreachMessages)
      .where(eq(outreachMessages.pipelineItemId, req.params.id))
      .all();
    res.json({ data: rows.map(deserializeMessage), count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages", detail: String(err) });
  }
});

/** POST /api/pipeline/:id/messages */
router.post("/:id/messages", validateBody(CreateOutreachSchema), (req, res) => {
  try {
    const db = getDb();
    const body = req.body as z.infer<typeof CreateOutreachSchema>;
    const now = Date.now();
    const msg = {
      id: generateId("msg"),
      pipelineItemId: body.pipelineItemId,
      creatorId: body.creatorId,
      productId: body.productId,
      subject: body.subject ?? null,
      body: body.body,
      channel: body.channel,
      direction: body.direction,
      status: body.status,
      sentAt: body.sentAt ? new Date(body.sentAt).getTime() : null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(outreachMessages).values(msg).run();
    persistDb();
    const created = db.select().from(outreachMessages).where(eq(outreachMessages.id, msg.id)).get()!;
    res.status(201).json({ data: deserializeMessage(created) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create message", detail: String(err) });
  }
});

// ─── Serialization ────────────────────────────────────────────────────────────

function tsToIso(ts: unknown): string | null {
  if (typeof ts === "number") return new Date(ts).toISOString();
  if (ts === null || ts === undefined) return null;
  return String(ts);
}

function deserializePipeline(row: typeof pipelineItems.$inferSelect) {
  return {
    ...row,
    createdAt: tsToIso(row.createdAt)!,
    updatedAt: tsToIso(row.updatedAt)!,
    expectedDeliveryDate: tsToIso(row.expectedDeliveryDate),
  };
}

function deserializeMessage(row: typeof outreachMessages.$inferSelect) {
  return {
    ...row,
    sentAt: tsToIso(row.sentAt),
    createdAt: tsToIso(row.createdAt)!,
    updatedAt: tsToIso(row.updatedAt)!,
  };
}

export default router;
