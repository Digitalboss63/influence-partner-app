import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAppContext } from "@/context/AppContext";
import { OutreachChannel, OutreachTone } from "@/types/influencePartner";
import { generateOutreachMessage } from "@/lib/outreachTemplates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Mail,
  Copy,
  RefreshCw,
  CheckCheck,
  Zap,
  Info,
} from "lucide-react";

const CHANNELS: OutreachChannel[] = ["Email", "Instagram DM", "TikTok DM", "YouTube Sponsorship"];
const TONES: OutreachTone[] = ["Direct", "Friendly", "Professional", "High-Commission Offer"];

const CHANNEL_ICONS: Record<OutreachChannel, React.ElementType> = {
  Email: Mail,
  "Instagram DM": MessageSquare,
  "TikTok DM": MessageSquare,
  "YouTube Sponsorship": Mail,
};

function useQueryParam(key: string): string | null {
  const [location] = useLocation();
  const search = location.split("?")[1] ?? "";
  const params = new URLSearchParams(search);
  return params.get(key);
}

export default function OutreachGenerator() {
  const { creators, products } = useAppContext();
  const creatorIdParam = useQueryParam("creatorId");
  const channelParam = useQueryParam("channel");

  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(
    creatorIdParam ?? (creators[0]?.id ?? "")
  );
  const [selectedProductId, setSelectedProductId] = useState<string>(
    products[0]?.id ?? ""
  );
  const [channel, setChannel] = useState<OutreachChannel>(
    channelParam === "DM" ? "Instagram DM" :
    channelParam === "Email" ? "Email" :
    "Email"
  );
  const [tone, setTone] = useState<OutreachTone>("High-Commission Offer");
  const [message, setMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [generated, setGenerated] = useState(false);

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  useEffect(() => {
    if (creatorIdParam) setSelectedCreatorId(creatorIdParam);
  }, [creatorIdParam]);

  const generate = () => {
    if (!selectedCreator || !selectedProduct) return;
    const msg = generateOutreachMessage(selectedCreator, selectedProduct, channel, tone);
    setMessage(msg);
    setGenerated(true);
    setCopied(false);
  };

  const regenerate = () => {
    if (!selectedCreator || !selectedProduct) return;
    const tweaks = [
      `\n\nP.S. Excited to explore this together!`,
      `\n\nP.S. Happy to send over some case studies too.`,
      `\n\nP.S. We can also discuss exclusivity options.`,
    ];
    const base = generateOutreachMessage(selectedCreator, selectedProduct, channel, tone);
    const tweak = tweaks[Math.floor(Math.random() * tweaks.length)];
    setMessage(base + tweak);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Outreach Generator</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate personalized outreach for any creator and channel
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 border border-purple-200 text-sm">
        <Info className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
        <div className="text-purple-800 leading-relaxed">
          <span className="font-semibold">Why this matters: </span>
          Generic outreach gets ignored. Every message here is personalised to the creator's niche, platform, and
          audience — and leads with a <strong>35–40% commission offer</strong> that stands out from standard 5–10%
          affiliate deals. Select a creator and click <em>Generate Message</em> to get started.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configure Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Creator Selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Creator</label>
                <Select
                  value={selectedCreatorId}
                  onValueChange={setSelectedCreatorId}
                >
                  <SelectTrigger data-testid="select-creator">
                    <SelectValue placeholder="Select a creator" />
                  </SelectTrigger>
                  <SelectContent>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.platform} · {c.fitLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Selector */}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Product</label>
                <Select
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                >
                  <SelectTrigger data-testid="select-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Channel Tabs */}
              <div>
                <label className="text-sm font-medium mb-2 block">Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  {CHANNELS.map((ch) => {
                    const Icon = CHANNEL_ICONS[ch];
                    return (
                      <button
                        key={ch}
                        onClick={() => setChannel(ch)}
                        data-testid={`button-channel-${ch.replace(/\s/g, "-").toLowerCase()}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                          channel === ch
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{ch}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tone Selector */}
              <div>
                <label className="text-sm font-medium mb-2 block">Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      data-testid={`button-tone-${t.replace(/\s/g, "-").toLowerCase()}`}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                        tone === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={generate}
                disabled={!selectedCreator || !selectedProduct}
                data-testid="button-generate-message"
              >
                <Zap className="w-4 h-4 mr-2" />
                Generate Message
              </Button>
            </CardContent>
          </Card>

          {/* Selected creator summary */}
          {selectedCreator && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedCreator.avatarUrl}
                    alt={selectedCreator.name}
                    className="w-10 h-10 rounded-full bg-muted"
                  />
                  <div>
                    <p className="font-semibold text-sm">{selectedCreator.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {selectedCreator.platform} · {selectedCreator.niche} ·{" "}
                      <span className="text-primary font-medium">
                        {selectedCreator.suggestedCommission} suggested
                      </span>
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs font-bold border ${
                      selectedCreator.fitScore >= 90
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : selectedCreator.fitScore >= 80
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    {selectedCreator.fitScore}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Generated Message */}
        <div className="space-y-4">
          <Card className="flex flex-col h-full min-h-[480px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {generated ? `${channel} · ${tone}` : "Generated Message"}
                </CardTitle>
                {generated && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={regenerate}
                      data-testid="button-regenerate"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Regenerate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyToClipboard}
                      data-testid="button-copy"
                    >
                      {copied ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {generated ? (
                <>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 min-h-[320px] font-mono text-sm resize-none"
                    data-testid="textarea-message"
                  />
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-primary" />
                    Every message includes the 35–40% commission angle where appropriate.
                  </p>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ready to generate</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a creator, product, channel and tone, then click Generate
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
