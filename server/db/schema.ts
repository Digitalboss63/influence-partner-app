/**
 * Drizzle ORM schema — sql.js (SQLite) driver.
 * All timestamps stored as INTEGER (Unix ms epoch).
 * JSON fields stored as TEXT (serialized).
 */

import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Products ────────────────────────────────────────────────────────────────

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  url: text("url"),
  imageUrl: text("image_url"),
  targetAudience: text("target_audience"),
  keyBenefits: text("key_benefits"),   // JSON array as text
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Product Intelligence Snapshots ──────────────────────────────────────────

export const productIntelligenceSnapshots = sqliteTable(
  "product_intelligence_snapshots",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    targetAudienceAnalysis: text("target_audience_analysis"),
    contentAngles: text("content_angles"),         // JSON array as text
    competitorLandscape: text("competitor_landscape"),
    pricingPosition: text("pricing_position"),
    bestCreatorProfile: text("best_creator_profile"), // JSON object as text
    source: text("source").notNull().default("mock"), // "mock" | "llm" | "manual"
    createdAt: integer("created_at").notNull(),
  }
);

// ─── Creators ────────────────────────────────────────────────────────────────

export const creators = sqliteTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  platform: text("platform").notNull(),
  niche: text("niche").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  engagementRate: real("engagement_rate").notNull().default(0),
  avgViews: integer("avg_views"),
  avgLikes: integer("avg_likes"),
  location: text("location"),
  email: text("email"),
  bio: text("bio"),
  profileImageUrl: text("profile_image_url"),
  tags: text("tags"),                           // JSON array as text
  audienceDemographics: text("audience_demographics"), // JSON object as text
  priceRange: text("price_range"),
  isVerified: integer("is_verified").notNull().default(0), // 0 | 1
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Creator Scores (per-product) ────────────────────────────────────────────
// IMPORTANT: Scores are always product-specific, never global static scores.

export const creatorScores = sqliteTable("creator_scores", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  overallScore: real("overall_score").notNull().default(0),
  audienceFitScore: real("audience_fit_score").notNull().default(0),
  engagementScore: real("engagement_score").notNull().default(0),
  nicheRelevanceScore: real("niche_relevance_score").notNull().default(0),
  reachScore: real("reach_score").notNull().default(0),
  scoringMethod: text("scoring_method").notNull().default("mock"), // "mock" | "llm" | "formula"
  scoreNotes: text("score_notes"),
  computedAt: integer("computed_at").notNull(),
});

// ─── Pipeline Items ───────────────────────────────────────────────────────────

export const pipelineItems = sqliteTable("pipeline_items", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("New"),
  // Allowed: "New" | "Contacted" | "Interested" | "Negotiating" | "Active" | "Rejected"
  notes: text("notes"),
  proposedRate: real("proposed_rate"),
  agreedRate: real("agreed_rate"),
  campaignBrief: text("campaign_brief"),
  expectedDeliveryDate: integer("expected_delivery_date"),
  priority: integer("priority").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// ─── Outreach Messages ────────────────────────────────────────────────────────

export const outreachMessages = sqliteTable("outreach_messages", {
  id: text("id").primaryKey(),
  pipelineItemId: text("pipeline_item_id").notNull().references(() => pipelineItems.id, { onDelete: "cascade" }),
  creatorId: text("creator_id").notNull().references(() => creators.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  subject: text("subject"),
  body: text("body").notNull(),
  channel: text("channel").notNull().default("email"),
  direction: text("direction").notNull().default("outbound"),
  status: text("status").notNull().default("draft"),
  sentAt: integer("sent_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
