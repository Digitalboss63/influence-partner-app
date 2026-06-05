import { Router } from "express";
import { db } from "@workspace/db";
import {
  outreachOperationsTable,
  creatorPerformanceTable,
  campaignPerformanceTable,
  performanceGoalsTable,
  productsTable,
} from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

type OutreachOp = typeof outreachOperationsTable.$inferSelect;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 1000) / 10;
}

function aggOps(ops: OutreachOp[]) {
  const sent = ops.filter((o) =>
    ["sent", "replied", "interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const replied = ops.filter((o) =>
    ["replied", "interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const interested = ops.filter((o) =>
    ["interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const negotiations = ops.filter((o) =>
    ["negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const conversions = ops.filter((o) => o.outreachStatus === "converted").length;
  return { total: ops.length, sent, replied, interested, negotiations, conversions };
}

function computeGoalCurrent(
  goalType: string,
  ops: OutreachOp[],
  cpRows: { estimatedRevenue: number | null; actualRevenue: number | null }[],
): number {
  const agg = aggOps(ops);
  switch (goalType) {
    case "creators_contacted": return agg.sent;
    case "replies": return agg.replied;
    case "interested": return agg.interested;
    case "negotiations": return agg.negotiations;
    case "conversions": return agg.conversions;
    case "estimated_revenue":
      return cpRows.reduce((s, r) => s + (r.estimatedRevenue ?? 0), 0);
    case "actual_revenue":
      return cpRows.reduce((s, r) => s + (r.actualRevenue ?? 0), 0);
    default: return 0;
  }
}

function computeGoalStatus(current: number, target: number): "achieved" | "on_track" | "behind" {
  if (current >= target) return "achieved";
  if (target > 0 && current / target >= 0.5) return "on_track";
  return "behind";
}

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

router.get("/reports/summary", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const agg = aggOps(ops);
  const cpRows = await db.select().from(creatorPerformanceTable);
  const filteredCp = productId ? cpRows.filter((r) => r.productId === productId) : cpRows;
  const campRows = await db.select().from(campaignPerformanceTable);
  const filteredCamp = productId ? campRows.filter((r) => r.productId === productId) : campRows;

  const totalEstimatedRevenue = filteredCp.reduce((s, r) => s + (r.estimatedRevenue ?? 0), 0);
  const totalActualRevenue = filteredCp.reduce((s, r) => s + (r.actualRevenue ?? 0), 0);
  const productCount = await db.select().from(productsTable).then((r) => r.length);

  // Period comparison (last 30 days vs prior 30 days)
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const recentOps = ops.filter((o) => new Date(o.createdAt).getTime() > now - thirtyDays);
  const priorOps = ops.filter(
    (o) =>
      new Date(o.createdAt).getTime() > now - 2 * thirtyDays &&
      new Date(o.createdAt).getTime() <= now - thirtyDays,
  );
  const recentAgg = aggOps(recentOps);
  const priorAgg = aggOps(priorOps);

  const replyRateDelta =
    priorAgg.sent > 0
      ? pct(recentAgg.replied, recentAgg.sent) - pct(priorAgg.replied, priorAgg.sent)
      : null;
  const convRateDelta =
    priorAgg.sent > 0
      ? pct(recentAgg.conversions, recentAgg.sent) - pct(priorAgg.conversions, priorAgg.sent)
      : null;

  res.json({
    totalOps: agg.total,
    sent: agg.sent,
    replied: agg.replied,
    interested: agg.interested,
    negotiations: agg.negotiations,
    conversions: agg.conversions,
    replyRate: pct(agg.replied, agg.sent),
    interestedRate: pct(agg.interested, agg.replied),
    conversionRate: pct(agg.conversions, agg.sent),
    totalEstimatedRevenue,
    totalActualRevenue,
    productCount,
    activeCreators: new Set(ops.map((o) => o.creatorName)).size,
    periodComparison: {
      recentSent: recentAgg.sent,
      priorSent: priorAgg.sent,
      recentReplied: recentAgg.replied,
      priorReplied: priorAgg.replied,
      recentConversions: recentAgg.conversions,
      priorConversions: priorAgg.conversions,
      replyRateDelta,
      convRateDelta,
    },
  });
});

// ─── GET /api/reports/trends ──────────────────────────────────────────────────

router.get("/reports/trends", async (req, res) => {
  const { productId, months = "6" } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const numMonths = Math.min(parseInt(months ?? "6", 10), 12);
  const now = new Date();

  // Build last N month buckets
  const buckets: Array<{ period: string; label: string }> = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    buckets.push({ period, label });
  }

  const byMonth = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    const d = new Date(op.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(op);
  }

  const trends = buckets.map(({ period, label }) => {
    const monthOps = byMonth.get(period) ?? [];
    const agg = aggOps(monthOps);
    return {
      period,
      label,
      contacted: agg.sent,
      replied: agg.replied,
      interested: agg.interested,
      converted: agg.conversions,
      total: agg.total,
    };
  });

  res.json(trends);
});

// ─── GET /api/reports/insights ────────────────────────────────────────────────

router.get("/reports/insights", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const goals = await db.select().from(performanceGoalsTable);
  const cpRows = await db.select().from(creatorPerformanceTable);
  const filteredCp = productId ? cpRows.filter((r) => r.productId === productId) : cpRows;

  const insights: Array<{ type: string; text: string; priority: "high" | "medium" | "low" }> = [];

  if (ops.length === 0) {
    res.json(insights);
    return;
  }

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const recentOps = ops.filter((o) => new Date(o.createdAt).getTime() > now - thirtyDays);
  const priorOps = ops.filter(
    (o) =>
      new Date(o.createdAt).getTime() > now - 2 * thirtyDays &&
      new Date(o.createdAt).getTime() <= now - thirtyDays,
  );
  const recentAgg = aggOps(recentOps);
  const priorAgg = aggOps(priorOps);

  // Period comparison
  if (priorAgg.sent > 0 && recentAgg.sent > 0) {
    const recentRR = pct(recentAgg.replied, recentAgg.sent);
    const priorRR = pct(priorAgg.replied, priorAgg.sent);
    const delta = Math.round(recentRR - priorRR);
    if (Math.abs(delta) >= 5) {
      insights.push({
        type: "period",
        text: `Reply rate ${delta > 0 ? "increased" : "decreased"} ${Math.abs(delta)}% compared to the previous 30 days (${recentRR}% vs ${priorRR}%).`,
        priority: delta > 0 ? "low" : "high",
      });
    }
  }

  // Goal completion insight
  const convGoal = goals.find((g) => g.goalType === "conversions");
  if (convGoal && convGoal.targetValue > 0) {
    const agg = aggOps(ops);
    const pctComplete = Math.round((agg.conversions / convGoal.targetValue) * 100);
    insights.push({
      type: "goal",
      text: `Conversion goal is ${pctComplete}% complete (${agg.conversions} of ${convGoal.targetValue} target conversions).`,
      priority: pctComplete >= 80 ? "low" : pctComplete >= 50 ? "medium" : "high",
    });
  }

  const revenueGoal = goals.find((g) => g.goalType === "actual_revenue");
  if (revenueGoal && revenueGoal.targetValue > 0) {
    const actualRev = filteredCp.reduce((s, r) => s + (r.actualRevenue ?? 0), 0);
    const pctComplete = Math.round((actualRev / revenueGoal.targetValue) * 100);
    insights.push({
      type: "goal",
      text: `Revenue goal is ${pctComplete}% complete ($${actualRev.toLocaleString()} of $${revenueGoal.targetValue.toLocaleString()} target).`,
      priority: pctComplete >= 80 ? "low" : pctComplete >= 50 ? "medium" : "high",
    });
  }

  // Best channel
  const byChannel = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!byChannel.has(op.contactMethod)) byChannel.set(op.contactMethod, []);
    byChannel.get(op.contactMethod)!.push(op);
  }
  const channelStats = Array.from(byChannel.entries())
    .map(([ch, chOps]) => {
      const a = aggOps(chOps);
      return { ch, replyRate: pct(a.replied, a.sent), sent: a.sent };
    })
    .filter((c) => c.sent > 0)
    .sort((a, b) => b.replyRate - a.replyRate);

  if (channelStats.length > 0) {
    insights.push({
      type: "channel",
      text: `${channelStats[0].ch} remains the highest-performing outreach channel with a ${channelStats[0].replyRate}% reply rate.`,
      priority: "low",
    });
  }

  // Creator concentration
  const byCreator = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!byCreator.has(op.creatorName)) byCreator.set(op.creatorName, []);
    byCreator.get(op.creatorName)!.push(op);
  }
  const creatorStats = Array.from(byCreator.entries())
    .map(([name, cOps]) => ({ name, conversions: aggOps(cOps).conversions }))
    .filter((c) => c.conversions > 0)
    .sort((a, b) => b.conversions - a.conversions);

  const totalConversions = creatorStats.reduce((s, c) => s + c.conversions, 0);
  if (creatorStats.length >= 3 && totalConversions > 0) {
    const top5 = creatorStats.slice(0, 5);
    const top5Conv = top5.reduce((s, c) => s + c.conversions, 0);
    const top5Pct = Math.round((top5Conv / totalConversions) * 100);
    insights.push({
      type: "creator",
      text: `Top ${top5.length} creator${top5.length > 1 ? "s" : ""} generated ${top5Pct}% of all conversions — ${top5.map((c) => c.name).join(", ")}.`,
      priority: "low",
    });
  }

  // Activity trend
  if (recentAgg.sent > priorAgg.sent * 1.2 && priorAgg.sent > 0) {
    insights.push({
      type: "activity",
      text: `Outreach activity increased ${Math.round(((recentAgg.sent - priorAgg.sent) / priorAgg.sent) * 100)}% over the previous period — great momentum.`,
      priority: "low",
    });
  } else if (priorAgg.sent > 0 && recentAgg.sent < priorAgg.sent * 0.5) {
    insights.push({
      type: "activity",
      text: `Outreach activity dropped ${Math.round(((priorAgg.sent - recentAgg.sent) / priorAgg.sent) * 100)}% vs the previous period — consider increasing send volume.`,
      priority: "high",
    });
  }

  // Sort: high priority first
  insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });

  res.json(insights);
});

