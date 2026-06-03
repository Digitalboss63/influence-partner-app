import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, productsTable, productIntelligenceSnapshotsTable } from "@workspace/db";
import { generateId } from "../lib/id";
import { validateBody } from "../lib/validate";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  website: z.string().min(1),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(100),
  targetCustomer: z.string().min(1).max(500),
  mainBenefit: z.string().min(1).max(500),
  price: z.string().min(1),
  commissionOffer: z.number().min(0).max(100),
  status: z.enum(["draft", "active", "archived"]).optional().default("active"),
  // Intelligence fields (may be provided when importing from mock data)
  mainNiche: z.string().optional(),
  subNiches: z.array(z.string()).optional(),
  idealCreatorTypes: z.array(z.string()).optional(),
  recommendedPlatforms: z.array(z.string()).optional(),
  outreachAngle: z.string().optional(),
  mainMarket: z.string().optional(),
  subMarket: z.string().optional(),
});

const UpdateProductSchema = CreateProductSchema.partial().omit({ id: true });

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/products */
router.get("/", async (_req, res, next) => {
  try {
    const rows = await db.select().from(productsTable);
    res.json({ data: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

/** GET /api/products/:id */
router.get("/:id", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** POST /api/products */
router.post("/", validateBody(CreateProductSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof CreateProductSchema>;
    const id = body.id ?? generateId("prod");
    const now = new Date();

    await db.insert(productsTable).values({
      id,
      name: body.name,
      website: body.website,
      description: body.description,
      category: body.category,
      targetCustomer: body.targetCustomer,
      mainBenefit: body.mainBenefit,
      price: body.price,
      commissionOffer: body.commissionOffer,
      status: body.status ?? "active",
      createdAt: now,
      updatedAt: now,
    });

    const rows = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .limit(1);

    res.status(201).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/products/:id */
router.put("/:id", validateBody(UpdateProductSchema), async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const body = req.body as z.infer<typeof UpdateProductSchema>;
    await db
      .update(productsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(productsTable.id, String(req.params.id)));

    const updated = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .limit(1);

    res.json({ data: updated[0] });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/products/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    const existing = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, String(req.params.id)))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    await db.delete(productsTable).where(eq(productsTable.id, String(req.params.id)));
    res.json({ success: true, deleted: String(req.params.id) });
  } catch (err) {
    next(err);
  }
});

export default router;
