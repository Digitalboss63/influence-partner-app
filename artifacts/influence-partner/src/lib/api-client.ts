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
