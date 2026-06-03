import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { db, creatorsTable, creatorScoresTable, productsTable } from "@workspace/db";
import { generateId } from "../lib/id";
import { validateBody } from "../lib/validate";
import {
  computeFitScore,
  getFitLabel,
  getSuggestedCommission,
} from "../lib/scoring";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateCreatorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  handle: z.string().min(1).max(100),
  platform: z.enum(["YouTube", "Instagram", "TikTok"]),
  niche: z.string().min(1).max(200),
  creatorType: z.enum(["Micro", "Mid-Tier", "Macro", "Celebrity"]),
  followerCount: z.number().int().nonnegative().default(0),
  engagementRate: z.number().nonnegative().default(0),
  audienceMatch: z.number().int().min(0).max(100).default(50),
  platformFit: z.number().int().min(0).max(100).default(50),
  productFit: z.number().int().min(0).max(100).default(50),
  competitiveConflict: z.number().int().min(0).max(100).default(0),
  avatarUrl: z.string().optional().nullable(),
  recommendedDeal: z.string().optional().nullable(),
  audienceFitSummary: z.string().optional().nullable(),
  platformFitSummary: z.string().optional().nullable(),
  engagementQuality: z.string().optional().nullable(),
  competitorSignal: z.string().optional().nullable(),
  productGapOpportunity: z.string().optional().nullable(),
  whyGoodFit: z.string().optional().nullable(),
  suggestedDealStructure: z.string().optional().nullable(),
  suggestedOutreachAngle: z.string().optional().nullable(),
  source: z.enum(["manual", "discovered", "imported"]).optional().default("manual"),
});

const UpdateCreatorSchema = CreateCreatorSchema.partial().omit({ id: true });

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/creators */
router.get("/", async (req, res, next) => {
  try {
    let rows = await db.select().from(creatorsTable);

    const { platform, niche } = req.query;
    if (platform && typeof platform === "string") {
      rows = rows.filter((r) => r.platform === platform);
    }
    if (niche && typeof niche === "string") {
      const n = niche.toLowerCase();
      rows = rows.filter((r) => r.niche.toLowerCase().includes(n));
    }

    res.json({ data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

/** GET /api/creators/:id */
router.get("/:id", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, String(req.params.id)))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** GET /api/creators/:id/scores/:productId — per-product score */
router.get("/:id/scores/:productId", async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(creatorScoresTable)
      .where(
        and(
          eq(creatorScoresTable.creatorId, String(req.params.id)),
          eq(creatorScoresTable.productId, String(req.params.productId))
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.json({ data: existing[0] });
      return;
    }

    // Compute on-the-fly if not cached
    const creatorRows = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, String(req.params.id)))
      .limit(1);

    if (creatorRows.length === 0) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }

    const productRows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.productId)))
      .limit(1);

    if (productRows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const creator = creatorRows[0];
    const fitScore = computeFitScore({
      audienceMatch: creator.audienceMatch,
      engagementRate: creator.engagementRate,
      platformFit: creator.platformFit,
      productFit: creator.productFit,
      competitiveConflict: creator.competitiveConflict,
    });
    const fitLabel = getFitLabel(fitScore);
    const suggestedCommission = getSuggestedCommission(fitLabel);

    const id = generateId("score");
    const now = new Date();

    await db.insert(creatorScoresTable).values({
      id,
      creatorId: creator.id,
      productId: String(req.params.productId),
      fitScore,
      audienceMatch: creator.audienceMatch,
      platformFit: creator.platformFit,
      productFit: creator.productFit,
      engagementScore: Math.min(creator.engagementRate * 10, 100),
      conflictScore: 100 - creator.competitiveConflict,
      fitLabel,
      suggestedCommission,
      scoringMethod: "formula",
      computedAt: now,
    });

    const scoreRows = await db
      .select()
      .from(creatorScoresTable)
      .where(eq(creatorScoresTable.id, id))
      .limit(1);

    res.json({ data: scoreRows[0] });
  } catch (err) {
    next(err);
  }
});

/** POST /api/creators */
router.post("/", validateBody(CreateCreatorSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreateCreatorSchema>;
    const id = body.id ?? generateId("cre");
    const now = new Date();

    await db.insert(creatorsTable).values({
      id,
      name: body.name,
      handle: body.handle,
      platform: body.platform,
      niche: body.niche,
      creatorType: body.creatorType,
      followerCount: body.followerCount ?? 0,
      engagementRate: body.engagementRate ?? 0,
      audienceMatch: body.audienceMatch ?? 50,
      platformFit: body.platformFit ?? 50,
      productFit: body.productFit ?? 50,
      competitiveConflict: body.competitiveConflict ?? 0,
      avatarUrl: body.avatarUrl ?? null,
      recommendedDeal: body.recommendedDeal ?? null,
      audienceFitSummary: body.audienceFitSummary ?? null,
      platformFitSummary: body.platformFitSummary ?? null,
      engagementQuality: body.engagementQuality ?? null,
      competitorSignal: body.competitorSignal ?? null,
      productGapOpportunity: body.productGapOpportunity ?? null,
      whyGoodFit: body.whyGoodFit ?? null,
      suggestedDealStructure: body.suggestedDealStructure ?? null,
      suggestedOutreachAngle: body.suggestedOutreachAngle ?? null,
      source: body.source ?? "manual",
      createdAt: now,
      updatedAt: now,
    });

    const rows = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, id))
      .limit(1);

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/creators/:id */
router.put("/:id", validateBody(UpdateCreatorSchema), async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }

    const body = req.body as z.infer<typeof UpdateCreatorSchema>;
    await db
      .update(creatorsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(creatorsTable.id, String(req.params.id)));

    const updated = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, String(req.params.id)))
      .limit(1);

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/creators/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(creatorsTable)
      .where(eq(creatorsTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }

    await db.delete(creatorsTable).where(eq(creatorsTable.id, String(req.params.id)));
    res.json({ success: true, deleted: String(req.params.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
