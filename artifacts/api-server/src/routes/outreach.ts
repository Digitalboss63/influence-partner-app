import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  outreachMessagesTable,
  insertOutreachMessageSchema,
} from "@workspace/db";

const router: IRouter = Router();

router.get("/outreach", async (req, res) => {
  const { productId, creatorId } = req.query as Record<string, string | undefined>;

  let rows;
  if (productId && creatorId) {
    rows = await db
      .select()
      .from(outreachMessagesTable)
      .where(
        and(
          eq(outreachMessagesTable.productId, productId),
          eq(outreachMessagesTable.creatorId, creatorId),
        ),
      );
  } else if (productId) {
    rows = await db
      .select()
      .from(outreachMessagesTable)
      .where(eq(outreachMessagesTable.productId, productId));
  } else if (creatorId) {
    rows = await db
      .select()
      .from(outreachMessagesTable)
      .where(eq(outreachMessagesTable.creatorId, creatorId));
  } else {
    rows = await db
      .select()
      .from(outreachMessagesTable)
      .orderBy(outreachMessagesTable.createdAt);
  }

  res.json(rows);
});

router.get("/outreach/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .select()
    .from(outreachMessagesTable)
    .where(eq(outreachMessagesTable.id, id));
  if (rows.length === 0) {
    res.status(404).json({ error: "Outreach message not found" });
    return;
  }
  res.json(rows[0]);
});

router.post("/outreach", async (req, res) => {
  const parsed = insertOutreachMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [message] = await db
    .insert(outreachMessagesTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(message);
});

router.delete("/outreach/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db
    .delete(outreachMessagesTable)
    .where(eq(outreachMessagesTable.id, id))
    .returning();
  if (rows.length === 0) {
    res.status(404).json({ error: "Outreach message not found" });
    return;
  }
  res.json({ deleted: true, id });
});

export default router;
