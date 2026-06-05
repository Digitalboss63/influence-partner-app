import { PipelineStage, PartnerTargetStatus, PartnerProspectStatus } from "@/types/influencePartner";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      (err as { error?: string } | null)?.error ?? `HTTP ${res.status}`,
    );
  }
  return res.json();
}

export interface ApiCreator {
  id: string;
  name: string;
  handle: string;
  platform: "YouTube" | "Instagram" | "TikTok";
  niche: string;
  creatorType: "Micro" | "Mid-Tier" | "Macro" | "Celebrity";
  followerCount: number;
  engagementRate: number;
  audienceMatch: number;
  platformFit: number;
  productFit: number;
  competitiveConflict: number;
  avatarUrl?: string | null;
  audienceFitSummary: string;
  platformFitSummary: string;
  engagementQuality: string;
  competitorSignal: string;
  productGapOpportunity: string;
  whyGoodFit: string;
  suggestedDealStructure: string;
  suggestedOutreachAngle: string;
  recommendedDeal: string;
}

export interface ApiPipelineEntry {
  id: string;
  creatorId: string;
  productId: string;
  stage: string;
  notes: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProduct {
  id: string;
  name: string;
  website: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  website: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
}

export const getCreators = (): Promise<ApiCreator[]> =>
  request<ApiCreator[]>("/creators");

export const getPipeline = (): Promise<ApiPipelineEntry[]> =>
  request<ApiPipelineEntry[]>("/pipeline");

export const getProducts = (): Promise<ApiProduct[]> =>
  request<ApiProduct[]>("/products");

export const createProduct = (payload: CreateProductPayload): Promise<ApiProduct> =>
  request<ApiProduct>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updatePipelineEntry = (
  entryId: string,
  stage: PipelineStage,
): Promise<ApiPipelineEntry> =>
  request<ApiPipelineEntry>(`/pipeline/${entryId}`, {
    method: "PUT",
    body: JSON.stringify({ stage }),
  });

// ─── Partner Targets ─────────────────────────────────────────────────────────

export interface ApiPartnerTarget {
  id: string;
  productId: string;
  partnerCategory: string;
  name: string;
  company: string | null;
  platform: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  socialUrl: string | null;
  notes: string | null;
  status: PartnerTargetStatus;
  userId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerTargetPayload {
  productId: string;
  partnerCategory: string;
  name: string;
  company?: string;
  platform?: string;
  website?: string;
  email?: string;
  phone?: string;
  socialUrl?: string;
  notes?: string;
  status?: PartnerTargetStatus;
}

export const getTargets = (params?: {
  productId?: string;
  status?: string;
  partnerCategory?: string;
}): Promise<ApiPartnerTarget[]> => {
  const qs = new URLSearchParams();
  if (params?.productId) qs.set("productId", params.productId);
  if (params?.status) qs.set("status", params.status);
  if (params?.partnerCategory) qs.set("partnerCategory", params.partnerCategory);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPartnerTarget[]>(`/targets${query}`);
};

export const createTarget = (
  payload: CreatePartnerTargetPayload,
): Promise<ApiPartnerTarget> =>
  request<ApiPartnerTarget>("/targets", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateTarget = (
  id: string,
  payload: Partial<CreatePartnerTargetPayload>,
): Promise<ApiPartnerTarget> =>
  request<ApiPartnerTarget>(`/targets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteTarget = (id: string): Promise<{ deleted: boolean; id: string }> =>
  request<{ deleted: boolean; id: string }>(`/targets/${id}`, {
    method: "DELETE",
  });

// ─── Partner Prospects ────────────────────────────────────────────────────────

export interface ApiPartnerProspect {
  id: string;
  name: string;
  company: string | null;
  platform: string | null;
  partnerCategory: string | null;
  website: string | null;
  email: string | null;
  socialUrl: string | null;
  audienceSize: string | null;
  notes: string | null;
  source: string;
  status: PartnerProspectStatus;
  userId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerProspectPayload {
  name: string;
  company?: string;
  platform?: string;
  partnerCategory?: string;
  website?: string;
  email?: string;
  socialUrl?: string;
  audienceSize?: string;
  notes?: string;
  source?: string;
  status?: PartnerProspectStatus;
}

export const getProspects = (params?: {
  status?: string;
  partnerCategory?: string;
}): Promise<ApiPartnerProspect[]> => {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.partnerCategory) qs.set("partnerCategory", params.partnerCategory);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiPartnerProspect[]>(`/prospects${query}`);
};

export const createProspect = (
  payload: CreatePartnerProspectPayload,
): Promise<ApiPartnerProspect> =>
  request<ApiPartnerProspect>("/prospects", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProspect = (
  id: string,
  payload: Partial<CreatePartnerProspectPayload>,
): Promise<ApiPartnerProspect> =>
  request<ApiPartnerProspect>(`/prospects/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteProspect = (id: string): Promise<{ deleted: boolean; id: string }> =>
  request<{ deleted: boolean; id: string }>(`/prospects/${id}`, {
    method: "DELETE",
  });

// ─── Partner Qualifications ───────────────────────────────────────────────────

export type QualificationStatus = "unreviewed" | "qualified" | "rejected" | "starred" | "archived";
export type QualificationLabel = "Ready to Pitch" | "Promising" | "Needs Review" | "Not Qualified";

export interface ScoreReasons {
  audienceMatch: string[];
  brandSafety: string[];
  partnershipReadiness: string[];
  responseProbability: string[];
  contentRelevance: string[];
}

export interface ApiQualification {
  id: string;
  prospectId: string;
  productId: string;
  partnerFitScore: number;
  audienceMatchScore: number;
  brandSafetyScore: number;
  partnershipReadinessScore: number;
  responseProbabilityScore: number;
  contentRelevanceScore: number;
  qualificationLabel: QualificationLabel;
  qualificationStatus: QualificationStatus;
  hardFlags: string[] | null;
  scoreReasons: ScoreReasons | null;
  nextBestAction: string;
  contactEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiQueueItem {
  prospect: ApiPartnerProspect;
  qualification: ApiQualification | null;
}

export interface ApiQualMetrics {
  discovered: number;
  scored: number;
  readyToPitch: number;
  promising: number;
  needsReview: number;
  notQualified: number;
  starred: number;
  rejected: number;
  approved: number;
  targets: number;
}

export const getQualificationQueue = (productId: string): Promise<ApiQueueItem[]> =>
  request<ApiQueueItem[]>(`/qualification/queue?productId=${productId}`);

export const qualifyProspect = (
  prospectId: string,
  productId: string,
): Promise<ApiQualification> =>
  request<ApiQualification>("/qualification/qualify", {
    method: "POST",
    body: JSON.stringify({ prospectId, productId }),
  });

export const qualifyBatch = (productId: string): Promise<{ qualified: number; qualifications: ApiQualification[] }> =>
  request<{ qualified: number; qualifications: ApiQualification[] }>("/qualification/qualify-batch", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });

export const updateQualificationStatus = (
  id: string,
  status: QualificationStatus,
): Promise<ApiQualification> =>
  request<ApiQualification>(`/qualification/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const approveQualification = (
  id: string,
): Promise<{ target: ApiPartnerTarget; qualificationId: string }> =>
  request<{ target: ApiPartnerTarget; qualificationId: string }>(`/qualification/${id}/approve`, {
    method: "POST",
  });

export const getQualificationMetrics = (productId: string): Promise<ApiQualMetrics> =>
  request<ApiQualMetrics>(`/qualification/metrics?productId=${productId}`);

export type FeedbackType = "accurate" | "too_high" | "too_low";

export const submitQualificationFeedback = (
  qualId: string,
  feedbackType: FeedbackType,
): Promise<{ id: string }> =>
  request<{ id: string }>(`/qualification/${qualId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ feedbackType }),
  });

export const bulkQualificationAction = (
  ids: string[],
  action: "approve" | "reject" | "star" | "archive",
): Promise<{ processed: number }> =>
  request<{ processed: number }>(`/qualification/bulk-action`, {
    method: "POST",
    body: JSON.stringify({ ids, action }),
  });

// ─── Outreach Operations ──────────────────────────────────────────────────────

export type OutreachStatus =
  | "draft" | "ready" | "sent" | "replied"
  | "interested" | "negotiating" | "converted" | "declined" | "inactive";

export type OutreachPriority = "low" | "medium" | "high";

export type OutreachContactMethod =
  | "Email" | "Instagram DM" | "TikTok DM" | "LinkedIn" | "Website Contact Form";

export interface ApiOutreachOperation {
  id: string;
  targetId: string | null;
  productId: string | null;
  creatorName: string;
  contactMethod: OutreachContactMethod;
  contactDestination: string | null;
  outreachSubject: string | null;
  outreachMessage: string | null;
  outreachStatus: OutreachStatus;
  priority: OutreachPriority;
  sentAt: string | null;
  followUpDue: string | null;
  lastActivityAt: string | null;
  repliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOutreachMetrics {
  drafts: number;
  ready: number;
  sent: number;
  replied: number;
  interested: number;
  negotiating: number;
  converted: number;
  declined: number;
  inactive: number;
  total: number;
  followUp: { overdue: number; dueToday: number; dueThisWeek: number };
}

export interface CreateOutreachOperationPayload {
  creatorName: string;
  contactMethod: OutreachContactMethod;
  contactDestination?: string;
  outreachSubject?: string;
  outreachMessage?: string;
  outreachStatus?: OutreachStatus;
  priority?: OutreachPriority;
  targetId?: string;
  productId?: string;
  notes?: string;
  followUpDue?: string;
}

export const getOutreachOperations = (params?: {
  productId?: string;
  status?: OutreachStatus | "all";
}): Promise<ApiOutreachOperation[]> => {
  const qs = new URLSearchParams();
  if (params?.productId) qs.set("productId", params.productId);
  if (params?.status && params.status !== "all") qs.set("status", params.status);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiOutreachOperation[]>(`/outreach-operations${q}`);
};

export const getOutreachMetrics = (productId?: string): Promise<ApiOutreachMetrics> => {
  const qs = new URLSearchParams();
  if (productId) qs.set("productId", productId);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiOutreachMetrics>(`/outreach-operations/metrics${q}`);
};

export const createOutreachOperation = (
  payload: CreateOutreachOperationPayload,
): Promise<ApiOutreachOperation> =>
  request<ApiOutreachOperation>("/outreach-operations", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateOutreachOperation = (
  id: string,
  payload: Partial<CreateOutreachOperationPayload & { outreachStatus: OutreachStatus }>,
): Promise<ApiOutreachOperation> =>
  request<ApiOutreachOperation>(`/outreach-operations/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteOutreachOperation = (id: string): Promise<{ deleted: boolean; id: string }> =>
  request<{ deleted: boolean; id: string }>(`/outreach-operations/${id}`, {
    method: "DELETE",
  });

// ─── Contact Intelligence ─────────────────────────────────────────────────────

export type VerificationStatus = "verified" | "likely" | "unverified" | "missing";

export interface ApiContactIntelligence {
  id: string;
  prospectId: string | null;
  creatorId: string | null;
  qualificationId: string | null;
  productId: string | null;
  businessEmail: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  contactPageUrl: string | null;
  youtubeUrl: string | null;
  confidenceScore: number;
  contactReadinessScore: number;
  verificationStatus: VerificationStatus;
  sourceData: Record<string, string[]> | null;
  auditNotes: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiContactMetrics {
  qualifiedCreators: number;
  contactsFound: number;
  emailsFound: number;
  websiteFound: number;
  socialFound: number;
  highReadiness: number;
  missing: number;
  verified: number;
}

export type ContactTab = "all" | "email" | "website" | "social" | "missing" | "verified";

export const getContactIntelligence = (params?: {
  productId?: string;
  tab?: ContactTab;
}): Promise<ApiContactIntelligence[]> => {
  const qs = new URLSearchParams();
  if (params?.productId) qs.set("productId", params.productId);
  if (params?.tab && params.tab !== "all") qs.set("tab", params.tab);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiContactIntelligence[]>(`/contact-intelligence${q}`);
};

export const getContactMetrics = (productId?: string): Promise<ApiContactMetrics> => {
  const qs = new URLSearchParams();
  if (productId) qs.set("productId", productId);
  const q = qs.toString() ? `?${qs.toString()}` : "";
  return request<ApiContactMetrics>(`/contact-intelligence/metrics${q}`);
};

export const discoverContact = (
  prospectId: string,
  productId?: string,
): Promise<ApiContactIntelligence> =>
  request<ApiContactIntelligence>("/contact-intelligence/discover", {
    method: "POST",
    body: JSON.stringify({ prospectId, productId }),
  });

export const discoverContactsBatch = (
  productId: string,
): Promise<{ processed: number; succeeded: number; failed: number }> =>
  request<{ processed: number; succeeded: number; failed: number }>(
    "/contact-intelligence/discover-batch",
    { method: "POST", body: JSON.stringify({ productId }) },
  );

export const verifyContact = (
  id: string,
  verificationStatus: VerificationStatus,
): Promise<ApiContactIntelligence> =>
  request<ApiContactIntelligence>(`/contact-intelligence/${id}/verify`, {
    method: "PATCH",
    body: JSON.stringify({ verificationStatus }),
  });

export const exportContactIntelligenceCsv = (productId?: string): string => {
  const qs = new URLSearchParams();
  if (productId) qs.set("productId", productId);
  return `/api/contact-intelligence/export${qs.toString() ? `?${qs.toString()}` : ""}`;
};

// ─── YouTube Discovery ────────────────────────────────────────────────────────

export interface YouTubeChannel {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  subscriberCountHidden: boolean;
  channelUrl: string;
  customUrl: string | null;
  description: string;
  thumbnailUrl: string;
  discoveryScore: number;
  discoveryLabel: "Excellent" | "Good" | "Moderate" | "Low";
  searchRank: number;
  latestVideoTitle: string | null;
  latestVideoPublishedAt: string | null;
}

export interface YouTubeSearchResponse {
  channels: YouTubeChannel[];
  total: number;
}

export const youtubeSearch = (params: {
  keyword: string;
  partnerCategory?: string;
  minimumSubscribers?: number;
}): Promise<YouTubeSearchResponse> => {
  const qs = new URLSearchParams({ keyword: params.keyword });
  if (params.partnerCategory) qs.set("partnerCategory", params.partnerCategory);
  if (params.minimumSubscribers) qs.set("minimumSubscribers", String(params.minimumSubscribers));
  return request<YouTubeSearchResponse>(`/youtube/search?${qs.toString()}`);
};
