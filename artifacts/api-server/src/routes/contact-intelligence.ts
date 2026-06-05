import { Router } from "express";
import { db } from "@workspace/db";
import {
  contactIntelligenceTable,
  partnerQualificationsTable,
  partnerProspectsTable,
} from "@workspace/db/schema";
import { eq, and, count } from "drizzle-orm";
import { extractContacts } from "../lib/contact-intelligence/extractor.js";
import { computeContactReadiness } from "../lib/contact-intelligence/scoring.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function discoverForProspect(prospectId: string, productId: string | null) {
  const [prospect] = await db
    .select()
    .from(partnerProspectsTable)
    .where(eq(partnerProspectsTable.id, prospectId))
    .limit(1);

  if (!prospect) return null;

  const qualRows = productId
    ? await db
        .select()
        .from(partnerQualificationsTable)
        .where(
          and(
            eq(partnerQualificationsTable.prospectId, prospectId),
            eq(partnerQualificationsTable.productId, productId),
          ),
        )
        .limit(1)
    : await db
        .select()
        .from(partnerQualificationsTable)
        .where(eq(partnerQualificationsTable.prospectId, prospectId))
        .limit(1);

  const qual = qualRows[0] ?? null;

  const extracted = extractContacts({
    prospect: {
      name: prospect.name,
      email: prospect.email,
      website: prospect.website,
      socialUrl: prospect.socialUrl,
      notes: prospect.notes,
      platform: prospect.platform,
    },
    qualification: qual ? { contactEmail: qual.contactEmail } : null,
  });

  const readiness = computeContactReadiness(extracted, false);

  const resolvedProductId = productId ?? qual?.productId ?? null;

  const values = {
    prospectId,
    productId: resolvedProductId,
    qualificationId: qual?.id ?? null,
    businessEmail: extracted.businessEmail,
    websiteUrl: extracted.websiteUrl,
    instagramUrl: extracted.instagramUrl,
    tiktokUrl: extracted.tiktokUrl,
    linkedinUrl: extracted.linkedinUrl,
    contactPageUrl: extracted.contactPageUrl,
    youtubeUrl: extracted.youtubeUrl,
    confidenceScore: readiness.confidenceScore,
    contactReadinessScore: readiness.contactReadinessScore,
    verificationStatus: readiness.verificationStatus,
    sourceData: extracted.sourceData as Record<string, unknown>,
    auditNotes: readiness.auditNotes,
    updatedAt: new Date(),
  };

  // Upsert by prospectId + productId
  const existing = resolvedProductId
    ? await db
        .select({ id: contactIntelligenceTable.id })
        .from(contactIntelligenceTable)
        .where(
          and(
            eq(contactIntelligenceTable.prospectId, prospectId),
            eq(contactIntelligenceTable.productId, resolvedProductId),
          ),
        )
        .limit(1)
    : await db
        .select({ id: contactIntelligenceTable.id })
        .from(contactIntelligenceTable)
        .where(eq(contactIntelligenceTable.prospectId, prospectId))
        .limit(1);

  let record;
  if (existing.length > 0) {
    const [updated] = await db
      .update(contactIntelligenceTable)
      .set(values)
      .where(eq(contactIntelligenceTable.id, existing[0].id))
      .returning();
    record = updated;
  } else {
    const [inserted] = await db
      .insert(contactIntelligenceTable)
      .values(values)
      .returning();
    record = inserted;
  }

  return record;
}

// ─── GET /api/contact-intelligence ───────────────────────────────────────────

router.get("/contact-intelligence", async (req, res) => {
  const { productId, verificationStatus, tab } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(contactIntelligenceTable);

  if (productId) {
    rows = rows.filter((r) => r.productId === productId);
  }
  if (verificationStatus) {
    rows = rows.filter((r) => r.verificationStatus === verificationStatus);
  }
  if (tab === "email") {
    rows = rows.filter((r) => r.businessEmail);
  } else if (tab === "website") {
    rows = rows.filter((r) => r.websiteUrl);
  } else if (tab === "social") {
    rows = rows.filter((r) => r.instagramUrl || r.tiktokUrl || r.linkedinUrl);
  } else if (tab === "missing") {
    rows = rows.filter(
      (r) => !r.businessEmail && !r.instagramUrl && !r.tiktokUrl && !r.websiteUrl,
    );
  } else if (tab === "verified") {
    rows = rows.filter((r) => r.verificationStatus === "verified" || r.verificationStatus === "likely");
  }

  res.json(rows);
});

// ─── GET /api/contact-intelligence/metrics ────────────────────────────────────

