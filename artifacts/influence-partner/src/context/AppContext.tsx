import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Creator, Product, PipelineStage } from "@/types/influencePartner";
import { mockCreators } from "@/data/mockCreators";
import { mockProducts } from "@/data/mockProducts";

interface AppContextValue {
  creators: Creator[];
  products: Product[];
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  updateCreatorStage: (creatorId: string, stage: PipelineStage) => void;
  addProduct: (product: Product) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [creators, setCreators] = useState<Creator[]>(() =>
    loadFromStorage("ip_creators", mockCreators)
  );
  const [products, setProducts] = useState<Product[]>(() =>
    loadFromStorage("ip_products", mockProducts)
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    () => loadFromStorage("ip_selected_product", null)
  );

  useEffect(() => {
    localStorage.setItem("ip_creators", JSON.stringify(creators));
  }, [creators]);

  useEffect(() => {
    localStorage.setItem("ip_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("ip_selected_product", JSON.stringify(selectedProductId));
  }, [selectedProductId]);

  const updateCreatorStage = (creatorId: string, stage: PipelineStage) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === creatorId ? { ...c, pipelineStage: stage } : c))
    );
  };

  const addProduct = (product: Product) => {
    setProducts((prev) => [...prev, product]);
  };

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
