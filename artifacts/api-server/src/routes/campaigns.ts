import { Router } from "express";
import { db } from "@workspace/db";
import {
  campaignsTable,
  campaignCreatorsTable,
  productsTable,
  partnerTargetsTable,
  outreachOperationsTable,
  creatorPerformanceTable,
  type CampaignType,
  type DeliverableType,
  type ExclusivityType,
  type ExclusivityStatus,
} from "@workspace/db/schema";
import { eq, inArray, or, sql } from "drizzle-orm";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── GET /api/campaigns/metrics ───────────────────────────────────────────────
// Must be registered BEFORE /:id

router.get("/campaigns/metrics", async (req, res) => {
  const campaigns = await db.select().from(campaignsTable);
  const creators = await db.select().from(campaignCreatorsTable);

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const budgetAllocated = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);

  const activeCreators = creators.filter(
    (cc) => cc.assignmentStatus !== "declined",
  );
  const budgetCommitted = activeCreators.reduce(
    (s, cc) => s + (cc.estimatedValue ?? 0),
    0,
  );
  const budgetUsed = activeCreators.reduce(
    (s, cc) => s + (cc.actualValue ?? 0),
    0,
  );
  const creatorsAssigned = activeCreators.length;

  let campaignRoi = 0;
  if (budgetUsed > 0) {
    campaignRoi = Math.round((budgetUsed / budgetCommitted) * 100);
  }

  res.json({
    totalCampaigns,
    activeCampaigns,
    budgetAllocated,
    budgetCommitted,
    budgetUsed,
    creatorsAssigned,
    campaignRoi,
  });
});

// ─── GET /api/campaigns/eligible-targets ─────────────────────────────────────
// Must be registered BEFORE /campaigns/:id

router.get("/campaigns/eligible-targets", async (req, res) => {
  const { productId, campaignId } = req.query as Record<string, string | undefined>;

  let allTargets = await db.select().from(partnerTargetsTable);
  if (productId) {
    allTargets = allTargets.filter((t) => t.productId === productId);
  }

  // Exclude already-assigned targets if campaignId provided
  const assignedTargetIds = new Set<string>();
  if (campaignId) {
    const existing = await db
      .select({ targetId: campaignCreatorsTable.targetId })
      .from(campaignCreatorsTable)
      .where(eq(campaignCreatorsTable.campaignId, campaignId));
    for (const e of existing) {
      if (e.targetId) assignedTargetIds.add(e.targetId);
    }
  }

  const targetIds = allTargets.map((t) => t.id);

  // Per-target: most-recent outreach op
  const outreachByTarget = new Map<string, typeof outreachOperationsTable.$inferSelect>();
  if (targetIds.length > 0) {
    const ops = await db
      .select()
      .from(outreachOperationsTable)
      .where(inArray(outreachOperationsTable.targetId, targetIds));
    for (const op of ops) {
      if (!op.targetId) continue;
      const prev = outreachByTarget.get(op.targetId);
      if (!prev || op.createdAt > prev.createdAt) {
        outreachByTarget.set(op.targetId, op);
      }
    }
  }

  // Per-target: performance scores
  const perfByTarget = new Map<string, typeof creatorPerformanceTable.$inferSelect>();
  if (targetIds.length > 0) {
    const perfs = await db
      .select()
      .from(creatorPerformanceTable)
      .where(inArray(creatorPerformanceTable.targetId, targetIds));
    for (const p of perfs) {
      if (p.targetId && !perfByTarget.has(p.targetId)) {
        perfByTarget.set(p.targetId, p);
      }
    }
  }

  const result = allTargets
    .filter((t) => !assignedTargetIds.has(t.id))
    .map((t) => {
      const op = outreachByTarget.get(t.id);
      const perf = perfByTarget.get(t.id);
      return {
        ...t,
        partnerFitScore: perf?.partnerFitScore ?? null,
        contactReadinessScore: perf?.contactReadinessScore ?? null,
        outreachStatus: op?.outreachStatus ?? null,
        contactMethod: op?.contactMethod ?? null,
      };
    });

  res.json(result);
});

// ─── GET /api/campaigns ───────────────────────────────────────────────────────

