import { Router } from "express";
import { db } from "@workspace/db";
import {
  outreachOperationsTable,
  partnerTargetsTable,
  type PartnerTargetStatus,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ─── Status → target status mapping ──────────────────────────────────────────

const STATUS_TO_TARGET: Record<string, string | null> = {
  sent: "Contacted",
  replied: "Replied",
  interested: "Meeting Scheduled",
  negotiating: "Negotiating",
  converted: "Active Partner",
  declined: "Rejected",
};

const VALID_STATUSES = [
  "draft", "ready", "sent", "replied",
  "interested", "negotiating", "converted", "declined", "inactive",
] as const;
type OutreachStatus = typeof VALID_STATUSES[number];

const VALID_PRIORITIES = ["low", "medium", "high"] as const;
type OutreachPriority = typeof VALID_PRIORITIES[number];

const VALID_METHODS = [
  "Email", "Instagram DM", "TikTok DM", "LinkedIn", "Website Contact Form",
] as const;
type OutreachContactMethod = typeof VALID_METHODS[number];

// ─── GET /api/outreach-operations ─────────────────────────────────────────────

router.get("/outreach-operations", async (req, res) => {
  const { productId, status } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(outreachOperationsTable);

  if (productId) rows = rows.filter((r) => r.productId === productId);
  if (status && status !== "all") rows = rows.filter((r) => r.outreachStatus === status);

  rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(rows);
});

// ─── GET /api/outreach-operations/metrics ─────────────────────────────────────

router.get("/outreach-operations/metrics", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(outreachOperationsTable);
  if (productId) rows = rows.filter((r) => r.productId === productId);

  const count = (s: OutreachStatus) => rows.filter((r) => r.outreachStatus === s).length;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const overdue = rows.filter(
    (r) =>
      r.followUpDue &&
      new Date(r.followUpDue) < now &&
      !["converted", "declined", "inactive"].includes(r.outreachStatus),
  ).length;

  const dueToday = rows.filter(
    (r) =>
      r.followUpDue &&
      new Date(r.followUpDue) >= now &&
      new Date(r.followUpDue) <= todayEnd &&
      !["converted", "declined", "inactive"].includes(r.outreachStatus),
  ).length;

  const dueThisWeek = rows.filter(
    (r) =>
      r.followUpDue &&
      new Date(r.followUpDue) > todayEnd &&
      new Date(r.followUpDue) <= weekEnd &&
      !["converted", "declined", "inactive"].includes(r.outreachStatus),
  ).length;

  res.json({
    drafts: count("draft"),
    ready: count("ready"),
    sent: count("sent"),
    replied: count("replied"),
    interested: count("interested"),
    negotiating: count("negotiating"),
    converted: count("converted"),
    declined: count("declined"),
    inactive: count("inactive"),
    total: rows.length,
    followUp: { overdue, dueToday, dueThisWeek },
  });
});

// ─── GET /api/outreach-operations/:id ─────────────────────────────────────────

