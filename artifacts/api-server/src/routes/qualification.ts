import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import {
  db,
  partnerQualificationsTable,
  partnerProspectsTable,
  partnerTargetsTable,
  productsTable,
  qualificationFeedbackTable,
  insertPartnerQualificationSchema,
  type QualificationStatus,
} from "@workspace/db";
import { scoreProspect } from "../lib/qualification/scoring";

const router: IRouter = Router();

// ─── GET /qualification/queue?productId= ─────────────────────────────────────
// Returns all prospects enriched with their qualification for the given product.

router.get("/qualification/queue", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  if (!productId) {
    res.status(400).json({ error: "productId is required" });
    return;
  }

  const prospects = await db
    .select()
    .from(partnerProspectsTable)
    .orderBy(partnerProspectsTable.createdAt);

  const qualifications = await db
    .select()
    .from(partnerQualificationsTable)
    .where(eq(partnerQualificationsTable.productId, productId));

  const qualMap = new Map(qualifications.map((q) => [q.prospectId, q]));

  const result = prospects.map((p) => ({
    prospect: p,
    qualification: qualMap.get(p.id) ?? null,
  }));

  res.json(result);
});

// ─── POST /qualification/qualify ─────────────────────────────────────────────
// Score a single prospect against a product. Upserts the qualification record.

router.post("/qualification/qualify", async (req, res) => {
  const { prospectId, productId } = req.body as {
    prospectId?: string;
    productId?: string;
  };

  if (!prospectId || !productId) {
    res.status(400).json({ error: "prospectId and productId are required" });
    return;
  }

  const [prospect] = await db
    .select()
    .from(partnerProspectsTable)
    .where(eq(partnerProspectsTable.id, prospectId));

  if (!prospect) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const result = scoreProspect({
    prospect: {
      name: prospect.name,
      company: prospect.company,
      platform: prospect.platform,
      partnerCategory: prospect.partnerCategory,
      audienceSize: prospect.audienceSize,
      notes: prospect.notes,
      email: prospect.email,
      source: prospect.source,
      website: prospect.website,
      socialUrl: prospect.socialUrl,
    },
    product: {
      name: product.name,
      category: product.category,
      targetCustomer: product.targetCustomer,
      mainBenefit: product.mainBenefit,
      description: product.description,
    },
  });

  const payload = {
    prospectId,
    productId,
    partnerFitScore: result.partnerFitScore,
    audienceMatchScore: result.audienceMatchScore,
    brandSafetyScore: result.brandSafetyScore,
    partnershipReadinessScore: result.partnershipReadinessScore,
    responseProbabilityScore: result.responseProbabilityScore,
    contentRelevanceScore: result.contentRelevanceScore,
    qualificationLabel: result.qualificationLabel,
    qualificationStatus: "unreviewed" as const,
    hardFlags: result.hardFlags as unknown,
    scoreReasons: result.scoreReasons as unknown,
    nextBestAction: result.nextBestAction,
    contactEmail: result.contactEmail,
  };

  // Upsert — if already exists, update scores but preserve status
  const existing = await db
    .select()
    .from(partnerQualificationsTable)
    .where(
      and(
        eq(partnerQualificationsTable.prospectId, prospectId),
        eq(partnerQualificationsTable.productId, productId),
      ),
    );

  let qual;
  if (existing.length > 0) {
    const [updated] = await db
      .update(partnerQualificationsTable)
      .set({
        partnerFitScore: payload.partnerFitScore,
        audienceMatchScore: payload.audienceMatchScore,
        brandSafetyScore: payload.brandSafetyScore,
        partnershipReadinessScore: payload.partnershipReadinessScore,
        responseProbabilityScore: payload.responseProbabilityScore,
        contentRelevanceScore: payload.contentRelevanceScore,
        qualificationLabel: payload.qualificationLabel,
        hardFlags: payload.hardFlags,
        scoreReasons: payload.scoreReasons,
        nextBestAction: payload.nextBestAction,
        contactEmail: payload.contactEmail,
        updatedAt: new Date(),
      })
      .where(eq(partnerQualificationsTable.id, existing[0]!.id))
      .returning();
    qual = updated;
  } else {
    const parsed = insertPartnerQualificationSchema.safeParse(payload);
    if (!parsed.success) {
      res.status(400).json({ error: "Schema validation failed", details: parsed.error.issues });
      return;
    }
    const [inserted] = await db
      .insert(partnerQualificationsTable)
      .values(parsed.data)
      .returning();
    qual = inserted;
  }

  res.status(existing.length > 0 ? 200 : 201).json(qual);
});

// ─── POST /qualification/qualify-batch ───────────────────────────────────────
// Score ALL prospects for a product in one call.