router.get("/campaigns", async (req, res) => {
  const rows = await db.select().from(campaignsTable).orderBy(
    sql`${campaignsTable.createdAt} desc`,
  );

  const products = await db.select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const creators = await db.select().from(campaignCreatorsTable);
  const creatorsByCampaign = new Map<string, typeof creators>();
  for (const cc of creators) {
    const arr = creatorsByCampaign.get(cc.campaignId) ?? [];
    arr.push(cc);
    creatorsByCampaign.set(cc.campaignId, arr);
  }

  const result = rows.map((c) => {
    const ccs = creatorsByCampaign.get(c.id) ?? [];
    const active = ccs.filter((cc) => cc.assignmentStatus !== "declined");
    return {
      ...c,
      productName: c.productId ? (productMap.get(c.productId) ?? null) : null,
      creatorsCount: active.length,
      budgetCommitted: active.reduce((s, cc) => s + (cc.estimatedValue ?? 0), 0),
      budgetUsed: active.reduce((s, cc) => s + (cc.actualValue ?? 0), 0),
    };
  });

  res.json(result);
});

// ─── GET /api/campaigns/:id/timeline ──────────────────────────────────────────
// Must be registered BEFORE /:id

router.get("/campaigns/:id/timeline", async (req, res) => {
  const { id } = req.params;
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const creators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id));

  // Collect all target IDs and creator names for outreach lookups
  const targetIds = creators.map((cc) => cc.targetId).filter((t): t is string => !!t);
  const creatorNames = creators.map((cc) => cc.creatorName);

  // Fetch outreach ops — prefer targetId matching, fall back to name
  let outreachRows: (typeof outreachOperationsTable.$inferSelect)[] = [];
  if (targetIds.length > 0 || creatorNames.length > 0) {
    const conditions = [];
    if (targetIds.length > 0) conditions.push(inArray(outreachOperationsTable.targetId, targetIds));
    if (creatorNames.length > 0) conditions.push(inArray(outreachOperationsTable.creatorName, creatorNames));
    outreachRows = await db
      .select()
      .from(outreachOperationsTable)
      .where(or(...conditions));
  }

  type TimelineEvent = {
    id: string;
    type: string;
    label: string;
    detail: string | null;
    date: string;
  };

  const events: TimelineEvent[] = [];

  // Campaign created
  events.push({
    id: `campaign-created-${campaign.id}`,
    type: "campaign_created",
    label: "Campaign created",
    detail: campaign.name,
    date: campaign.createdAt.toISOString(),
  });

  // Creator assigned events
  for (const cc of creators) {
    events.push({
      id: `creator-assigned-${cc.id}`,
      type: "creator_assigned",
      label: `${cc.creatorName} assigned`,
      detail: cc.assignmentStatus.charAt(0).toUpperCase() + cc.assignmentStatus.slice(1),
      date: cc.createdAt.toISOString(),
    });
    // If status changed from identified, also record that
    if (cc.updatedAt > cc.createdAt) {
      events.push({
        id: `creator-updated-${cc.id}`,
        type: "creator_status_changed",
        label: `${cc.creatorName} → ${cc.assignmentStatus}`,
        detail: null,
        date: cc.updatedAt.toISOString(),
      });
    }
  }

  // Outreach events — deduplicate by op id to avoid name+targetId double-matching
  const seenOpIds = new Set<string>();
  for (const op of outreachRows) {
    if (seenOpIds.has(op.id)) continue;
    seenOpIds.add(op.id);

    if (op.sentAt) {
      events.push({
        id: `outreach-sent-${op.id}`,
        type: "outreach_sent",
        label: `Outreach sent to ${op.creatorName}`,
        detail: op.contactMethod,
        date: op.sentAt.toISOString(),
      });
    }
    if (op.repliedAt) {
      events.push({
        id: `outreach-replied-${op.id}`,
        type: "outreach_replied",
        label: `${op.creatorName} replied`,
        detail: op.outreachStatus.charAt(0).toUpperCase() + op.outreachStatus.slice(1),
        date: op.repliedAt.toISOString(),
      });
    }
    if (
      !op.sentAt && !op.repliedAt &&
      ["interested", "negotiating", "converted"].includes(op.outreachStatus) &&
      op.lastActivityAt
    ) {
      events.push({
        id: `outreach-activity-${op.id}`,
        type: "outreach_activity",
        label: `${op.creatorName}: ${op.outreachStatus}`,
        detail: op.contactMethod,
        date: op.lastActivityAt.toISOString(),
      });
    }
  }

  // Sort chronologically, newest first
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json(events);
});

// ─── GET /api/campaigns/:id/creators ──────────────────────────────────────────
// Must be registered BEFORE /campaigns/:id

router.get("/campaigns/:id/creators", async (req, res) => {
  const { id } = req.params;
  const creators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id))
    .orderBy(sql`${campaignCreatorsTable.createdAt} asc`);
  res.json(creators);
});

// ─── GET /api/campaigns/:id ───────────────────────────────────────────────────

