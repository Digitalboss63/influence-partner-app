import { Router } from "express";
import { db } from "@workspace/db";
import {
  outreachOperationsTable,
  creatorPerformanceTable,
  campaignPerformanceTable,
  productsTable,
  partnerTargetsTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

type OutreachOp = typeof outreachOperationsTable.$inferSelect;

function pct(num: number, denom: number): number {
  if (denom === 0) return 0;
  return Math.round((num / denom) * 100 * 10) / 10;
}

function aggregateOps(ops: OutreachOp[]) {
  const sent = ops.filter((o) =>
    ["sent", "replied", "interested", "negotiating", "converted"].includes(
      o.outreachStatus,
    ),
  ).length;
  const replied = ops.filter((o) =>
    ["replied", "interested", "negotiating", "converted"].includes(
      o.outreachStatus,
    ),
  ).length;
  const interested = ops.filter((o) =>
    ["interested", "negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const negotiating = ops.filter((o) =>
    ["negotiating", "converted"].includes(o.outreachStatus),
  ).length;
  const converted = ops.filter((o) => o.outreachStatus === "converted").length;
  const total = ops.length;
  return { total, sent, replied, interested, negotiating, converted };
}

// ─── GET /api/performance/overview ────────────────────────────────────────────

router.get("/performance/overview", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const { total, sent, replied, interested, negotiating, converted } =
    aggregateOps(ops);

  const replyRate = pct(replied, sent);
  const interestedRate = pct(interested, replied);
  const conversionRate = pct(converted, sent);
  const overallConversionRate = pct(converted, total);

  // Revenue from creator_performance records
  const cpRows = await db.select().from(creatorPerformanceTable);
  const filteredCp = productId
    ? cpRows.filter((r) => r.productId === productId)
    : cpRows;
  const totalEstimatedRevenue = filteredCp.reduce(
    (s, r) => s + (r.estimatedRevenue ?? 0),
    0,
  );
  const totalActualRevenue = filteredCp.reduce(
    (s, r) => s + (r.actualRevenue ?? 0),
    0,
  );

  res.json({
    total,
    sent,
    replied,
    interested,
    negotiating,
    converted,
    replyRate,
    interestedRate,
    conversionRate,
    overallConversionRate,
    totalEstimatedRevenue,
    totalActualRevenue,
    funnel: [
      { stage: "Total Operations", count: total, pct: 100 },
      { stage: "Sent", count: sent, pct: pct(sent, total) },
      { stage: "Replied", count: replied, pct: pct(replied, sent) },
      { stage: "Interested", count: interested, pct: pct(interested, replied) },
      { stage: "Negotiating", count: negotiating, pct: pct(negotiating, interested) },
      { stage: "Converted", count: converted, pct: pct(converted, negotiating) },
    ],
  });
});

// ─── GET /api/performance/creators ────────────────────────────────────────────

router.get("/performance/creators", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  // Group by creatorName
  const byCreator = new Map<
    string,
    { ops: OutreachOp[]; productId: string | null; targetId: string | null }
  >();
  for (const op of ops) {
    if (!byCreator.has(op.creatorName)) {
      byCreator.set(op.creatorName, {
        ops: [],
        productId: op.productId,
        targetId: op.targetId,
      });
    }
    byCreator.get(op.creatorName)!.ops.push(op);
  }

  // Revenue from stored records
  const cpRows = await db.select().from(creatorPerformanceTable);

  const results = Array.from(byCreator.entries()).map(
    ([creatorName, { ops: crOps, productId: pid, targetId }]) => {
      const agg = aggregateOps(crOps);
      const revenueRow = cpRows.find(
        (r) =>
          r.creatorName === creatorName &&
          (!pid || r.productId === pid),
      );
      return {
        creatorName,
        productId: pid,
        targetId,
        total: agg.total,
        sent: agg.sent,
        replied: agg.replied,
        interested: agg.interested,
        negotiating: agg.negotiating,
        converted: agg.converted,
        replyRate: pct(agg.replied, agg.sent),
        interestedRate: pct(agg.interested, agg.replied),
        conversionRate: pct(agg.converted, agg.sent),
        estimatedRevenue: revenueRow?.estimatedRevenue ?? null,
        actualRevenue: revenueRow?.actualRevenue ?? null,
        partnerFitScore: revenueRow?.partnerFitScore ?? null,
        contactReadinessScore: revenueRow?.contactReadinessScore ?? null,
        revenueRecordId: revenueRow?.id ?? null,
      };
    },
  );

  // Sort by conversions desc, then replied desc
  results.sort(
    (a, b) =>
      b.converted - a.converted ||
      b.replied - a.replied ||
      b.sent - a.sent,
  );

  res.json(results);
});

// ─── GET /api/performance/products ────────────────────────────────────────────