router.post("/qualification/qualify-batch", async (req, res) => {
  const { productId } = req.body as { productId?: string };

  if (!productId) {
    res.status(400).json({ error: "productId is required" });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const prospects = await db.select().from(partnerProspectsTable);

  const results = [];
  for (const prospect of prospects) {
    const result = scoreProspect({
      prospect: {
        name: prospect.name,
        company: prospect.company,
        platform: prospect.platform,
        partnerCategory: prospect.partnerCategory,
        audienceSize: prospect.audienceSize,
        notes: prospect.notes,
        email: prospect.email,
        source: prospect.source,
        website: prospect.website,
        socialUrl: prospect.socialUrl,
      },
      product: {
        name: product.name,
        category: product.category,
        targetCustomer: product.targetCustomer,
        mainBenefit: product.mainBenefit,
        description: product.description,
      },
    });

    const payload = {
      prospectId: prospect.id,
      productId,
      partnerFitScore: result.partnerFitScore,
      audienceMatchScore: result.audienceMatchScore,
      brandSafetyScore: result.brandSafetyScore,
      partnershipReadinessScore: result.partnershipReadinessScore,
      responseProbabilityScore: result.responseProbabilityScore,
      contentRelevanceScore: result.contentRelevanceScore,
      qualificationLabel: result.qualificationLabel,
      qualificationStatus: "unreviewed" as const,
      hardFlags: result.hardFlags as unknown,
      scoreReasons: result.scoreReasons as unknown,
      nextBestAction: result.nextBestAction,
      contactEmail: result.contactEmail,
    };

    const existing = await db
      .select({ id: partnerQualificationsTable.id })
      .from(partnerQualificationsTable)
      .where(
        and(
          eq(partnerQualificationsTable.prospectId, prospect.id),
          eq(partnerQualificationsTable.productId, productId),
        ),
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(partnerQualificationsTable)
        .set({
          partnerFitScore: payload.partnerFitScore,
          audienceMatchScore: payload.audienceMatchScore,
          brandSafetyScore: payload.brandSafetyScore,
          partnershipReadinessScore: payload.partnershipReadinessScore,
          responseProbabilityScore: payload.responseProbabilityScore,
          contentRelevanceScore: payload.contentRelevanceScore,
          qualificationLabel: payload.qualificationLabel,
          hardFlags: payload.hardFlags,
          scoreReasons: payload.scoreReasons,
          nextBestAction: payload.nextBestAction,
          contactEmail: payload.contactEmail,
          updatedAt: new Date(),
        })
        .where(eq(partnerQualificationsTable.id, existing[0]!.id))
        .returning();
      results.push(updated);
    } else {
      const parsed = insertPartnerQualificationSchema.safeParse(payload);
      if (parsed.success) {
        const [inserted] = await db
          .insert(partnerQualificationsTable)
          .values(parsed.data)
          .returning();
        results.push(inserted);
      }
    }
  }

  res.json({ qualified: results.length, qualifications: results });
});

// ─── PATCH /qualification/:id/status ─────────────────────────────────────────

router.patch("/qualification/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  const validStatuses: QualificationStatus[] = [
    "unreviewed", "qualified", "rejected", "starred", "archived",
  ];
  if (!status || !validStatuses.includes(status as QualificationStatus)) {
    res.status(400).json({ error: "Invalid status", validStatuses });
    return;
  }

  const [updated] = await db
    .update(partnerQualificationsTable)
    .set({ qualificationStatus: status as QualificationStatus, updatedAt: new Date() })
    .where(eq(partnerQualificationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Qualification not found" });
    return;
  }

  res.json(updated);
});

// ─── POST /qualification/:id/approve ─────────────────────────────────────────
// Approve a qualification → creates a partner target and marks prospect as Added To Targets.

router.post("/qualification/:id/approve", async (req, res) => {
  const { id } = req.params;

  const [qual] = await db
    .select()
    .from(partnerQualificationsTable)
    .where(eq(partnerQualificationsTable.id, id));

  if (!qual) {
    res.status(404).json({ error: "Qualification not found" });
    return;
  }

  const [prospect] = await db
    .select()
    .from(partnerProspectsTable)
    .where(eq(partnerProspectsTable.id, qual.prospectId));

  if (!prospect) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }

  // Create target
  const [target] = await db
    .insert(partnerTargetsTable)
    .values({
      productId: qual.productId,
      partnerCategory: prospect.partnerCategory ?? "YouTuber",
      name: prospect.name,
      company: prospect.company,
      platform: prospect.platform,
      website: prospect.website,
      email: qual.contactEmail ?? prospect.email,
      socialUrl: prospect.socialUrl,
      notes: prospect.notes,
      status: "Not Contacted",
    })
    .returning();

  // Update qualification status to qualified
  await db
    .update(partnerQualificationsTable)
    .set({ qualificationStatus: "qualified", updatedAt: new Date() })
    .where(eq(partnerQualificationsTable.id, id));

  // Update prospect status to Added To Targets
  await db
    .update(partnerProspectsTable)
    .set({ status: "Added To Targets", updatedAt: new Date() })
    .where(eq(partnerProspectsTable.id, qual.prospectId));

  res.status(201).json({ target, qualificationId: id });
});

// ─── GET /qualification/metrics?productId= ───────────────────────────────────

