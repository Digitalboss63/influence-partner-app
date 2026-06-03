import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable, insertProductSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/products", async (_req, res) => {
  const products = await db.select().from(productsTable).orderBy(productsTable.createdAt);
  res.json(products);
});

router.get("/products/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db.select().from(productsTable).where(eq(productsTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(rows[0]);
});

router.post("/products", async (req, res) => {
  const parsed = insertProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [product] = await db.insert(productsTable).values(parsed.data).returning();
  res.status(201).json(product);
});

router.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = insertProductSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const rows = await db
    .update(productsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(productsTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(rows[0]);
});

router.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