router.get("/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));

  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const products = await db
    .select({ id: productsTable.id, name: productsTable.name })
    .from(productsTable);
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  const creators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id))
    .orderBy(sql`${campaignCreatorsTable.createdAt} asc`);

  // Enrich creators with target data (contact readiness, partner fit)
  const targetIds = creators
    .map((cc) => cc.targetId)
    .filter((t): t is string => !!t);

  const targets =
    targetIds.length > 0
      ? await db
          .select()
          .from(partnerTargetsTable)
          .where(inArray(partnerTargetsTable.id, targetIds))
      : [];
  const targetMap = new Map(targets.map((t) => [t.id, t]));

  // Outreach rollup — prefer targetId matching (stable), fall back to name
  const creatorNames = creators.map((cc) => cc.creatorName);
  let outreachRows: (typeof outreachOperationsTable.$inferSelect)[] = [];

  if (targetIds.length > 0 || creatorNames.length > 0) {
    const conditions = [];
    if (targetIds.length > 0) conditions.push(inArray(outreachOperationsTable.targetId, targetIds));
    if (creatorNames.length > 0) conditions.push(inArray(outreachOperationsTable.creatorName, creatorNames));
    outreachRows = await db
      .select()
      .from(outreachOperationsTable)
      .where(or(...conditions));
  }

  // Deduplicate outreach rows (a creator could match by both targetId and name)
  const seenOps = new Set<string>();
  const dedupedOutreach = outreachRows.filter((o) => {
    if (seenOps.has(o.id)) return false;
    seenOps.add(o.id);
    return true;
  });

  const sent = dedupedOutreach.filter((o) =>
    ["sent", "replied", "interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const replied = dedupedOutreach.filter((o) =>
    ["replied", "interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const interested = dedupedOutreach.filter((o) =>
    ["interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const negotiating = dedupedOutreach.filter((o) =>
    ["negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const converted = dedupedOutreach.filter(
    (o) => o.outreachStatus === "converted",
  ).length;

  // Per-creator outreach count (stable: by targetId where available, else by name)
  const outreachByTarget = new Map<string, number>();
  const outreachByName = new Map<string, number>();
  for (const op of dedupedOutreach) {
    if (op.targetId) {
      outreachByTarget.set(op.targetId, (outreachByTarget.get(op.targetId) ?? 0) + 1);
    } else {
      outreachByName.set(op.creatorName, (outreachByName.get(op.creatorName) ?? 0) + 1);
    }
  }

  // Performance revenue rollup
  let totalRevenue = 0;
  if (creatorNames.length > 0) {
    const perfRows = await db
      .select()
      .from(creatorPerformanceTable)
      .where(inArray(creatorPerformanceTable.creatorName, creatorNames));
    totalRevenue = perfRows.reduce(
      (s, r) => s + (r.actualRevenue ?? 0),
      0,
    );
  }

  const active = creators.filter((cc) => cc.assignmentStatus !== "declined");
  const budgetCommitted = active.reduce(
    (s, cc) => s + (cc.estimatedValue ?? 0),
    0,
  );
  const budgetUsed = active.reduce((s, cc) => s + (cc.actualValue ?? 0), 0);

  const enrichedCreators = creators.map((cc) => {
    const target = cc.targetId ? targetMap.get(cc.targetId) : null;
    const outreachCount =
      (cc.targetId ? (outreachByTarget.get(cc.targetId) ?? 0) : 0) +
      (!cc.targetId ? (outreachByName.get(cc.creatorName) ?? 0) : 0);
    return {
      ...cc,
      targetStatus: target?.status ?? null,
      contactReadiness: null as number | null,
      outreachCount,
    };
  });

  res.json({
    ...campaign,
    productName: campaign.productId
      ? (productMap.get(campaign.productId) ?? null)
      : null,
    creators: enrichedCreators,
    outreachRollup: { sent, replied, interested, negotiating, converted },
    budgetCommitted,
    budgetUsed,
    totalRevenue,
  });
});

// ─── POST /api/campaigns ──────────────────────────────────────────────────────

router.post("/campaigns", async (req, res) => {
  const { name, productId, objective, campaignType, budget, targetCreatorCount, description, startDate, endDate, status } =
    req.body as Record<string, unknown>;

  if (!toStr(name)) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!toStr(objective)) {
    res.status(400).json({ error: "objective is required" });
    return;
  }

  const [created] = await db
    .insert(campaignsTable)
    .values({
      name: toStr(name),
      productId: toStr(productId) || null,
      objective: toStr(objective),
      campaignType: (toStr(campaignType) as CampaignType) || "custom",
      budget: toNum(budget),
      targetCreatorCount: toNum(targetCreatorCount),
      description: toStr(description) || null,
      startDate: startDate ? new Date(toStr(startDate)) : null,
      endDate: endDate ? new Date(toStr(endDate)) : null,
      status: (toStr(status) as "planning") || "planning",
      assignedCreatorCount: 0,
    })
    .returning();

  res.status(201).json(created);
});

// ─── PATCH /api/campaigns/:id ─────────────────────────────────────────────────

router.patch("/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: Partial<typeof campaignsTable.$inferInsert> = {};

  if (body.name !== undefined) patch.name = toStr(body.name);
  if (body.productId !== undefined)
    patch.productId = toStr(body.productId) || null;
  if (body.objective !== undefined) patch.objective = toStr(body.objective);
  if (body.description !== undefined)
    patch.description = toStr(body.description) || null;
  if (body.campaignType !== undefined)
    patch.campaignType = body.campaignType as CampaignType;
  if (body.budget !== undefined) patch.budget = toNum(body.budget);
  if (body.targetCreatorCount !== undefined)
    patch.targetCreatorCount = toNum(body.targetCreatorCount);
  if (body.status !== undefined)
    patch.status = body.status as typeof campaignsTable.$inferInsert["status"];
  if (body.startDate !== undefined)
    patch.startDate = body.startDate ? new Date(toStr(body.startDate)) : null;
  if (body.endDate !== undefined)
    patch.endDate = body.endDate ? new Date(toStr(body.endDate)) : null;

  patch.updatedAt = new Date();

  const [updated] = await db
    .update(campaignsTable)
    .set(patch)
    .where(eq(campaignsTable.id, id))
    .returning();

  res.json(updated);
});

