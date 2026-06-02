import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, persistDb, schema } from "../db";
import { validateBody } from "../lib/validate";
import { generateId } from "../lib/id";

const router = Router();
const { products } = schema;

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(100),
  price: z.number().positive(),
  url: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  targetAudience: z.string().max(500).optional().nullable(),
  keyBenefits: z.array(z.string()).optional().nullable(),
});

const UpdateProductSchema = CreateProductSchema.partial();

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/products */
router.get("/", (_req, res) => {
  try {
    const db = getDb();
    const rows = db.select().from(products).all();
    const parsed = rows.map(deserializeProduct);
    res.json({ data: parsed, count: parsed.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products", detail: String(err) });
  }
});

/** GET /api/products/:id */
router.get("/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.select().from(products).where(eq(products.id, req.params.id)).get();
    if (!row) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json({ data: deserializeProduct(row) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product", detail: String(err) });
  }
});

/** POST /api/products */
router.post("/", validateBody(CreateProductSchema), (req, res) => {
  try {
    const db = getDb();
    const body = req.body as z.infer<typeof CreateProductSchema>;
    const now = Date.now();
    const newProduct = {
      id: generateId("prod"),
      name: body.name,
      description: body.description,
      category: body.category,
      price: body.price,
      url: body.url ?? null,
      imageUrl: body.imageUrl ?? null,
      targetAudience: body.targetAudience ?? null,
      keyBenefits: body.keyBenefits ? JSON.stringify(body.keyBenefits) : null,
      createdAt: now,
      updatedAt: now,
    };
    db.insert(products).values(newProduct).run();
    persistDb();
    const created = db.select().from(products).where(eq(products.id, newProduct.id)).get()!;
    res.status(201).json({ data: deserializeProduct(created) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create product", detail: String(err) });
  }
});

/** PUT /api/products/:id */
router.put("/:id", validateBody(UpdateProductSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(products).where(eq(products.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const body = req.body as z.infer<typeof UpdateProductSchema>;
    const updates: Record<string, unknown> = { updatedAt: Date.now() };

    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.price !== undefined) updates.price = body.price;
    if (body.url !== undefined) updates.url = body.url ?? null;
    if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl ?? null;
    if (body.targetAudience !== undefined) updates.targetAudience = body.targetAudience ?? null;
    if (body.keyBenefits !== undefined) {
      updates.keyBenefits = body.keyBenefits ? JSON.stringify(body.keyBenefits) : null;
    }

    db.update(products).set(updates).where(eq(products.id, req.params.id)).run();
    persistDb();
    const updated = db.select().from(products).where(eq(products.id, req.params.id)).get()!;
    res.json({ data: deserializeProduct(updated) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product", detail: String(err) });
  }
});

/** DELETE /api/products/:id */
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const existing = db.select().from(products).where(eq(products.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    db.delete(products).where(eq(products.id, req.params.id)).run();
    persistDb();
    res.json({ success: true, deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product", detail: String(err) });
  }
});

// ─── Serialization ────────────────────────────────────────────────────────────

function deserializeProduct(row: typeof products.$inferSelect) {
  return {
    ...row,
    keyBenefits: row.keyBenefits ? JSON.parse(row.keyBenefits) : [],
    createdAt: typeof row.createdAt === "number"
      ? new Date(row.createdAt).toISOString()
      : String(row.createdAt),
    updatedAt: typeof row.updatedAt === "number"
      ? new Date(row.updatedAt).toISOString()
      : String(row.updatedAt),
  };
}

export default router;
