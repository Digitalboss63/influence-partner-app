import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, persistDb, schema } from "../db";
import { validateBody } from "../lib/validate";
import { generateId } from "../lib/id";

const router = Router();
const { creators } = schema;

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateCreatorSchema = z.object({
  name: z.string().min(1).max(200),
  handle: z.string().min(1).max(100),
  platform: z.enum(["instagram", "youtube", "tiktok", "twitter", "other"]),
  niche: z.string().min(1).max(200),
  followerCount: z.number().int().nonnegative().default(0),
  engagementRate: z.number().nonnegative().default(0),
  avgViews: z.number().int().nonnegative().optional().nullable(),
  avgLikes: z.number().int().nonnegative().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  email: z.string().email().optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  profileImageUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  audienceDemographics: z.record(z.unknown()).optional().nullable(),
  priceRange: z.string().max(100).optional().nullable(),
  isVerified: z.boolean().default(false),
});

const UpdateCreatorSchema = CreateCreatorSchema.partial();

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/creators */
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const { platform, niche, minFollowers, maxFollowers } = req.query;
    let rows = db.select().from(creators).all();

    if (platform && typeof platform === "string") {
      rows = rows.filter((r) => r.platform === platform);
    }
    if (niche && typeof niche === "string") {
      const n = niche.toLowerCase();
      rows = rows.filter((r) => r.niche.toLowerCase().includes(n));
    }
    if (minFollowers) {
      rows = rows.filter((r) => r.followerCount >= Number(minFollowers));
    }
    if (maxFollowers) {
      rows = rows.filter((r) => r.followerCount <= Number(maxFollowers));
    }

    res.json({ data: rows.map(deserializeCreator), count: rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch creators", detail: String(err) });
  }
});

/** GET /api/creators/:id */
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.select().from(creators).where(eq(creators.id, req.params.id)).get();
    if (!row) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    res.json({ data: deserializeCreator(row) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch creator", detail: String(err) });
  }
});

/** POST /api/creators */
router.post("/", validateBody(CreateCreatorSchema), (req, res) => {
  try {
    const db = getDb();
    const body = req.body as z.infer<typeof CreateCreatorSchema>;
    const now = Date.now();
    const newCreator = {
      id: generateId("cre"),
      name: body.name,
      handle: body.handle,
      platform: body.platform,
      niche: body.niche,
      followerCount: body.followerCount ?? 0,
      engagementRate: body.engagementRate ?? 0,
      avgViews: body.avgViews ?? null,
      avgLikes: body.avgLikes ?? null,
      location: body.location ?? null,
      email: body.email ?? null,
      bio: body.bio ?? null,
      profileImageUrl: body.profileImageUrl ?? null,
      priceRange: body.priceRange ?? null,
      isVerified: body.isVerified ? 1 : 0,
      tags: body.tags ? JSON.stringify(body.tags) : null,
      audienceDemographics: body.audienceDemographics
        ? JSON.stringify(body.audienceDemographics)
        : null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(creators).values(newCreator).run();
    persistDb();
    const created = db.select().from(creators).where(eq(creators.id, newCreator.id)).get()!;
    res.status(201).json({ data: deserializeCreator(created) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create creator", detail: String(err) });
  }
});

/** PUT /api/creators/:id */
router.put("/:id", validateBody(UpdateCreatorSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(creators).where(eq(creators.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    const body = req.body as z.infer<typeof UpdateCreatorSchema>;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    const directFields = [
      "name", "handle", "platform", "niche", "followerCount",
      "engagementRate", "avgViews", "avgLikes", "location",
      "email", "bio", "profileImageUrl", "priceRange", "isVerified",
    ] as const;

    for (const field of directFields) {
      if (body[field] !== undefined) {
        if (field === "isVerified") {
          updates[field] = body[field] ? 1 : 0;
        } else {
          updates[field] = body[field];
        }
      }
    }
    if (body.tags !== undefined) updates.tags = body.tags ? JSON.stringify(body.tags) : null;
    if (body.audienceDemographics !== undefined) {
      updates.audienceDemographics = body.audienceDemographics
        ? JSON.stringify(body.audienceDemographics)
        : null;
    }

    db.update(creators).set(updates).where(eq(creators.id, req.params.id)).run();
    persistDb();
    const updated = db.select().from(creators).where(eq(creators.id, req.params.id)).get()!;
    res.json({ data: deserializeCreator(updated) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update creator", detail: String(err) });
  }
});

/** DELETE /api/creators/:id */
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(creators).where(eq(creators.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Creator not found" });
      return;
    }
    db.delete(creators).where(eq(creators.id, req.params.id)).run();
    persistDb();
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete creator", detail: String(err) });
  }
});

// ─── Serialization ────────────────────────────────────────────────────────────

function deserializeCreator(row: typeof creators.$inferSelect) {
  return {
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
    audienceDemographics: row.audienceDemographics
      ? JSON.parse(row.audienceDemographics)
      : null,
    createdAt: typeof row.createdAt === "number"
      ? new Date(row.createdAt).toISOString()
      : String(row.createdAt),
    updatedAt: typeof row.updatedAt === "number"
      ? new Date(row.updatedAt).toISOString()
      : String(row.updatedAt),
  };
}

export default router;
