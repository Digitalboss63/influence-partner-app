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
  audienceSize: text("audience_size"),
  contentAngle: text("content_angle"),
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

// ─── Partner Prospects (Discovery Workspace) ──────────────────────────────────

export const partnerProspectStatusEnum = pgEnum("partner_prospect_status", [
  "New Prospect",
  "Qualified",
  "Rejected",
  "Added To Targets",
]);

export const partnerProspectsTable = pgTable("partner_prospects", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  company: text("company"),
  platform: text("platform"),
  partnerCategory: text("partner_category"),
  website: text("website"),
  email: text("email"),
  socialUrl: text("social_url"),
  audienceSize: text("audience_size"),
  notes: text("notes"),
  source: text("source").notNull().default("Manual"),
  status: partnerProspectStatusEnum("status").notNull().default("New Prospect"),
  userId: text("user_id"),
  organizationId: text("organization_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPartnerProspectSchema = createInsertSchema(
  partnerProspectsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartnerProspect = z.infer<typeof insertPartnerProspectSchema>;
export type PartnerProspect = typeof partnerProspectsTable.$inferSelect;
export type PartnerProspectStatus =
  typeof partnerProspectStatusEnum.enumValues[number];

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

// ─── Partner Qualifications ───────────────────────────────────────────────────

export const qualificationStatusEnum = pgEnum("qualification_status", [
  "unreviewed",
  "qualified",
  "rejected",
  "starred",
  "archived",
]);

export const qualificationLabelEnum = pgEnum("qualification_label", [
  "Ready to Pitch",
  "Promising",
  "Needs Review",
  "Not Qualified",
]);

export const partnerQualificationsTable = pgTable(
  "partner_qualifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => partnerProspectsTable.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    partnerFitScore: integer("partner_fit_score").notNull(),
    audienceMatchScore: integer("audience_match_score").notNull(),
    brandSafetyScore: integer("brand_safety_score").notNull(),
    partnershipReadinessScore: integer("partnership_readiness_score").notNull(),
    responseProbabilityScore: integer("response_probability_score").notNull(),
    contentRelevanceScore: integer("content_relevance_score").notNull(),
    qualificationLabel: qualificationLabelEnum("qualification_label").notNull(),
    qualificationStatus: qualificationStatusEnum("qualification_status")
      .notNull()
      .default("unreviewed"),
    hardFlags: jsonb("hard_flags"),
    scoreReasons: jsonb("score_reasons"),
    nextBestAction: text("next_best_action").notNull(),
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    unq: uniqueIndex("partner_qualifications_prospect_product_unq").on(
      t.prospectId,
      t.productId,
    ),
  }),
);

export const insertPartnerQualificationSchema = createInsertSchema(
  partnerQualificationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartnerQualification = z.infer<typeof insertPartnerQualificationSchema>;
export type PartnerQualification = typeof partnerQualificationsTable.$inferSelect;
export type QualificationStatus = typeof qualificationStatusEnum.enumValues[number];
export type QualificationLabel = typeof qualificationLabelEnum.enumValues[number];

// ─── Outreach Operations ──────────────────────────────────────────────────────

export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "ready",
  "sent",
  "replied",
  "interested",
  "negotiating",
  "converted",
  "declined",
  "inactive",
]);

export const outreachPriorityEnum = pgEnum("outreach_priority", [
  "low",
  "medium",
  "high",
]);

export const outreachContactMethodEnum = pgEnum("outreach_contact_method", [
  "Email",
  "Instagram DM",
  "TikTok DM",
  "LinkedIn",
  "Website Contact Form",
]);

