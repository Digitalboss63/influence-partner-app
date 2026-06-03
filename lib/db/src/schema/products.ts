import { pgTable, text, real, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Products ────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  targetCustomer: text("target_customer").notNull(),
  mainBenefit: text("main_benefit").notNull(),
  price: text("price").notNull(),
  commissionOffer: real("commission_offer").notNull(),
  status: text("status", { enum: ["draft", "active", "archived"] })
    .notNull()
    .default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const selectProductSchema = createSelectSchema(productsTable);

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

// ─── Product Intelligence Snapshots ──────────────────────────────────────────
// Versioned cache of intelligence analysis per product.
// LLM-backed fields go here when the intelligence engine is upgraded.

export const productIntelligenceSnapshotsTable = pgTable(
  "product_intelligence_snapshots",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),

    // Analysis fields (deterministic engine output — replaceable by LLM)
    mainMarket: text("main_market"),
    subMarket: text("sub_market"),
    mainNiche: text("main_niche"),
    subNiches: jsonb("sub_niches").$type<string[]>(),
    idealCreatorTypes: jsonb("ideal_creator_types").$type<string[]>(),
    recommendedPlatforms: jsonb("recommended_platforms").$type<string[]>(),
    buyerPersona: jsonb("buyer_persona"),
    recommendedCreatorCategories: jsonb("recommended_creator_categories"),
    outreachAngle: text("outreach_angle"),
    whyTheseCreators: text("why_these_creators"),
    marketDifficulty: text("market_difficulty"),
    marketDifficultyReason: text("market_difficulty_reason"),
    competitionLevel: text("competition_level"),
    competitionReason: text("competition_reason"),
    campaignOpportunityRating: text("campaign_opportunity_rating"),
    campaignOpportunityReason: text("campaign_opportunity_reason"),
    revenuePotentialLabel: text("revenue_potential_label"),
    revenuePotentialMonthly: text("revenue_potential_monthly"),
    revenuePotentialReason: text("revenue_potential_reason"),
    estimatedPartnerAcquisitionPotential: text("estimated_partner_acquisition_potential"),
    partnerAcquisitionReason: text("partner_acquisition_reason"),
    recommendedCommissionRange: text("recommended_commission_range"),

    // Source tracking: "deterministic" | "llm" | "manual"
    source: text("source").notNull().default("deterministic"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  }
);

export type ProductIntelligenceSnapshot =
  typeof productIntelligenceSnapshotsTable.$inferSelect;
