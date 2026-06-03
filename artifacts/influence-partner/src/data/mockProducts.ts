import { Product } from '../types/influencePartner';
import { generateProductIntelligence } from '../lib/productIntelligence';

interface ProductBase {
  id: string;
  name: string;
  website: string;
  description: string;
  category: string;
  targetCustomer: string;
  mainBenefit: string;
  price: string;
  commissionOffer: number;
}

function enrich(base: ProductBase): Product {
  const intel = generateProductIntelligence({
    name: base.name,
    website: base.website,
    description: base.description,
    category: base.category,
    targetCustomer: base.targetCustomer,
    mainBenefit: base.mainBenefit,
    price: base.price,
    commissionOffer: base.commissionOffer,
  });
  return { ...base, ...intel };
}

export const mockProducts: Product[] = [
  enrich({
    id: 'p1',
    name: 'AppBoost Pro',
    website: 'https://appboostpro.com',
    description: 'A productivity suite for remote teams to manage time and tasks efficiently.',
    category: 'Productivity',
    targetCustomer: 'Remote workers, freelancers, agency owners',
    mainBenefit: 'save 10 hours a week on task management',
    price: '$49/mo',
    commissionOffer: 35,
  }),
  enrich({
    id: 'p2',
    name: 'FitCoach Elite',
    website: 'https://fitcoachelite.com',
    description: 'AI-powered personalized workout and nutrition coaching app.',
    category: 'Fitness',
    targetCustomer: 'Busy professionals looking to stay in shape',
    mainBenefit: 'get personalized coaching without the high cost of a personal trainer',
    price: '$29/mo',
    commissionOffer: 38,
  }),
  enrich({
    id: 'p3',
    name: 'WealthTrack',
    website: 'https://wealthtrack.io',
    description: 'Automated personal finance and investment tracking dashboard.',
    category: 'Finance',
    targetCustomer: 'Millennials and Gen Z investors',
    mainBenefit: 'track all their investments in one clean dashboard',
    price: '$19/mo',
    commissionOffer: 40,
  }),
];
