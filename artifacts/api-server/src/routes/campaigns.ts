import { Router } from "express";
import { db } from "@workspace/db";
import {
  campaignsTable,
  campaignCreatorsTable,
  productsTable,
  partnerTargetsTable,
  outreachOperationsTable,
  creatorPerformanceTable,
} from "@workspace/db/schema";
import { eq, inArray, sql } from "drizzle-orm";

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

  // Outreach rollup for creator names in this campaign
  const creatorNames = creators.map((cc) => cc.creatorName);
  let outreachRows: (typeof outreachOperationsTable.$inferSelect)[] = [];
  if (creatorNames.length > 0) {
    outreachRows = await db
      .select()
      .from(outreachOperationsTable)
      .where(inArray(outreachOperationsTable.creatorName, creatorNames));
  }

  const sent = outreachRows.filter((o) =>
    ["sent", "replied", "interested", "negotiating", "converted"].includes(
      o.outreachStatus,
    ),
  ).length;
  const replied = outreachRows.filter((o) =>
    ["replied", "interested", "negotiating", "converted"].includes(
      o.outreachStatus,
    ),
  ).length;
  const interested = outreachRows.filter((o) =>
    ["interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const negotiating = outreachRows.filter((o) =>
    ["negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const converted = outreachRows.filter(
    (o) => o.outreachStatus === "converted",
  ).length;

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
    return {
      ...cc,
      targetStatus: target?.status ?? null,
      contactReadiness: null as number | null,
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
  const { name, productId, objective, budget, targetCreatorCount, description, startDate, endDate, status } =
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
  if (body.estimatedValue !== undefined)
    patch.estimatedValue = toNum(body.estimatedValue);
  if (body.actualValue !== undefined)
    patch.actualValue = toNum(body.actualValue);
  if (body.notes !== undefined) patch.notes = toStr(body.notes) || null;

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

export default router;
