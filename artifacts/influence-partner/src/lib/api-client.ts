import { PipelineStage } from "@/types/influencePartner";

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