router.get("/performance/products", async (req, res) => {
  const ops = await db.select().from(outreachOperationsTable);
  const products = await db.select().from(productsTable);
  const campRows = await db.select().from(campaignPerformanceTable);

  const byProduct = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!op.productId) continue;
    if (!byProduct.has(op.productId)) byProduct.set(op.productId, []);
    byProduct.get(op.productId)!.push(op);
  }

  const results = products.map((product) => {
    const pOps = byProduct.get(product.id) ?? [];
    const agg = aggregateOps(pOps);
    const campRow = campRows.find((c) => c.productId === product.id);
    return {
      productId: product.id,
      productName: product.name,
      total: agg.total,
      sent: agg.sent,
      replied: agg.replied,
      interested: agg.interested,
      negotiating: agg.negotiating,
      converted: agg.converted,
      replyRate: pct(agg.replied, agg.sent),
      conversionRate: pct(agg.converted, agg.sent),
      overallConversionRate: pct(agg.converted, agg.total),
      estimatedRevenue: campRow?.estimatedRevenue ?? null,
      actualRevenue: campRow?.actualRevenue ?? null,
      revenueRecordId: campRow?.id ?? null,
    };
  });

  results.sort((a, b) => b.converted - a.converted || b.total - a.total);

  res.json(results);
});

// ─── GET /api/performance/channels ────────────────────────────────────────────

router.get("/performance/channels", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const byChannel = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!byChannel.has(op.contactMethod))
      byChannel.set(op.contactMethod, []);
    byChannel.get(op.contactMethod)!.push(op);
  }

  const results = Array.from(byChannel.entries()).map(
    ([channel, chOps]) => {
      const agg = aggregateOps(chOps);
      return {
        channel,
        total: agg.total,
        sent: agg.sent,
        replied: agg.replied,
        interested: agg.interested,
        converted: agg.converted,
        replyRate: pct(agg.replied, agg.sent),
        interestedRate: pct(agg.interested, agg.replied),
        conversionRate: pct(agg.converted, agg.sent),
      };
    },
  );

  results.sort((a, b) => b.total - a.total);

  res.json(results);
});

// ─── GET /api/performance/insights ────────────────────────────────────────────

router.get("/performance/insights", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let ops = await db.select().from(outreachOperationsTable);
  if (productId) ops = ops.filter((o) => o.productId === productId);

  const insights: Array<{ type: string; text: string; value?: number }> = [];

  if (ops.length === 0) {
    res.json(insights);
    return;
  }

  // Channel comparison
  const byChannel = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!byChannel.has(op.contactMethod))
      byChannel.set(op.contactMethod, []);
    byChannel.get(op.contactMethod)!.push(op);
  }

  const channelStats = Array.from(byChannel.entries()).map(
    ([channel, chOps]) => {
      const agg = aggregateOps(chOps);
      return { channel, replyRate: pct(agg.replied, agg.sent), convRate: pct(agg.converted, agg.sent), sent: agg.sent };
    },
  ).filter((c) => c.sent > 0);

  if (channelStats.length >= 2) {
    const sorted = [...channelStats].sort((a, b) => b.replyRate - a.replyRate);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    if (best.replyRate > worst.replyRate && worst.replyRate > 0) {
      const mult = (best.replyRate / worst.replyRate).toFixed(1);
      insights.push({
        type: "channel",
        text: `${best.channel} outreach produces ${mult}x more replies than ${worst.channel}.`,
        value: best.replyRate,
      });
    } else if (best.replyRate > 0) {
      insights.push({
        type: "channel",
        text: `${best.channel} is your best-performing outreach channel with a ${best.replyRate}% reply rate.`,
        value: best.replyRate,
      });
    }
  }

  // Top creator
  const byCreator = new Map<string, OutreachOp[]>();
  for (const op of ops) {
    if (!byCreator.has(op.creatorName)) byCreator.set(op.creatorName, []);
    byCreator.get(op.creatorName)!.push(op);
  }

  const creatorStats = Array.from(byCreator.entries()).map(([name, cOps]) => {
    const agg = aggregateOps(cOps);
    return { name, converted: agg.converted, sent: agg.sent, convRate: pct(agg.converted, agg.sent) };
  }).filter((c) => c.sent > 0);

  const topConverters = creatorStats.filter((c) => c.converted > 0);
  if (topConverters.length > 0) {
    const top = topConverters.sort((a, b) => b.convRate - a.convRate)[0];
    insights.push({
      type: "creator",
      text: `${top.name} is your top-converting creator at a ${top.convRate}% conversion rate.`,
      value: top.convRate,
    });
  }

  // Conversion funnel insight
  const allAgg = aggregateOps(ops);
  if (allAgg.sent > 0 && allAgg.replied > 0) {
    const replyToInterested = pct(allAgg.interested, allAgg.replied);
    if (replyToInterested < 30 && allAgg.replied >= 3) {
      insights.push({
        type: "funnel",
        text: `Only ${replyToInterested}% of replies convert to Interested — consider improving your follow-up message after replies.`,
        value: replyToInterested,
      });
    } else if (replyToInterested >= 60 && allAgg.replied >= 3) {
      insights.push({
        type: "funnel",
        text: `Strong reply-to-interested conversion at ${replyToInterested}% — your follow-up approach is working well.`,
        value: replyToInterested,
      });
    }
  }

  // Priority insight
  const highPriOps = ops.filter((o) => o.priority === "high");
  const medPriOps = ops.filter((o) => o.priority === "medium");
  const highAgg = aggregateOps(highPriOps);
  const medAgg = aggregateOps(medPriOps);
  if (highAgg.sent > 0 && medAgg.sent > 0) {
    const highConv = pct(highAgg.converted, highAgg.sent);
    const medConv = pct(medAgg.converted, medAgg.sent);
    if (highConv > medConv) {
      insights.push({
        type: "priority",
        text: `High-priority creators convert ${(highConv / Math.max(medConv, 0.1)).toFixed(1)}x better than medium-priority — your targeting is effective.`,
        value: highConv,
      });
    }
  }

  // Overall funnel drop-off
  if (allAgg.sent >= 5 && allAgg.converted === 0) {
    insights.push({
      type: "funnel",
      text: `You have ${allAgg.sent} outreach messages sent with 0 conversions yet — keep following up with interested creators.`,
    });
  }

  if (allAgg.converted > 0) {
    const topCount = Math.min(3, topConverters.length);
    if (topCount > 0 && creatorStats.length > topCount) {
      const topConversions = topConverters.slice(0, topCount).reduce((s, c) => s + c.converted, 0);
      const totalConversions = creatorStats.reduce((s, c) => s + c.converted, 0);
      const topPct = pct(topConversions, totalConversions);
      if (topPct >= 50) {
        insights.push({
          type: "creator",
          text: `Top ${topCount} creators account for ${topPct}% of all conversions — consider prioritising similar profiles.`,
          value: topPct,
        });
      }
    }
  }

  res.json(insights);
});

