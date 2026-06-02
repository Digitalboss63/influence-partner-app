/**
 * React Query hooks for products, creators, and pipeline.
 * Drop-in replacement for any hardcoded mock data.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  productsApi,
  creatorsApi,
  pipelineApi,
  type Product,
  type Creator,
  type PipelineItem,
} from "./api";

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  products: {
    all: ["products"] as const,
    detail: (id: string) => ["products", id] as const,
  },
  creators: {
    all: ["creators"] as const,
    filtered: (filters: Record<string, unknown>) => ["creators", filters] as const,
    detail: (id: string) => ["creators", id] as const,
  },
  pipeline: {
    all: ["pipeline"] as const,
    filtered: (filters: Record<string, unknown>) => ["pipeline", filters] as const,
    detail: (id: string) => ["pipeline", id] as const,
    messages: (id: string) => ["pipeline", id, "messages"] as const,
    allMessages: ["pipeline", "messages", "all"] as const,
  },
};

// ─── Products Hooks ──────────────────────────────────────────────────────────

export function useProducts(options?: UseQueryOptions<Product[]>) {
  return useQuery<Product[]>({
    queryKey: queryKeys.products.all,
    queryFn: productsApi.list,
    staleTime: 1000 * 60 * 5, // 5 minutes
    ...options,
  });
}

export function useProduct(id: string) {
  return useQuery<Product>({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      productsApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(id) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}

// ─── Creators Hooks ──────────────────────────────────────────────────────────

export function useCreators(filters?: {
  platform?: string;
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
}) {
  return useQuery<Creator[]>({
    queryKey: filters ? queryKeys.creators.filtered(filters) : queryKeys.creators.all,
    queryFn: () => creatorsApi.list(filters),
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreator(id: string) {
  return useQuery<Creator>({
    queryKey: queryKeys.creators.detail(id),
    queryFn: () => creatorsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: creatorsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}

export function useUpdateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Creator> }) =>
      creatorsApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.detail(id) });
    },
  });
}

export function useDeleteCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: creatorsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
    },
  });
}

// ─── Pipeline Hooks ──────────────────────────────────────────────────────────

export function usePipeline(filters?: {
  productId?: string;
  creatorId?: string;
  status?: string;
}) {
  return useQuery<PipelineItem[]>({
    queryKey: filters ? queryKeys.pipeline.filtered(filters) : queryKeys.pipeline.all,
    queryFn: () => pipelineApi.list(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function usePipelineItem(id: string) {
  return useQuery<PipelineItem>({
    queryKey: queryKeys.pipeline.detail(id),
    queryFn: () => pipelineApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePipelineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pipelineApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
    },
  });
}

export function useUpdatePipelineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PipelineItem> }) =>
      pipelineApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.detail(id) });
    },
  });
}

export function useDeletePipelineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: pipelineApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pipeline.all });
    },
  });
}

export function usePipelineMessages(pipelineItemId: string) {
  return useQuery({
    queryKey: queryKeys.pipeline.messages(pipelineItemId),
    queryFn: () => pipelineApi.getMessages(pipelineItemId),
    enabled: !!pipelineItemId,
  });
}

export function useAllOutreachMessages() {
  return useQuery({
    queryKey: queryKeys.pipeline.allMessages,
    queryFn: pipelineApi.getAllMessages,
    staleTime: 1000 * 60 * 2,
  });
}