router.get("/contact-intelligence/metrics", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(contactIntelligenceTable);
  if (productId) rows = rows.filter((r) => r.productId === productId);

  const total = rows.length;
  const emailFound = rows.filter((r) => r.businessEmail).length;
  const websiteFound = rows.filter((r) => r.websiteUrl).length;
  const socialFound = rows.filter(
    (r) => r.instagramUrl || r.tiktokUrl || r.linkedinUrl,
  ).length;
  const highReadiness = rows.filter((r) => r.contactReadinessScore >= 60).length;
  const missing = rows.filter(
    (r) => !r.businessEmail && !r.instagramUrl && !r.tiktokUrl && !r.websiteUrl,
  ).length;
  const verified = rows.filter(
    (r) => r.verificationStatus === "verified" || r.verificationStatus === "likely",
  ).length;

  // Qualified count from qualifications table
  let qualifiedCount = 0;
  try {
    const [result] = await db
      .select({ c: count() })
      .from(partnerQualificationsTable)
      .where(
        productId
          ? eq(partnerQualificationsTable.productId, productId)
          : eq(partnerQualificationsTable.qualificationStatus, "qualified"),
      );
    qualifiedCount = Number(result?.c ?? 0);
  } catch {
    qualifiedCount = 0;
  }

  res.json({
    qualifiedCreators: qualifiedCount,
    contactsFound: total,
    emailsFound: emailFound,
    websiteFound,
    socialFound,
    highReadiness,
    missing,
    verified,
  });
});

// ─── POST /api/contact-intelligence/discover ─────────────────────────────────

router.post("/contact-intelligence/discover", async (req, res) => {
  const { prospectId, productId } = req.body as { prospectId?: string; productId?: string };
  if (!prospectId || typeof prospectId !== "string") {
    res.status(400).json({ error: "prospectId (UUID) required" });
    return;
  }

  const record = await discoverForProspect(prospectId, productId ?? null);

  if (!record) {
    res.status(404).json({ error: "Prospect not found" });
    return;
  }

  res.json(record);
});

// ─── POST /api/contact-intelligence/discover-batch ───────────────────────────

router.post("/contact-intelligence/discover-batch", async (req, res) => {
  const { productId } = req.body as { productId?: string };
  if (!productId || typeof productId !== "string") {
    res.status(400).json({ error: "productId (UUID) required" });
    return;
  }

  // Find all qualified prospects for this product
  const qualRows = await db
    .select({ prospectId: partnerQualificationsTable.prospectId })
    .from(partnerQualificationsTable)
    .where(eq(partnerQualificationsTable.productId, productId));

  const results = await Promise.all(
    qualRows.map((q) => discoverForProspect(q.prospectId, productId)),
  );

  const succeeded = results.filter(Boolean).length;

  res.json({
    processed: qualRows.length,
    succeeded,
    failed: qualRows.length - succeeded,
  });
});

// ─── PATCH /api/contact-intelligence/:id/verify ──────────────────────────────

const VALID_VERIFY_STATUSES = ["verified", "likely", "unverified", "missing"] as const;
type VerifyStatus = typeof VALID_VERIFY_STATUSES[number];

router.patch("/contact-intelligence/:id/verify", async (req, res) => {
  const { verificationStatus } = req.body as { verificationStatus?: string };
  if (!verificationStatus || !VALID_VERIFY_STATUSES.includes(verificationStatus as VerifyStatus)) {
    res.status(400).json({ error: "verificationStatus is required (verified | likely | unverified | missing)" });
    return;
  }

  const [updated] = await db
    .update(contactIntelligenceTable)
    .set({
      verificationStatus: verificationStatus as VerifyStatus,
      updatedAt: new Date(),
    })
    .where(eq(contactIntelligenceTable.id, req.params.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Contact intelligence record not found" });
    return;
  }

  res.json(updated);
});

// ─── GET /api/contact-intelligence/export ────────────────────────────────────

router.get("/contact-intelligence/export", async (req, res) => {
  const { productId } = req.query as Record<string, string | undefined>;

  let rows = await db.select().from(contactIntelligenceTable);
  if (productId) rows = rows.filter((r) => r.productId === productId);

  // Join prospect name
  const prospectIds = [...new Set(rows.map((r) => r.prospectId).filter(Boolean))] as string[];
  const prospects = prospectIds.length
    ? await db
        .select({ id: partnerProspectsTable.id, name: partnerProspectsTable.name, platform: partnerProspectsTable.platform })
        .from(partnerProspectsTable)
    : [];
  const prospectMap = new Map(prospects.map((p) => [p.id, p]));

  const headers = [
    "id",
    "prospect_name",
    "platform",
    "business_email",
    "website_url",
    "instagram_url",
    "tiktok_url",
    "linkedin_url",
    "contact_page_url",
    "youtube_url",
    "contact_readiness_score",
    "confidence_score",
    "verification_status",
    "created_at",
  ];

  const csvRows = rows.map((r) => {
    const p = prospectMap.get(r.prospectId ?? "");
    return [
      r.id,
      p?.name ?? "",
      p?.platform ?? "",
      r.businessEmail ?? "",
      r.websiteUrl ?? "",
      r.instagramUrl ?? "",
      r.tiktokUrl ?? "",
      r.linkedinUrl ?? "",
      r.contactPageUrl ?? "",
      r.youtubeUrl ?? "",
      r.contactReadinessScore,
      r.confidenceScore,
      r.verificationStatus,
      r.createdAt.toISOString(),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  const csv = [headers.join(","), ...csvRows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="contact-intelligence-${Date.now()}.csv"`,
  );
  res.send(csv);
});

export default router;