// ─── GET /api/reports/goals ───────────────────────────────────────────────────

router.get("/reports/goals", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let goals = await db.select().from(performanceGoalsTable);
  if (productId) goals = goals.filter((g) => g.productId === productId || !g.productId);

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const cpRows = await db.select().from(creatorPerformanceTable);
  const filteredCp = productId ? cpRows.filter((r) => r.productId === productId) : cpRows;

  // Attach live current_value and status to each goal
  const enriched = goals.map((goal) => {
    // Filter ops by date range if set
    const scopedOps =
      goal.startDate || goal.endDate
        ? ops.filter((o) => {
            const t = new Date(o.createdAt).getTime();
            const after = goal.startDate ? new Date(goal.startDate).getTime() : -Infinity;
            const before = goal.endDate ? new Date(goal.endDate).getTime() : Infinity;
            return t >= after && t <= before;
          })
        : ops;

    const current = computeGoalCurrent(goal.goalType, scopedOps, filteredCp);
    const status = computeGoalStatus(current, goal.targetValue);
    const pctComplete = goal.targetValue > 0 ? Math.min(Math.round((current / goal.targetValue) * 100), 100) : 0;

    return {
      ...goal,
      currentValue: current,
      status,
      pctComplete,
      remaining: Math.max(goal.targetValue - current, 0),
    };
  });

  res.json(enriched);
});

