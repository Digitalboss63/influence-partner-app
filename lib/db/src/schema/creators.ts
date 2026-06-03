import { pgTable, text, real, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";

// ─── Creators ────────────────────────────────────────────────────────────────

export const creatorsTable = pgTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform", { enum: ["YouTube", "Instagram", "TikTok"] }).notNull(),
  niche: text("niche").notNull(),
  creatorType: text("creator_type", {
    enum: ["Micro", "Mid-Tier", "Macro", "Celebrity"],
  }).notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  avatarUrl: text("avatar_url"),

  // Score input dimensions (raw scores 0–100)
  audienceMatch: integer("audience_match").notNull().default(0),
  platformFit: integer("platform_fit").notNull().default(0),
  productFit: integer("product_fit").notNull().default(0),
  competitiveConflict: integer("competitive_conflict").notNull().default(0),

  // Qualitative fields
  audienceFitSummary: text("audience_fit_summary"),
  platformFitSummary: text("platform_fit_summary"),
  engagementQuality: text("engagement_quality"),
  competitorSignal: text("competitor_signal"),
  productGapOpportunity: text("product_gap_opportunity"),
  whyGoodFit: text("why_good_fit"),
  suggestedDealStructure: text("suggested_deal_structure"),
  suggestedOutreachAngle: text("suggested_outreach_angle"),
  recommendedDeal: text("recommended_deal"),

  // Source tracking
  source: text("source").notNull().default("manual"), // "manual" | "discovered" | "imported"
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCreatorSchema = createInsertSchema(creatorsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectCreatorSchema = createSelectSchema(creatorsTable);

export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creatorsTable.$inferSelect;

// ─── Creator Scores (per-product) ────────────────────────────────────────────
// CRITICAL DESIGN CONSTRAINT:
// Scores are ALWAYS per-product. A creator may score 92 for a fitness app
// and 34 for a finance tool. Never use a single global fit score.

export const creatorScoresTable = pgTable("creator_scores", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creatorsTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),

  // Computed scores
  fitScore: real("fit_score").notNull().default(0),          // 0–100 composite
  audienceMatch: real("audience_match").notNull().default(0),
  platformFit: real("platform_fit").notNull().default(0),
  productFit: real("product_fit").notNull().default(0),
  engagementScore: real("engagement_score").notNull().default(0),
  conflictScore: real("conflict_score").notNull().default(0),

  fitLabel: text("fit_label", {
    enum: ["Excellent Partner", "Strong Fit", "Possible Fit", "Low Priority"],
  }).notNull().default("Low Priority"),
  suggestedCommission: text("suggested_commission"),

  // Source of scores: "formula" | "llm" | "manual_override"
  scoringMethod: text("scoring_method").notNull().default("formula"),
  scoreNotes: text("score_notes"),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CreatorScore = typeof creatorScoresTable.$inferSelect;