// ─── DELETE /api/campaigns/:id ────────────────────────────────────────────────

router.delete("/campaigns/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  await db.delete(campaignsTable).where(eq(campaignsTable.id, id));
  res.json({ success: true });
});

// ─── POST /api/campaigns/:id/add-creator ─────────────────────────────────────

router.post("/campaigns/:id/add-creator", async (req, res) => {
  const { id } = req.params;
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const {
    creatorName,
    targetId,
    assignmentStatus,
    deliverables,
    deliverableType,
    deliverableDueDate,
    estimatedValue,
    notes,
  } = req.body as Record<string, unknown>;

  if (!toStr(creatorName)) {
    res.status(400).json({ error: "creatorName is required" });
    return;
  }

  const [created] = await db
    .insert(campaignCreatorsTable)
    .values({
      campaignId: id,
      creatorName: toStr(creatorName),
      targetId: toStr(targetId) || null,
      assignmentStatus:
        (assignmentStatus as "identified") || "identified",
      deliverables: Array.isArray(deliverables) ? (deliverables as string[]) : [],
      deliverableType: (toStr(deliverableType) as DeliverableType) || null,
      deliverableDueDate: deliverableDueDate ? new Date(toStr(deliverableDueDate)) : null,
      estimatedValue: toNum(estimatedValue),
      actualValue: 0,
      notes: toStr(notes) || null,
    })
    .returning();

  // Sync assignedCreatorCount
  const allCreators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id));
  const activeCount = allCreators.filter(
    (cc) => cc.assignmentStatus !== "declined",
  ).length;
  await db
    .update(campaignsTable)
    .set({ assignedCreatorCount: activeCount, updatedAt: new Date() })
    .where(eq(campaignsTable.id, id));

  res.status(201).json(created);
});

// ─── POST /api/campaigns/:id/bulk-add-creators ────────────────────────────────

