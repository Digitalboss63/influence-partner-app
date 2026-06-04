const PLANS_KEY = "ip_saved_outreach_plans";
const TARGETS_KEY = "ip_partner_pipeline_targets";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SavedOutreachPlan {
  id: string;
  partnerType: string;
  productId: string;
  productName: string;
  commission: string;
  outreachAngle: string;
  tier: number;
  savedAt: string;
  icon?: string;
}

export interface PartnerPipelineTarget {
  id: string;
  partnerType: string;
  productId: string;
  productName: string;
  commission: string;
  stage: "Targeting" | "Outreach Sent" | "Following Up" | "In Conversation" | "Active";
  addedAt: string;
  icon?: string;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

function loadPlans(): SavedOutreachPlan[] {
  try {
    return JSON.parse(localStorage.getItem(PLANS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistPlans(plans: SavedOutreachPlan[]): void {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export function getSavedPlans(): SavedOutreachPlan[] {
  return loadPlans();
}

export function saveOutreachPlan(
  plan: Omit<SavedOutreachPlan, "id" | "savedAt">
): SavedOutreachPlan {
  const plans = loadPlans();
  const existingIdx = plans.findIndex(
    (p) => p.partnerType === plan.partnerType && p.productId === plan.productId
  );
  const saved: SavedOutreachPlan = {
    ...plan,
    id: existingIdx >= 0 ? plans[existingIdx].id : crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  if (existingIdx >= 0) {
    plans[existingIdx] = saved;
  } else {
    plans.unshift(saved);
  }
  persistPlans(plans);
  return saved;
}

export function deleteSavedPlan(id: string): void {
  persistPlans(loadPlans().filter((p) => p.id !== id));
}

// ─── Pipeline targets ─────────────────────────────────────────────────────────

function loadTargets(): PartnerPipelineTarget[] {
  try {
    return JSON.parse(localStorage.getItem(TARGETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistTargets(targets: PartnerPipelineTarget[]): void {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
}

export function getPartnerPipelineTargets(): PartnerPipelineTarget[] {
  return loadTargets();
}

export function addPartnerPipelineTarget(
  target: Omit<PartnerPipelineTarget, "id" | "addedAt" | "stage">
): { added: PartnerPipelineTarget; isNew: boolean } {
  const targets = loadTargets();
  const existingIdx = targets.findIndex(
    (t) => t.partnerType === target.partnerType && t.productId === target.productId
  );
  if (existingIdx >= 0) {
    return { added: targets[existingIdx], isNew: false };
  }
  const added: PartnerPipelineTarget = {
    ...target,
    id: crypto.randomUUID(),
    stage: "Targeting",
    addedAt: new Date().toISOString(),
  };
  targets.unshift(added);
  persistTargets(targets);
  return { added, isNew: true };
}

export function updatePartnerTargetStage(
  id: string,
  stage: PartnerPipelineTarget["stage"]
): void {
  const targets = loadTargets();
  const idx = targets.findIndex((t) => t.id === id);
  if (idx >= 0) {
    targets[idx] = { ...targets[idx], stage };
    persistTargets(targets);
  }
}

export function deletePartnerPipelineTarget(id: string): void {
  persistTargets(loadTargets().filter((t) => t.id !== id));
}
