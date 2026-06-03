export type Platform = 'YouTube' | 'Instagram' | 'TikTok';
export type CreatorType = 'Micro' | 'Mid-Tier' | 'Macro' | 'Celebrity';
export type FitLabel = 'Excellent Partner' | 'Strong Fit' | 'Possible Fit' | 'Low Priority';
export type PipelineStage = 'New' | 'Contacted' | 'Interested' | 'Negotiating' | 'Active' | 'Rejected';
export type OutreachTone = 'Direct' | 'Friendly' | 'Professional' | 'High-Commission Offer';
export type OutreachChannel = 'Email' | 'Instagram DM' | 'TikTok DM' | 'YouTube Sponsorship';

export interface Creator {
  id: string;
  name: string;
  handle: string;
  platform: Platform;
  niche: string;
  creatorType: CreatorType;
  followerCount: number;
  engagementRate: number;
  audienceMatch: number;
  platformFit: number;
  productFit: number;
  competitiveConflict: number;
  fitScore: number;
  fitLabel: FitLabel;
  suggestedCommission: string;
  recommendedDeal: string;
  pipelineStage: PipelineStage;
  avatarUrl?: string;
  audienceFitSummary: string;
  platformFitSummary: string;
  engagementQuality: string;
  competitorSignal: string;
  productGapOpportunity: string;
  whyGoodFit: string;
  suggestedDealStructure: string;
  suggestedOutreachAngle: string;
}

export interface CreatorCategoryRec {
  category: string;
  reason: string;
  fitLevel: 'Primary' | 'Secondary' | 'Tertiary';
}

export interface BuyerPersona {
  age: string;
  gender: string;
  interests: string[];
  painPoints: string[];
  platforms: Platform[];
}

export interface ProductForm {
  name: string;
  website: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
}

export interface Product {
  id: string;
  name: string;
  website: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
  // Legacy analysis fields
  mainNiche?: string;
  subNiches?: string[];
  idealCreatorTypes?: string[];
  recommendedPlatforms?: Platform[];
  recommendedCommissionRange?: string;
  suggestedOutreachAngle?: string;
  // Product Intelligence Layer fields
  mainMarket?: string;
  subMarket?: string;
  buyerPersona?: BuyerPersona;
  recommendedCreatorCategories?: CreatorCategoryRec[];
  outreachAngle?: string;
  whyTheseCreators?: string;
  marketDifficulty?: string;
  marketDifficultyReason?: string;
  competitionLevel?: string;
  competitionReason?: string;
  campaignOpportunityRating?: string;
  campaignOpportunityReason?: string;
  revenuePotentialLabel?: string;
  revenuePotentialMonthly?: string;
  revenuePotentialReason?: string;
  estimatedPartnerAcquisitionPotential?: string;
  partnerAcquisitionReason?: string;
}