router.post("/campaigns/:id/bulk-add-creators", async (req, res) => {
  const { id } = req.params;
  const [campaign] = await db
    .select()
    .from(campaignsTable)
    .where(eq(campaignsTable.id, id));
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }

  const { creators: incoming } = req.body as { creators?: unknown[] };
  if (!Array.isArray(incoming) || incoming.length === 0) {
    res.status(400).json({ error: "creators array is required and must not be empty" });
    return;
  }

  // Load existing assignments for this campaign
  const existing = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id));

  const existingTargetIds = new Set(existing.map((cc) => cc.targetId).filter(Boolean));
  const existingNames = new Set(existing.map((cc) => cc.creatorName.toLowerCase()));

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const raw of incoming) {
    const item = raw as Record<string, unknown>;
    const creatorName = toStr(item.creatorName);
    const targetId = toStr(item.targetId) || null;

    if (!creatorName) {
      errors.push("Skipped entry with missing creatorName");
      continue;
    }

    // Duplicate check: prefer targetId match, fall back to name match
    const isDuplicate =
      (targetId && existingTargetIds.has(targetId)) ||
      existingNames.has(creatorName.toLowerCase());

    if (isDuplicate) {
      skipped++;
      continue;
    }

    try {
      await db.insert(campaignCreatorsTable).values({
        campaignId: id,
        creatorName,
        targetId,
        assignmentStatus: "identified",
        deliverables: Array.isArray(item.deliverables)
          ? (item.deliverables as string[])
          : [],
        estimatedValue: toNum(item.estimatedValue),
        actualValue: 0,
        notes: toStr(item.notes) || null,
      });
      existingTargetIds.add(targetId ?? "");
      existingNames.add(creatorName.toLowerCase());
      added++;
    } catch (e) {
      errors.push(`Failed to add ${creatorName}: ${(e as Error).message}`);
    }
  }

  // Sync assignedCreatorCount
  const allCreators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, id));
  const activeCount = allCreators.filter(
    (cc) => cc.assignmentStatus !== "declined",
  ).length;
  await db
    .update(campaignsTable)
    .set({ assignedCreatorCount: activeCount, updatedAt: new Date() })
    .where(eq(campaignsTable.id, id));

  res.json({ added, skipped, errors });
});

// ─── PATCH /api/campaigns/creator/:id ────────────────────────────────────────

router.patch("/campaigns/creator/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Campaign creator not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const patch: Partial<typeof campaignCreatorsTable.$inferInsert> = {};

  if (body.assignmentStatus !== undefined)
    patch.assignmentStatus =
      body.assignmentStatus as typeof campaignCreatorsTable.$inferInsert["assignmentStatus"];
  if (body.deliverables !== undefined)
    patch.deliverables = Array.isArray(body.deliverables)
      ? (body.deliverables as string[])
      : [];
  if (body.deliverableType !== undefined)
    patch.deliverableType = body.deliverableType as DeliverableType;
  if (body.deliverableDueDate !== undefined)
    patch.deliverableDueDate = body.deliverableDueDate
      ? new Date(toStr(body.deliverableDueDate))
      : null;
  if (body.estimatedValue !== undefined)
    patch.estimatedValue = toNum(body.estimatedValue);
  if (body.actualValue !== undefined)
    patch.actualValue = toNum(body.actualValue);
  if (body.notes !== undefined) patch.notes = toStr(body.notes) || null;
  if (body.exclusivityType !== undefined)
    patch.exclusivityType = body.exclusivityType as ExclusivityType;
  if (body.exclusivityStatus !== undefined)
    patch.exclusivityStatus = body.exclusivityStatus as ExclusivityStatus;
  if (body.exclusivityStartDate !== undefined)
    patch.exclusivityStartDate = body.exclusivityStartDate
      ? new Date(toStr(body.exclusivityStartDate))
      : null;
  if (body.exclusivityEndDate !== undefined)
    patch.exclusivityEndDate = body.exclusivityEndDate
      ? new Date(toStr(body.exclusivityEndDate))
      : null;
  if (body.exclusivityNotes !== undefined)
    patch.exclusivityNotes = toStr(body.exclusivityNotes) || null;

  patch.updatedAt = new Date();

  const [updated] = await db
    .update(campaignCreatorsTable)
    .set(patch)
    .where(eq(campaignCreatorsTable.id, id))
    .returning();

  // Sync assignedCreatorCount on parent campaign
  const allCreators = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, existing.campaignId));
  const activeCount = allCreators.filter(
    (cc) => cc.assignmentStatus !== "declined",
  ).length;
  await db
    .update(campaignsTable)
    .set({ assignedCreatorCount: activeCount, updatedAt: new Date() })
    .where(eq(campaignsTable.id, existing.campaignId));

  res.json(updated);
});

// ─── DELETE /api/campaigns/creator/:id ───────────────────────────────────────

router.delete("/campaigns/creator/:id", async (req, res) => {
  const { id } = req.params;
  const [existing] = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Campaign creator not found" });
    return;
  }

  await db.delete(campaignCreatorsTable).where(eq(campaignCreatorsTable.id, id));

  // Sync assignedCreatorCount on parent campaign
  const remaining = await db
    .select()
    .from(campaignCreatorsTable)
    .where(eq(campaignCreatorsTable.campaignId, existing.campaignId));
  const activeCount = remaining.filter(
    (cc) => cc.assignmentStatus !== "declined",
  ).length;
  await db
    .update(campaignsTable)
    .set({ assignedCreatorCount: activeCount, updatedAt: new Date() })
    .where(eq(campaignsTable.id, existing.campaignId));

  res.json({ success: true });
});

export default router;