// ─── PATCH /api/performance/creators/revenue ─────────────────────────────────

router.patch("/performance/creators/revenue", async (req, res) => {
  const body = req.body as {
    creatorName: string;
    productId?: string;
    targetId?: string;
    estimatedRevenue?: number;
    actualRevenue?: number;
    partnerFitScore?: number;
    contactReadinessScore?: number;
  };

  if (!body.creatorName) {
    res.status(400).json({ error: "creatorName required" });
    return;
  }

  // Find existing record
  const existing = await db
    .select()
    .from(creatorPerformanceTable)
    .where(
      and(
        eq(creatorPerformanceTable.creatorName, body.creatorName),
        body.productId
          ? eq(creatorPerformanceTable.productId, body.productId)
          : undefined,
      ),
    )
    .limit(1);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.estimatedRevenue !== undefined) updates.estimatedRevenue = body.estimatedRevenue;
  if (body.actualRevenue !== undefined) updates.actualRevenue = body.actualRevenue;
  if (body.partnerFitScore !== undefined) updates.partnerFitScore = body.partnerFitScore;
  if (body.contactReadinessScore !== undefined) updates.contactReadinessScore = body.contactReadinessScore;

  let record;
  if (existing.length > 0) {
    [record] = await db
      .update(creatorPerformanceTable)
      .set(updates)
      .where(eq(creatorPerformanceTable.id, existing[0].id))
      .returning();
  } else {
    [record] = await db
      .insert(creatorPerformanceTable)
      .values({
        creatorName: body.creatorName,
        productId: body.productId ?? null,
        targetId: body.targetId ?? null,
        estimatedRevenue: body.estimatedRevenue ?? null,
        actualRevenue: body.actualRevenue ?? null,
        partnerFitScore: body.partnerFitScore ?? null,
        contactReadinessScore: body.contactReadinessScore ?? null,
      })
      .returning();
  }

  res.json(record);
});

// ─── PATCH /api/performance/products/revenue ─────────────────────────────────

router.patch("/performance/products/revenue", async (req, res) => {
  const body = req.body as {
    productId: string;
    campaignName?: string;
    estimatedRevenue?: number;
    actualRevenue?: number;
  };

  if (!body.productId) {
    res.status(400).json({ error: "productId required" });
    return;
  }

  const existing = await db
    .select()
    .from(campaignPerformanceTable)
    .where(eq(campaignPerformanceTable.productId, body.productId))
    .limit(1);

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.estimatedRevenue !== undefined) updates.estimatedRevenue = body.estimatedRevenue;
  if (body.actualRevenue !== undefined) updates.actualRevenue = body.actualRevenue;
  if (body.campaignName) updates.campaignName = body.campaignName;

  let record;
  if (existing.length > 0) {
    [record] = await db
      .update(campaignPerformanceTable)
      .set(updates)
      .where(eq(campaignPerformanceTable.id, existing[0].id))
      .returning();
  } else {
    // Look up product name
    const [prod] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, body.productId))
      .limit(1);

    [record] = await db
      .insert(campaignPerformanceTable)
      .values({
        productId: body.productId,
        campaignName: body.campaignName ?? prod?.name ?? "Unnamed Campaign",
        estimatedRevenue: body.estimatedRevenue ?? null,
        actualRevenue: body.actualRevenue ?? null,
      })
      .returning();
  }

  res.json(record);
});

export default router;