// ─── POST /api/reports/goals ──────────────────────────────────────────────────

router.post("/reports/goals", async (req, res) => {
  const body = req.body as {
    productId?: string;
    goalType: string;
    targetValue: number;
    startDate?: string;
    endDate?: string;
  };

  if (!body.goalType || body.targetValue == null) {
    res.status(400).json({ error: "goalType and targetValue required" });
    return;
  }

  const validTypes = [
    "creators_contacted", "replies", "interested", "negotiations",
    "conversions", "estimated_revenue", "actual_revenue",
  ];
  if (!validTypes.includes(body.goalType)) {
    res.status(400).json({ error: `Invalid goalType. Must be one of: ${validTypes.join(", ")}` });
    return;
  }

  const [goal] = await db
    .insert(performanceGoalsTable)
    .values({
      productId: body.productId ?? null,
      goalType: body.goalType as typeof performanceGoalsTable.$inferInsert["goalType"],
      targetValue: body.targetValue,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
    })
    .returning();

  res.status(201).json(goal);
});

// ─── PATCH /api/reports/goals/:id ────────────────────────────────────────────

router.patch("/reports/goals/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body as {
    targetValue?: number;
    startDate?: string | null;
    endDate?: string | null;
  };

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.targetValue !== undefined) updates.targetValue = body.targetValue;
  if (body.startDate !== undefined) updates.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) updates.endDate = body.endDate ? new Date(body.endDate) : null;

  const [goal] = await db
    .update(performanceGoalsTable)
    .set(updates)
    .where(eq(performanceGoalsTable.id, id))
    .returning();

  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  res.json(goal);
});

// ─── DELETE /api/reports/goals/:id ───────────────────────────────────────────

router.delete("/reports/goals/:id", async (req, res) => {
  const { id } = req.params;
  await db.delete(performanceGoalsTable).where(eq(performanceGoalsTable.id, id));
  res.json({ deleted: true, id });
});

export default router;
