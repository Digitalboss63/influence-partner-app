import { pgTable, text, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { creatorsTable } from "./creators";
import { productsTable } from "./products";

// ─── Pipeline Entries ─────────────────────────────────────────────────────────
// Represents a creator-product relationship with current stage.
// One entry per creator × product combination.

export const pipelineEntriesTable = pgTable("pipeline_entries", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creatorsTable.id, { onDelete: "cascade" }),
  stage: text("stage", {
    enum: ["New", "Contacted", "Interested", "Negotiating", "Active", "Rejected"],
  }).notNull().default("New"),
  notes: text("notes"),

  // Deal terms (captured when stage = Active)
  proposedRate: real("proposed_rate"),
  agreedRate: real("agreed_rate"),
  dealType: text("deal_type"), // "Revenue Share" | "CPA" | "Flat Fee" | "Hybrid"
  dealStartDate: timestamp("deal_start_date", { withTimezone: true }),
  dealEndDate: timestamp("deal_end_date", { withTimezone: true }),

  priority: text("priority", { enum: ["High", "Medium", "Low"] })
    .notNull()
    .default("Medium"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPipelineEntrySchema = createInsertSchema(pipelineEntriesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertPipelineEntry = z.infer<typeof insertPipelineEntrySchema>;
export type PipelineEntry = typeof pipelineEntriesTable.$inferSelect;

// ─── Pipeline Events (audit trail) ───────────────────────────────────────────
// Immutable log of every stage transition.

export const pipelineEventsTable = pgTable("pipeline_events", {
  id: text("id").primaryKey(),
  pipelineEntryId: text("pipeline_entry_id")
    .notNull()
    .references(() => pipelineEntriesTable.id, { onDelete: "cascade" }),
  fromStage: text("from_stage"),
  toStage: text("to_stage").notNull(),
  note: text("note"),
  metadata: jsonb("metadata"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PipelineEvent = typeof pipelineEventsTable.$inferSelect;

// ─── Outreach Messages ────────────────────────────────────────────────────────

export const outreachMessagesTable = pgTable("outreach_messages", {
  id: text("id").primaryKey(),
  pipelineEntryId: text("pipeline_entry_id").references(
    () => pipelineEntriesTable.id,
    { onDelete: "set null" }
  ),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creatorsTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),

  subject: text("subject"),
  body: text("body").notNull(),
  tone: text("tone", {
    enum: ["Direct", "Friendly", "Professional", "High-Commission Offer"],
  }),
  channel: text("channel", {
    enum: ["Email", "Instagram DM", "TikTok DM", "YouTube Sponsorship"],
  }).notNull().default("Email"),
  status: text("status", {
    enum: ["draft", "sent", "replied", "ignored"],
  }).notNull().default("draft"),

  // Generation metadata
  generationMethod: text("generation_method").notNull().default("template"), // "template" | "llm"
  sentAt: timestamp("sent_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutreachMessageSchema = createInsertSchema(outreachMessagesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertOutreachMessage = z.infer<typeof insertOutreachMessageSchema>;
export type OutreachMessage = typeof outreachMessagesTable.$inferSelect;