export const outreachOperationsTable = pgTable("outreach_operations", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetId: uuid("target_id").references(() => partnerTargetsTable.id, {
    onDelete: "set null",
  }),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  campaignId: uuid("campaign_id").references(() => campaignsTable.id, {
    onDelete: "set null",
  }),
  creatorName: text("creator_name").notNull(),
  contactMethod: outreachContactMethodEnum("contact_method").notNull(),
  contactDestination: text("contact_destination"),
  outreachSubject: text("outreach_subject"),
  outreachMessage: text("outreach_message"),
  outreachStatus: outreachStatusEnum("outreach_status").notNull().default("draft"),
  priority: outreachPriorityEnum("priority").notNull().default("medium"),
  sentAt: timestamp("sent_at"),
  followUpDue: timestamp("follow_up_due"),
  lastActivityAt: timestamp("last_activity_at"),
  repliedAt: timestamp("replied_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOutreachOperationSchema = createInsertSchema(
  outreachOperationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOutreachOperation = z.infer<
  typeof insertOutreachOperationSchema
>;
export type OutreachOperation = typeof outreachOperationsTable.$inferSelect;
export type OutreachStatus = typeof outreachStatusEnum.enumValues[number];
export type OutreachPriority = typeof outreachPriorityEnum.enumValues[number];
export type OutreachContactMethod =
  typeof outreachContactMethodEnum.enumValues[number];

// ─── Performance Intelligence ─────────────────────────────────────────────────

export const creatorPerformanceTable = pgTable("creator_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetId: uuid("target_id").references(() => partnerTargetsTable.id, {
    onDelete: "set null",
  }),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  creatorName: text("creator_name").notNull(),
  partnerFitScore: integer("partner_fit_score"),
  contactReadinessScore: integer("contact_readiness_score"),
  outreachSentCount: integer("outreach_sent_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  interestedCount: integer("interested_count").notNull().default(0),
  negotiationCount: integer("negotiation_count").notNull().default(0),
  conversionCount: integer("conversion_count").notNull().default(0),
  estimatedRevenue: real("estimated_revenue"),
  actualRevenue: real("actual_revenue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const campaignPerformanceTable = pgTable("campaign_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  campaignName: text("campaign_name").notNull(),
  outreachCount: integer("outreach_count").notNull().default(0),
  replies: integer("replies").notNull().default(0),
  interested: integer("interested").notNull().default(0),
  negotiations: integer("negotiations").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  conversionRate: real("conversion_rate"),
  estimatedRevenue: real("estimated_revenue"),
  actualRevenue: real("actual_revenue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const goalTypeEnum = pgEnum("goal_type", [
  "creators_contacted",
  "replies",
  "interested",
  "negotiations",
  "conversions",
  "estimated_revenue",
  "actual_revenue",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "on_track",
  "behind",
  "achieved",
]);

export const performanceGoalsTable = pgTable("performance_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  goalType: goalTypeEnum("goal_type").notNull(),
  targetValue: real("target_value").notNull(),
  currentValue: real("current_value").notNull().default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: goalStatusEnum("status").notNull().default("on_track"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPerformanceGoalSchema = createInsertSchema(
  performanceGoalsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPerformanceGoal = z.infer<typeof insertPerformanceGoalSchema>;
export type PerformanceGoal = typeof performanceGoalsTable.$inferSelect;
export type GoalType = typeof goalTypeEnum.enumValues[number];
export type GoalStatus = typeof goalStatusEnum.enumValues[number];

export const insertCreatorPerformanceSchema = createInsertSchema(
  creatorPerformanceTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCreatorPerformance = z.infer<
  typeof insertCreatorPerformanceSchema
>;
export type CreatorPerformance =
  typeof creatorPerformanceTable.$inferSelect;

export const insertCampaignPerformanceSchema = createInsertSchema(
  campaignPerformanceTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaignPerformance = z.infer<
  typeof insertCampaignPerformanceSchema
>;
export type CampaignPerformance =
  typeof campaignPerformanceTable.$inferSelect;

// ─── Contact Intelligence ─────────────────────────────────────────────────────

export const verificationStatusEnum = pgEnum("verification_status", [
  "verified",
  "likely",
  "unverified",
  "missing",
]);

export const contactIntelligenceTable = pgTable("contact_intelligence", {
  id: uuid("id").primaryKey().defaultRandom(),
  prospectId: uuid("prospect_id").references(() => partnerProspectsTable.id, {
    onDelete: "cascade",
  }),
  creatorId: uuid("creator_id").references(() => creatorsTable.id, {
    onDelete: "cascade",
  }),
  qualificationId: uuid("qualification_id").references(
    () => partnerQualificationsTable.id,
    { onDelete: "set null" },
  ),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  businessEmail: text("business_email"),
  websiteUrl: text("website_url"),
  instagramUrl: text("instagram_url"),
  tiktokUrl: text("tiktok_url"),
  linkedinUrl: text("linkedin_url"),
  contactPageUrl: text("contact_page_url"),
  youtubeUrl: text("youtube_url"),
  confidenceScore: integer("confidence_score").notNull().default(0),
  contactReadinessScore: integer("contact_readiness_score").notNull().default(0),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("unverified"),
  sourceData: jsonb("source_data"),
  auditNotes: jsonb("audit_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContactIntelligenceSchema = createInsertSchema(
  contactIntelligenceTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertContactIntelligence = z.infer<
  typeof insertContactIntelligenceSchema
>;
export type ContactIntelligence = typeof contactIntelligenceTable.$inferSelect;
export type VerificationStatus =
  typeof verificationStatusEnum.enumValues[number];

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaignStatusEnum = pgEnum("campaign_status", [
  "planning",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const campaignTypeEnum = pgEnum("campaign_type", [
  "awareness",
  "affiliate",
  "sponsorship",
  "launch",
  "review",
  "custom",
]);

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "identified",
  "contacted",
  "interested",
  "negotiating",
  "contracted",
  "completed",
  "declined",
]);

export const campaignsTable = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  objective: text("objective").notNull(),
  campaignType: campaignTypeEnum("campaign_type").default("custom"),
  budget: integer("budget").notNull().default(0),
  targetCreatorCount: integer("target_creator_count").notNull().default(0),
  assignedCreatorCount: integer("assigned_creator_count").notNull().default(0),
  status: campaignStatusEnum("status").notNull().default("planning"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
export type CampaignStatus = typeof campaignStatusEnum.enumValues[number];
export type CampaignType = typeof campaignTypeEnum.enumValues[number];

export const campaignCreatorsTable = pgTable("campaign_creators", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id")
    .notNull()
    .references(() => campaignsTable.id, { onDelete: "cascade" }),
  targetId: uuid("target_id").references(() => partnerTargetsTable.id, {
    onDelete: "set null",
  }),
  creatorName: text("creator_name").notNull(),
  assignmentStatus: assignmentStatusEnum("assignment_status")
    .notNull()
    .default("identified"),
  deliverables: jsonb("deliverables").$type<string[]>().default([]),
  estimatedValue: integer("estimated_value").default(0),
  actualValue: integer("actual_value").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCampaignCreatorSchema = createInsertSchema(
  campaignCreatorsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaignCreator = z.infer<typeof insertCampaignCreatorSchema>;
export type CampaignCreator = typeof campaignCreatorsTable.$inferSelect;
export type AssignmentStatus = typeof assignmentStatusEnum.enumValues[number];

// ─── Qualification Feedback ───────────────────────────────────────────────────

export const feedbackTypeEnum = pgEnum("feedback_type", [
  "accurate",
  "too_high",
  "too_low",
]);

export const qualificationFeedbackTable = pgTable("qualification_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  qualificationId: uuid("qualification_id")
    .notNull()
    .references(() => partnerQualificationsTable.id, { onDelete: "cascade" }),
  feedbackType: feedbackTypeEnum("feedback_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQualificationFeedbackSchema = createInsertSchema(
  qualificationFeedbackTable,
).omit({ id: true, createdAt: true });
export type InsertQualificationFeedback = z.infer<typeof insertQualificationFeedbackSchema>;
export type QualificationFeedback = typeof qualificationFeedbackTable.$inferSelect;
export type FeedbackType = typeof feedbackTypeEnum.enumValues[number];
