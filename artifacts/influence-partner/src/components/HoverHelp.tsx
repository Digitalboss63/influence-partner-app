import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TERM_DEFINITIONS: Record<string, string> = {
  "Fit Score":
    "A 0–100 score that measures how well a creator matches your product. It weighs audience alignment (30%), engagement quality (20%), platform fit (15%), product relevance (20%), and sponsor conflict (15%).",
  "Opportunity Score":
    "A quick read on whether this creator is worth pursuing. It combines their Fit Score with how much competitive conflict exists — high fit + no conflict = Strong Opportunity.",
  "Revenue Share":
    "A deal where the creator earns a percentage of every sale they drive, typically 35–40% for top partners. No upfront cost to you — they earn more when they sell more.",
  "Sponsor Conflict":
    "Whether the creator already promotes a competing product or brand. High conflict means they may be locked out or less credible promoting you.",
  "Product Gap":
    "A gap in the creator's current content where your product would naturally fit. A strong product gap means they need exactly what you offer and their audience would welcome it.",
  "Commission":
    "The percentage of each sale paid to the creator. Higher commissions (35–40%) attract better partners and give creators more incentive to actively promote you.",
  "Engagement Rate":
    "The percentage of followers who actively interact with content (likes, comments, shares). Higher engagement means the audience is real and responsive — not just passive.",
  "Deal Type":
    "How the partnership is structured. Revenue Share = % of sales. CPA = cost per action (lead or signup). Flat Fee = fixed payment regardless of results.",
};

export function HoverHelp({ term }: { term: string }) {
  const definition = TERM_DEFINITIONS[term];
  if (!definition) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="inline w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help ml-0.5 flex-shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          <p className="font-semibold mb-1">{term}</p>
          <p>{definition}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TermWithHelp({
  term,
  className = "",
}: {
  term: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {term}
      <HoverHelp term={term} />
    </span>
  );
}