router.get("/qualification/metrics", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  if (!productId) {
    res.status(400).json({ error: "productId is required" });
    return;
  }

  const [discoveredResult] = await db
    .select({ total: count() })
    .from(partnerProspectsTable);

  const qualifications = await db
    .select()
    .from(partnerQualificationsTable)
    .where(eq(partnerQualificationsTable.productId, productId));

  const readyToPitch = qualifications.filter(
    (q) => q.qualificationLabel === "Ready to Pitch",
  ).length;
  const promising = qualifications.filter(
    (q) => q.qualificationLabel === "Promising",
  ).length;
  const needsReview = qualifications.filter(
    (q) => q.qualificationLabel === "Needs Review",
  ).length;
  const notQualified = qualifications.filter(
    (q) => q.qualificationLabel === "Not Qualified",
  ).length;
  const starred = qualifications.filter(
    (q) => q.qualificationStatus === "starred",
  ).length;
  const rejected = qualifications.filter(
    (q) => q.qualificationStatus === "rejected",
  ).length;
  const approved = qualifications.filter(
    (q) => q.qualificationStatus === "qualified",
  ).length;

  const [targetsResult] = await db
    .select({ total: count() })
    .from(partnerTargetsTable)
    .where(eq(partnerTargetsTable.productId, productId));

  res.json({
    discovered: discoveredResult?.total ?? 0,
    scored: qualifications.length,
    readyToPitch,
    promising,
    needsReview,
    notQualified,
    starred,
    rejected,
    approved,
    targets: targetsResult?.total ?? 0,
  });
});

// ─── POST /qualification/bulk-action ─────────────────────────────────────────
// Bulk approve / reject / star / archive a set of qualification IDs.

router.post("/qualification/bulk-action", async (req, res) => {
  const { ids, action } = req.body as {
    ids?: string[];
    action?: string;
  };

  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids must be a non-empty array" });
    return;
  }
  const validActions = ["approve", "reject", "star", "archive"];
  if (!action || !validActions.includes(action)) {
    res.status(400).json({ error: `action must be one of: ${validActions.join(", ")}` });
    return;
  }

  let processed = 0;

  if (action === "approve") {
    for (const qualId of ids) {
      const [qual] = await db
        .select()
        .from(partnerQualificationsTable)
        .where(eq(partnerQualificationsTable.id, qualId))
        .limit(1);
      if (!qual) continue;

      const [prospect] = await db
        .select()
        .from(partnerProspectsTable)
        .where(eq(partnerProspectsTable.id, qual.prospectId))
        .limit(1);
      if (!prospect) continue;

      await db
        .insert(partnerTargetsTable)
        .values({
          productId: qual.productId,
          partnerCategory: prospect.partnerCategory ?? "YouTuber",
          name: prospect.name,
          company: prospect.company,
          platform: prospect.platform,
          website: prospect.website,
          email: qual.contactEmail ?? prospect.email,
          socialUrl: prospect.socialUrl,
          notes: prospect.notes,
          status: "Not Contacted",
        })
        .onConflictDoNothing();

      await db
        .update(partnerQualificationsTable)
        .set({ qualificationStatus: "qualified", updatedAt: new Date() })
        .where(eq(partnerQualificationsTable.id, qualId));

      await db
        .update(partnerProspectsTable)
        .set({ status: "Added To Targets", updatedAt: new Date() })
        .where(eq(partnerProspectsTable.id, qual.prospectId));

      processed++;
    }
  } else {
    const statusMap: Record<string, QualificationStatus> = {
      reject: "rejected",
      star: "starred",
      archive: "archived",
    };
    const newStatus = statusMap[action] as QualificationStatus;
    for (const qualId of ids) {
      await db
        .update(partnerQualificationsTable)
        .set({ qualificationStatus: newStatus, updatedAt: new Date() })
        .where(eq(partnerQualificationsTable.id, qualId));
      processed++;
    }
  }

  res.json({ processed });
});

// ─── POST /qualification/:id/feedback ────────────────────────────────────────
// Store a user feedback signal for a qualification score.

router.post("/qualification/:id/feedback", async (req, res) => {
  const { id } = req.params;
  const { feedbackType } = req.body as { feedbackType?: string };

  const validFeedback = ["accurate", "too_high", "too_low"];
  if (!feedbackType || !validFeedback.includes(feedbackType)) {
    res.status(400).json({ error: `feedbackType must be one of: ${validFeedback.join(", ")}` });
    return;
  }

  const [qual] = await db
    .select({ id: partnerQualificationsTable.id })
    .from(partnerQualificationsTable)
    .where(eq(partnerQualificationsTable.id, id))
    .limit(1);

  if (!qual) {
    res.status(404).json({ error: "Qualification not found" });
    return;
  }

  const [feedback] = await db
    .insert(qualificationFeedbackTable)
    .values({
      qualificationId: id,
      feedbackType: feedbackType as "accurate" | "too_high" | "too_low",
    })
    .returning();

  res.json({ id: feedback!.id });
});

export default router;
