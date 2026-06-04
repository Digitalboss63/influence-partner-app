import {
  pgTable,
  pgEnum,
  text,
  integer,
  real,
  boolean,
  timestamp,
  uuid,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Enums ───────────────────────────────────────────────────────────────────

export const platformEnum = pgEnum("platform", [
  "YouTube",
  "Instagram",
  "TikTok",
]);

export const creatorTypeEnum = pgEnum("creator_type", [
  "Micro",
  "Mid-Tier",
  "Macro",
  "Celebrity",
]);

export const fitLabelEnum = pgEnum("fit_label", [
  "Excellent Partner",
  "Strong Fit",
  "Possible Fit",
  "Low Priority",
]);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "New",
  "Contacted",
  "Interested",
  "Negotiating",
  "Active",
  "Rejected",
]);

export const outreachChannelEnum = pgEnum("outreach_channel", [
  "Email",
  "Instagram DM",
  "TikTok DM",
  "YouTube Sponsorship",
]);

export const outreachToneEnum = pgEnum("outreach_tone", [
  "Direct",
  "Friendly",
  "Professional",
  "High-Commission Offer",
]);

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  website: text("website").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  targetCustomer: text("target_customer").notNull(),
  mainBenefit: text("main_benefit").notNull(),
  price: text("price").notNull(),
  commissionOffer: integer("commission_offer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectProductSchema = createSelectSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

// ─── Product Intelligence Snapshots ──────────────────────────────────────────

export const productIntelligenceSnapshotsTable = pgTable(
  "product_intelligence_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    isCurrent: boolean("is_current").notNull().default(true),
    mainMarket: text("main_market"),
    subMarket: text("sub_market"),
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
    estimatedPartnerAcquisitionPotential: text(
      "estimated_partner_acquisition_potential",
    ),
    partnerAcquisitionReason: text("partner_acquisition_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export const insertProductIntelligenceSnapshotSchema = createInsertSchema(
  productIntelligenceSnapshotsTable,
).omit({ id: true, createdAt: true });
export type InsertProductIntelligenceSnapshot = z.infer<
  typeof insertProductIntelligenceSnapshotSchema
>;
export type ProductIntelligenceSnapshot =
  typeof productIntelligenceSnapshotsTable.$inferSelect;

// ─── Creators ─────────────────────────────────────────────────────────────────

export const creatorsTable = pgTable("creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  handle: text("handle").notNull().unique(),
  platform: platformEnum("platform").notNull(),
  niche: text("niche").notNull(),
  creatorType: creatorTypeEnum("creator_type").notNull(),
  followerCount: integer("follower_count").notNull(),
  engagementRate: real("engagement_rate").notNull(),
  audienceMatch: integer("audience_match").notNull(),
  platformFit: integer("platform_fit").notNull(),
  productFit: integer("product_fit").notNull(),
  competitiveConflict: integer("competitive_conflict").notNull(),
  avatarUrl: text("avatar_url"),
  audienceFitSummary: text("audience_fit_summary").notNull(),
  platformFitSummary: text("platform_fit_summary").notNull(),
  engagementQuality: text("engagement_quality").notNull(),
  competitorSignal: text("competitor_signal").notNull(),
  productGapOpportunity: text("product_gap_opportunity").notNull(),
  whyGoodFit: text("why_good_fit").notNull(),
  suggestedDealStructure: text("suggested_deal_structure").notNull(),
  suggestedOutreachAngle: text("suggested_outreach_angle").notNull(),
  recommendedDeal: text("recommended_deal").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCreatorSchema = createInsertSchema(creatorsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectCreatorSchema = createSelectSchema(creatorsTable);
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type Creator = typeof creatorsTable.$inferSelect;

// ─── Creator Scores (per-product) ────────────────────────────────────────────

export const creatorScoresTable = pgTable(
  "creator_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creatorsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    fitScore: integer("fit_score").notNull(),
    fitLabel: fitLabelEnum("fit_label").notNull(),
    suggestedCommission: text("suggested_commission").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    unq: uniqueIndex("creator_scores_creator_product_unq").on(
      t.creatorId,
      t.productId,
    ),
  }),
);

export const insertCreatorScoreSchema = createInsertSchema(
  creatorScoresTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreatorScore = z.infer<typeof insertCreatorScoreSchema>;
export type CreatorScore = typeof creatorScoresTable.$inferSelect;

// ─── Pipeline Entries ─────────────────────────────────────────────────────────

export const pipelineEntriesTable = pgTable(
  "pipeline_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => creatorsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    stage: pipelineStageEnum("stage").notNull().default("New"),
    notes: text("notes"),
    lastContactedAt: timestamp("last_contacted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    unq: uniqueIndex("pipeline_entries_creator_product_unq").on(
      t.creatorId,
      t.productId,
    ),
  }),
);

export const insertPipelineEntrySchema = createInsertSchema(
  pipelineEntriesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPipelineEntry = z.infer<typeof insertPipelineEntrySchema>;
export type PipelineEntry = typeof pipelineEntriesTable.$inferSelect;

// ─── Pipeline Events (stage change audit trail) ────────────────────────────────

export const pipelineEventsTable = pgTable("pipeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  pipelineEntryId: uuid("pipeline_entry_id")
    .notNull()
    .references(() => pipelineEntriesTable.id, { onDelete: "cascade" }),
  fromStage: pipelineStageEnum("from_stage"),
  toStage: pipelineStageEnum("to_stage").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPipelineEventSchema = createInsertSchema(
  pipelineEventsTable,
).omit({ id: true, createdAt: true });
export type InsertPipelineEvent = z.infer<typeof insertPipelineEventSchema>;
export type PipelineEvent = typeof pipelineEventsTable.$inferSelect;

// ─── Partner Targets ─────────────────────────────────────────────────────────

export const partnerTargetStatusEnum = pgEnum("partner_target_status", [
  "Not Contacted",
  "Contacted",
  "Replied",
  "Meeting Scheduled",
  "Negotiating",
  "Active Partner",
  "Rejected",
]);

export const partnerTargetsTable = pgTable("partner_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  partnerCategory: text("partner_category").notNull(),
  name: text("name").notNull(),
  company: text("company"),
  platform: text("platform"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  socialUrl: text("social_url"),
  notes: text("notes"),
  status: partnerTargetStatusEnum("status").notNull().default("Not Contacted"),
  userId: text("user_id"),
  organizationId: text("organization_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPartnerTargetSchema = createInsertSchema(
  partnerTargetsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartnerTarget = z.infer<typeof insertPartnerTargetSchema>;
export type PartnerTarget = typeof partnerTargetsTable.$inferSelect;
export type PartnerTargetStatus = typeof partnerTargetStatusEnum.enumValues[number];

// ─── Outreach Messages ────────────────────────────────────────────────────────

export const outreachMessagesTable = pgTable("outreach_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  creatorId: uuid("creator_id")
    .notNull()
    .references(() => creatorsTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  channel: outreachChannelEnum("channel").notNull(),
  tone: outreachToneEnum("tone").notNull(),
  subjectLine: text("subject_line"),
  message: text("message").notNull(),
  followUp: text("follow_up"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOutreachMessageSchema = createInsertSchema(
  outreachMessagesTable,
).omit({ id: true, createdAt: true });
export type InsertOutreachMessage = z.infer<typeof insertOutreachMessageSchema>;
export type OutreachMessage = typeof outreachMessagesTable.$inferSelect;
