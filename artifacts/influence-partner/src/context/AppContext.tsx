import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Creator, Product, PipelineStage, ProductForm } from "@/types/influencePartner";
import { computeFitScore, getFitLabel, getSuggestedCommission } from "@/lib/scoring";
import { generateProductIntelligence } from "@/lib/productIntelligence";
import {
  getCreators,
  getPipeline,
  getProducts,
  createProduct,
  updatePipelineEntry,
  type ApiCreator,
  type ApiPipelineEntry,
  type ApiProduct,
} from "@/lib/api-client";

interface AppContextValue {
  creators: Creator[];
  products: Product[];
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  updateCreatorStage: (creatorId: string, stage: PipelineStage) => void;
  addProduct: (product: Product) => Promise<Product>;
}

const AppContext = createContext<AppContextValue | null>(null);

function toFrontendCreator(c: ApiCreator, pipeline: ApiPipelineEntry[]): Creator {
  const fitScore = computeFitScore({
    audienceMatch: c.audienceMatch,
    engagementRate: c.engagementRate,
    platformFit: c.platformFit,
    productFit: c.productFit,
    competitiveConflict: c.competitiveConflict,
  });
  const fitLabel = getFitLabel(fitScore);
  const suggestedCommission = getSuggestedCommission(fitLabel);
  const entry = pipeline.find((e) => e.creatorId === c.id);
  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    platform: c.platform,
    niche: c.niche,
    creatorType: c.creatorType,
    followerCount: c.followerCount,
    engagementRate: c.engagementRate,
    audienceMatch: c.audienceMatch,
    platformFit: c.platformFit,
    productFit: c.productFit,
    competitiveConflict: c.competitiveConflict,
    avatarUrl: c.avatarUrl ?? undefined,
    audienceFitSummary: c.audienceFitSummary,
    platformFitSummary: c.platformFitSummary,
    engagementQuality: c.engagementQuality,
    competitorSignal: c.competitorSignal,
    productGapOpportunity: c.productGapOpportunity,
    whyGoodFit: c.whyGoodFit,
    suggestedDealStructure: c.suggestedDealStructure,
    suggestedOutreachAngle: c.suggestedOutreachAngle,
    recommendedDeal: c.recommendedDeal,
    fitScore,
    fitLabel,
    suggestedCommission,
    pipelineStage: (entry?.stage ?? "New") as PipelineStage,
  };
}

function toFrontendProduct(p: ApiProduct): Product {
  const formData: ProductForm = {
    name: p.name,
    website: p.website,
    description: p.description,
    category: p.category,
    targetCustomer: p.targetCustomer,
    mainBenefit: p.mainBenefit,
    price: p.price,
    commissionOffer: p.commissionOffer,
  };
  return { id: p.id, ...formData, ...generateProductIntelligence(formData) };
}

function loadSelectedProduct(): string | null {
  try {
    return JSON.parse(localStorage.getItem("ip_selected_product") ?? "null");
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductIdState] = useState<string | null>(
    loadSelectedProduct,
  );

  const setSelectedProductId = useCallback((id: string | null) => {
    setSelectedProductIdState(id);
    localStorage.setItem("ip_selected_product", JSON.stringify(id));
  }, []);

  const { data: apiCreators = [] } = useQuery({
    queryKey: ["creators"],
    queryFn: getCreators,
    staleTime: 30_000,
  });

  const { data: apiPipeline = [] } = useQuery({
    queryKey: ["pipeline"],
    queryFn: getPipeline,
    staleTime: 10_000,
  });

  const { data: apiProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts,
    staleTime: 30_000,
  });

  const creators = useMemo(
    () => apiCreators.map((c) => toFrontendCreator(c, apiPipeline)),
    [apiCreators, apiPipeline],
  );

  const products = useMemo(
    () => apiProducts.map(toFrontendProduct),
    [apiProducts],
  );

  const stageMutation = useMutation({
    mutationFn: ({ entryId, stage }: { entryId: string; stage: PipelineStage }) =>
      updatePipelineEntry(entryId, stage),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    },
  });

  const updateCreatorStage = useCallback(
    (creatorId: string, stage: PipelineStage) => {
      const pipeline =
        queryClient.getQueryData<ApiPipelineEntry[]>(["pipeline"]) ?? [];
      const entry = pipeline.find((e) => e.creatorId === creatorId);

      queryClient.setQueryData<ApiPipelineEntry[]>(["pipeline"], (prev = []) =>
        prev.map((e) =>
          e.creatorId === creatorId ? { ...e, stage } : e,
        ),
      );

      if (entry) {
        stageMutation.mutate({ entryId: entry.id, stage });
      }
    },
    [queryClient, stageMutation],
  );

  const addProduct = useCallback(
    async (product: Product): Promise<Product> => {
      const created = await createProduct({
        name: product.name,
        website: product.website,
        description: product.description,
        category: product.category,
        targetCustomer: product.targetCustomer,
        mainBenefit: product.mainBenefit,
        price: product.price,
        commissionOffer: product.commissionOffer,
      });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      return { ...product, id: created.id };
    },
    [queryClient],
  );

  return (
    <AppContext.Provider
      value={{
        creators,
        products,
        selectedProductId,
        setSelectedProductId,
        updateCreatorStage,
        addProduct,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
