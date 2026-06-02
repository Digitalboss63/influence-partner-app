/**
 * API client — thin axios wrapper for the Express backend.
 * All functions return typed responses.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ─── Response types ──────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  url: string | null;
  imageUrl: string | null;
  targetAudience: string | null;
  keyBenefits: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  platform: "instagram" | "youtube" | "tiktok" | "twitter" | "other";
  niche: string;
  followerCount: number;
  engagementRate: number;
  avgViews: number | null;
  avgLikes: number | null;
  location: string | null;
  email: string | null;
  bio: string | null;
  profileImageUrl: string | null;
  tags: string[];
  audienceDemographics: Record<string, unknown> | null;
  priceRange: string | null;
  isVerified: number;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineItem {
  id: string;
  productId: string;
  creatorId: string;
  status: "New" | "Contacted" | "Interested" | "Negotiating" | "Active" | "Rejected";
  notes: string | null;
  proposedRate: number | null;
  agreedRate: number | null;
  campaignBrief: string | null;
  expectedDeliveryDate: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachMessage {
  id: string;
  pipelineItemId: string;
  creatorId: string;
  productId: string;
  subject: string | null;
  body: string;
  channel: string;
  direction: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Products API ────────────────────────────────────────────────────────────

export const productsApi = {
  list: async (): Promise<Product[]> => {
    const { data } = await apiClient.get<{ data: Product[] }>("/api/products");
    return data.data;
  },
  get: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get<{ data: Product }>(`/api/products/${id}`);
    return data.data;
  },
  create: async (payload: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> => {
    const { data } = await apiClient.post<{ data: Product }>("/api/products", payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.put<{ data: Product }>(`/api/products/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/products/${id}`);
  },
};

// ─── Creators API ────────────────────────────────────────────────────────────

export const creatorsApi = {
  list: async (filters?: {
    platform?: string;
    niche?: string;
    minFollowers?: number;
    maxFollowers?: number;
  }): Promise<Creator[]> => {
    const { data } = await apiClient.get<{ data: Creator[] }>("/api/creators", {
      params: filters,
    });
    return data.data;
  },
  get: async (id: string): Promise<Creator> => {
    const { data } = await apiClient.get<{ data: Creator }>(`/api/creators/${id}`);
    return data.data;
  },
  create: async (payload: Omit<Creator, "id" | "createdAt" | "updatedAt">): Promise<Creator> => {
    const { data } = await apiClient.post<{ data: Creator }>("/api/creators", payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<Creator>): Promise<Creator> => {
    const { data } = await apiClient.put<{ data: Creator }>(`/api/creators/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/creators/${id}`);
  },
};

// ─── Pipeline API ────────────────────────────────────────────────────────────

export const pipelineApi = {
  list: async (filters?: {
    productId?: string;
    creatorId?: string;
    status?: string;
  }): Promise<PipelineItem[]> => {
    const { data } = await apiClient.get<{ data: PipelineItem[] }>("/api/pipeline", {
      params: filters,
    });
    return data.data;
  },
  get: async (id: string): Promise<PipelineItem> => {
    const { data } = await apiClient.get<{ data: PipelineItem }>(`/api/pipeline/${id}`);
    return data.data;
  },
  create: async (payload: Omit<PipelineItem, "id" | "createdAt" | "updatedAt">): Promise<PipelineItem> => {
    const { data } = await apiClient.post<{ data: PipelineItem }>("/api/pipeline", payload);
    return data.data;
  },
  update: async (id: string, payload: Partial<PipelineItem>): Promise<PipelineItem> => {
    const { data } = await apiClient.put<{ data: PipelineItem }>(`/api/pipeline/${id}`, payload);
    return data.data;
  },
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/pipeline/${id}`);
  },
  getMessages: async (pipelineItemId: string): Promise<OutreachMessage[]> => {
    const { data } = await apiClient.get<{ data: OutreachMessage[] }>(
      `/api/pipeline/${pipelineItemId}/messages`
    );
    return data.data;
  },
  getAllMessages: async (): Promise<OutreachMessage[]> => {
    const { data } = await apiClient.get<{ data: OutreachMessage[] }>(
      `/api/pipeline/messages/all`
    );
    return data.data;
  },
};