router.get("/outreach-operations/:id", async (req, res) => {
  const [row] = await db
    .select()
    .from(outreachOperationsTable)
    .where(eq(outreachOperationsTable.id, req.params.id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Outreach operation not found" });
    return;
  }
  res.json(row);
});

// ─── POST /api/outreach-operations ────────────────────────────────────────────

router.post("/outreach-operations", async (req, res) => {
  const body = req.body as {
    creatorName?: string;
    contactMethod?: string;
    contactDestination?: string;
    outreachSubject?: string;
    outreachMessage?: string;
    outreachStatus?: string;
    priority?: string;
    targetId?: string;
    productId?: string;
    notes?: string;
    followUpDue?: string;
  };

  if (!body.creatorName || !body.contactMethod) {
    res.status(400).json({ error: "creatorName and contactMethod required" });
    return;
  }

  if (!VALID_METHODS.includes(body.contactMethod as OutreachContactMethod)) {
    res.status(400).json({ error: `contactMethod must be one of: ${VALID_METHODS.join(", ")}` });
    return;
  }

  const status = (VALID_STATUSES.includes(body.outreachStatus as OutreachStatus)
    ? body.outreachStatus
    : "draft") as OutreachStatus;

  const priority = (VALID_PRIORITIES.includes(body.priority as OutreachPriority)
    ? body.priority
    : "medium") as OutreachPriority;

  const [record] = await db
    .insert(outreachOperationsTable)
    .values({
      creatorName: body.creatorName,
      contactMethod: body.contactMethod as OutreachContactMethod,
      contactDestination: body.contactDestination ?? null,
      outreachSubject: body.outreachSubject ?? null,
      outreachMessage: body.outreachMessage ?? null,
      outreachStatus: status,
      priority,
      targetId: body.targetId ?? null,
      productId: body.productId ?? null,
      notes: body.notes ?? null,
      followUpDue: body.followUpDue ? new Date(body.followUpDue) : null,
      lastActivityAt: new Date(),
    })
    .returning();

  res.status(201).json(record);
});

// ─── PATCH /api/outreach-operations/:id ───────────────────────────────────────

router.patch("/outreach-operations/:id", async (req, res) => {
  const body = req.body as Partial<{
    outreachStatus: string;
    priority: string;
    notes: string;
    followUpDue: string | null;
    contactDestination: string;
    outreachSubject: string;
    outreachMessage: string;
    contactMethod: string;
  }>;

  const [existing] = await db
    .select()
    .from(outreachOperationsTable)
    .where(eq(outreachOperationsTable.id, req.params.id))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Outreach operation not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date(), lastActivityAt: new Date() };

  if (body.outreachStatus && VALID_STATUSES.includes(body.outreachStatus as OutreachStatus)) {
    updates.outreachStatus = body.outreachStatus as OutreachStatus;

    // Timestamp transitions
    if (body.outreachStatus === "sent" && !existing.sentAt) {
      updates.sentAt = new Date();
    }
    if (body.outreachStatus === "replied" && !existing.repliedAt) {
      updates.repliedAt = new Date();
    }

    // Sync target status when available
    if (existing.targetId) {
      const targetStatus = STATUS_TO_TARGET[body.outreachStatus];
      if (targetStatus) {
        await db
          .update(partnerTargetsTable)
          .set({ status: targetStatus as PartnerTargetStatus, updatedAt: new Date() })
          .where(eq(partnerTargetsTable.id, existing.targetId));
      }
    }
  }

  if (body.priority && VALID_PRIORITIES.includes(body.priority as OutreachPriority)) {
    updates.priority = body.priority as OutreachPriority;
  }
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.contactDestination !== undefined) updates.contactDestination = body.contactDestination;
  if (body.outreachSubject !== undefined) updates.outreachSubject = body.outreachSubject;
  if (body.outreachMessage !== undefined) updates.outreachMessage = body.outreachMessage;
  if (body.contactMethod && VALID_METHODS.includes(body.contactMethod as OutreachContactMethod)) {
    updates.contactMethod = body.contactMethod as OutreachContactMethod;
  }
  if ("followUpDue" in body) {
    updates.followUpDue = body.followUpDue ? new Date(body.followUpDue) : null;
  }

  const [updated] = await db
    .update(outreachOperationsTable)
    .set(updates)
    .where(eq(outreachOperationsTable.id, req.params.id))
    .returning();

  res.json(updated);
});

// ─── DELETE /api/outreach-operations/:id ──────────────────────────────────────

router.delete("/outreach-operations/:id", async (req, res) => {
  const rows = await db
    .delete(outreachOperationsTable)
    .where(eq(outreachOperationsTable.id, req.params.id))
    .returning();

  if (rows.length === 0) {
    res.status(404).json({ error: "Outreach operation not found" });
    return;
  }
  res.json({ deleted: true, id: req.params.id });
});

export default router;
