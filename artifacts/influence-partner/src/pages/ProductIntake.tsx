import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { Product, ProductForm, Platform } from "@/types/influencePartner";
import { generateProductIntelligence } from "@/lib/productIntelligence";
import { ProductIntelligenceSummary } from "@/components/ProductIntelligenceSummary";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Package,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Info,
  Search,
  MessageSquare,
  PencilLine,
  X,
} from "lucide-react";

export type { ProductForm };

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  website: z.string().url("Enter a valid URL").or(z.literal("")),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Select a category"),
  targetCustomer: z.string().min(1, "Describe your target customer"),
  mainBenefit: z.string().min(1, "Describe the main benefit"),
  price: z.string().min(1, "Enter a price"),
  commissionOffer: z.number().min(20).max(50),
});

type ProductFormValues = z.infer<typeof productSchema>;

const CATEGORIES = ["Tech", "Fitness", "Finance", "Lifestyle", "Beauty", "Gaming", "Productivity", "Health", "Other"];

export default function ProductIntake() {
  const [, setLocation] = useLocation();
  const { products, addProduct, setSelectedProductId, selectedProductId } = useAppContext();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProduct, setAnalysisProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  const activeProduct =
    analysisProduct ??
    (selectedProductId ? products.find((p) => p.id === selectedProductId) : null) ??
    (products.length > 0 ? products[0] : null);

  const hasReport = !!(activeProduct?.mainMarket);
  const reportMode = hasReport && !showForm;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      website: "",
      description: "",
      category: "",
      targetCustomer: "",
      mainBenefit: "",
      price: "",
      commissionOffer: 35,
    },
  });

  const commissionValue = form.watch("commissionOffer");

  const onAnalyze = async (data: ProductFormValues) => {
    setAnalyzing(true);
    await new Promise((res) => setTimeout(res, 1600));
    setAnalyzing(false);

    const intel = generateProductIntelligence(data as ProductForm);
    const newProduct: Product = {
      id: `p${Date.now()}`,
      ...data,
      ...intel,
    };
    addProduct(newProduct);
    setSelectedProductId(newProduct.id);
    setAnalysisProduct(newProduct);
    setShowForm(false);
  };

  const loadProduct = (product: Product) => {
    setAnalysisProduct(product);
    setSelectedProductId(product.id);
    setShowForm(false);
    form.reset({
      name: product.name,
      website: product.website || "",
      description: product.description,
      category: product.category,
      targetCustomer: product.targetCustomer,
      mainBenefit: product.mainBenefit,
      price: product.price,
      commissionOffer: product.commissionOffer,
    });
  };

  const startNewProduct = () => {
    setAnalysisProduct(null);
    setSelectedProductId(null);
    setShowForm(true);
    form.reset({
      name: "", website: "", description: "", category: "",
      targetCustomer: "", mainBenefit: "", price: "", commissionOffer: 35,
    });
  };

  // ── FORM PANEL ──────────────────────────────────────────────────────────────
  const FormPanel = (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Product Details
          </CardTitle>
          {reportMode === false && hasReport && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setShowForm(false)}>
              <X className="w-3 h-3" /> Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onAnalyze)} className="space-y-4" data-testid="form-product">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl><Input placeholder="AppBoost Pro" {...field} data-testid="input-product-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Website</FormLabel>
                <FormControl><Input placeholder="https://yourapp.com" {...field} data-testid="input-website" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="What does your product do?" className="resize-none" rows={3} {...field} data-testid="input-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="price" render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl><Input placeholder="$49/mo" {...field} data-testid="input-price" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="targetCustomer" render={({ field }) => (
              <FormItem>
                <FormLabel>Target Customer</FormLabel>
                <FormControl><Input placeholder="Remote workers, freelancers" {...field} data-testid="input-target-customer" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mainBenefit" render={({ field }) => (
              <FormItem>
                <FormLabel>Main Benefit</FormLabel>
                <FormControl><Input placeholder="save 10 hours a week" {...field} data-testid="input-main-benefit" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="commissionOffer" render={({ field }) => (
              <FormItem>
                <FormLabel>Commission: <span className="text-primary font-bold">{commissionValue}%</span></FormLabel>
                <FormControl>
                  <Slider min={20} max={50} step={1} value={[field.value]} onValueChange={([v]) => field.onChange(v)} className="mt-2" data-testid="slider-commission" />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>20%</span>
                  <span className="text-primary font-medium">35–40% rec.</span>
                  <span>50%</span>
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={analyzing} data-testid="button-analyze-product">
              {analyzing ? (
                <><Spinner className="w-4 h-4 mr-2" />Analysing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Analyze Product</>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // ── REPORT MODE (full-width) ─────────────────────────────────────────────────
  if (reportMode && activeProduct) {
    return (
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        {/* Page title */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product Intelligence Report</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Strategic analysis to guide your creator recruitment and outreach
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setShowForm(true)}>
            <PencilLine className="w-3.5 h-3.5" /> Edit / New Product
          </Button>
        </div>

        {/* Compact product summary */}
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-base leading-tight">{activeProduct.name}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">{activeProduct.price}</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-sm text-muted-foreground">{activeProduct.commissionOffer}% commission</span>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-sm text-muted-foreground">{activeProduct.category}</span>
                    {activeProduct.campaignOpportunityRating && (
                      <>
                        <span className="text-muted-foreground/50">·</span>
                        <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary bg-primary/5">
                          {activeProduct.campaignOpportunityRating} Opportunity
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Saved products selector */}
              {products.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground shrink-0">Switch:</span>
                  {products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => loadProduct(p)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        activeProduct.id === p.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CTA buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            size="lg"
            className="h-14 text-base font-semibold gap-3 shadow-md"
            onClick={() => setLocation("/discover")}
            data-testid="button-find-creators"
          >
            <Search className="w-5 h-5" />
            <div className="text-left">
              <div className="leading-tight">Use This Strategy To Find Creators</div>
              <div className="text-xs font-normal opacity-80 leading-tight">Browse matched creators →</div>
            </div>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-base font-semibold gap-3 border-2 hover:bg-primary/5"
            onClick={() => setLocation("/outreach")}
            data-testid="button-generate-outreach"
          >
            <MessageSquare className="w-5 h-5 text-primary" />
            <div className="text-left">
              <div className="leading-tight">Generate Outreach For This Campaign</div>
              <div className="text-xs font-normal text-muted-foreground leading-tight">Write personalised pitches →</div>
            </div>
          </Button>
        </div>

        {/* Full intelligence report */}
        {analyzing ? (
          <Card className="h-64 flex items-center justify-center">
            <CardContent className="text-center py-12">
              <Spinner className="w-8 h-8 text-primary mx-auto mb-4" />
              <p className="font-semibold text-foreground">Generating intelligence report…</p>
              <p className="text-sm text-muted-foreground mt-1">
                Analysing market, buyer persona, creator fit, revenue potential…
              </p>
            </CardContent>
          </Card>
        ) : (
          <ProductIntelligenceSummary product={activeProduct} />
        )}
      </div>
    );
  }

  // ── FORM MODE (new product or editing) ───────────────────────────────────────
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product Intake</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe your product and get a full strategic intelligence report
          </p>
        </div>
        {hasReport && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setShowForm(false)}>
            <ChevronRight className="w-3.5 h-3.5" /> View Report
          </Button>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
        <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div className="text-emerald-800 leading-relaxed">
          <span className="font-semibold">What this page does: </span>
          Describe your product and the system generates a full{" "}
          <strong>Product Intelligence Report</strong> — market positioning, buyer persona, recommended creator
          categories, revenue potential, competition level, and a strategic outreach angle. Click{" "}
          <em>Analyze Product</em> to run it.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          {FormPanel}

          {/* Saved Products */}
          {products.length > 0 && (
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Saved Products
                </p>
                <button
                  onClick={startNewProduct}
                  className="text-xs text-primary hover:underline"
                >
                  + New
                </button>
              </div>
              <div className="space-y-2">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:border-primary/50 transition-colors ${
                      (analysisProduct?.id ?? selectedProductId) === product.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => loadProduct(product)}
                    data-testid={`card-product-${product.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {product.price} · {product.commissionOffer}% commission
                          </p>
                          {product.campaignOpportunityRating && (
                            <Badge variant="outline" className="text-xs mt-1.5">
                              {product.campaignOpportunityRating}
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      </div>
                      {product.website && (
                        <a
                          href={product.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {product.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: analyzing state or empty prompt */}
        <div className="lg:col-span-3">
          {analyzing ? (
            <Card className="h-96 flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Spinner className="w-8 h-8 text-primary mx-auto mb-4" />
                <p className="font-semibold text-foreground">Generating intelligence report…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Analysing market, buyer persona, creator fit, revenue potential…
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full min-h-96 flex items-center justify-center border-dashed border-2">
              <CardContent className="text-center py-16">
                <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-muted-foreground text-lg">Intelligence report will appear here</p>
                <p className="text-sm text-muted-foreground/70 mt-2 max-w-sm mx-auto leading-relaxed">
                  Fill in your product details on the left and click <strong>Analyze Product</strong> to generate your full strategic report.
                </p>
                {products.length > 0 && (
                  <p className="text-sm text-muted-foreground/60 mt-3">
                    Or click a saved product on the left to load its report.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
