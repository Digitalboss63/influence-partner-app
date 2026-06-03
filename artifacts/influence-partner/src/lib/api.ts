/**
 * API client for the Express backend.
 *
 * Phase 2 Sprint 1: Compatibility adapter.
 *
 * The frontend currently uses AppContext + localStorage as its data layer.
 * This module provides API-backed alternatives for each data type.
 * Pages can migrate one at a time from AppContext to these hooks.
 *
 * IMPORTANT: Do not modify AppContext or any existing page logic.
 * These hooks are ADDITIVE — they can be dropped in as replacements
 * when a page is ready to migrate.
 *
 * Shape contract: API responses are converted to match the frontend's
 * existing Creator and Product types exactly, so no page code needs to change.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Creator, Product, PipelineStage } from "@/types/influencePartner";
import {
  computeFitScore,
  getFitLabel,
  getSuggestedCommission,
} from "@/lib/scoring";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }
  const json = await res.json() as { data: T };
  return json.data;
}

// ─── Products ─────────────────────────────────────────────────────────────────

export const productsApi = {
  list: (): Promise<Product[]> => apiFetch<Product[]>("/products"),
  get: (id: string): Promise<Product> => apiFetch<Product>(`/products/${id}`),
  create: (payload: Omit<Product, "createdAt" | "updatedAt">): Promise<Product> =>
    apiFetch<Product>("/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<Product>): Promise<Product> =>
    apiFetch<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  delete: (id: string): Promise<void> =>
    apiFetch<void>(`/products/${id}`, { method: "DELETE" }),
};

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: productsApi.list,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: ["products", id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      productsApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ─── Creators ─────────────────────────────────────────────────────────────────

type RawCreator = Omit<Creator, "fitScore" | "fitLabel" | "suggestedCommission">;

function enrichCreator(raw: RawCreator): Creator {
  const fitScore = computeFitScore(raw);
  const fitLabel = getFitLabel(fitScore);
  return {
    ...raw,
    fitScore,
    fitLabel,
    suggestedCommission: getSuggestedCommission(fitLabel),
  };
}

export const creatorsApi = {
  list: async (): Promise<Creator[]> => {
    const raws = await apiFetch<RawCreator[]>("/creators");
    return raws.map(enrichCreator);
  },
  get: async (id: string): Promise<Creator> => {
    const raw = await apiFetch<RawCreator>(`/creators/${id}`);
    return enrichCreator(raw);
  },
};

export function useCreators() {
  return useQuery<Creator[]>({
    queryKey: ["creators"],
    queryFn: creatorsApi.list,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreator(id: string) {
  return useQuery<Creator>({
    queryKey: ["creators", id],
    queryFn: () => creatorsApi.get(id),
    enabled: !!id,
  });
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

interface PipelineEntry {
  id: string;
  productId: string;
  creatorId: string;
  stage: PipelineStage;
  notes: string | null;
  proposedRate: number | null;
  agreedRate: number | null;
}

export const pipelineApi = {
  list: (filters?: { productId?: string; creatorId?: string; stage?: string }) => {
    const params = new URLSearchParams();
    if (filters?.productId) params.set("productId", filters.productId);
    if (filters?.creatorId) params.set("creatorId", filters.creatorId);
    if (filters?.stage) params.set("stage", filters.stage);
    const qs = params.toString();
    return apiFetch<PipelineEntry[]>(`/pipeline${qs ? `?${qs}` : ""}`);
  },
  updateStage: (id: string, stage: PipelineStage, note?: string) =>
    apiFetch<PipelineEntry>(`/pipeline/${id}`, {
      method: "PUT",
      body: JSON.stringify({ stage, stageNote: note }),
    }),
  create: (payload: Omit<PipelineEntry, "id" | "agreedRate">) =>
    apiFetch<PipelineEntry>("/pipeline", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export function usePipeline(filters?: { productId?: string; stage?: string }) {
  return useQuery<PipelineEntry[]>({
    queryKey: ["pipeline", filters],
    queryFn: () => pipelineApi.list(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdatePipelineStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, note }: { id: string; stage: PipelineStage; note?: string }) =>
      pipelineApi.updateStage(id, stage, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pipeline"] }),
  });
}
