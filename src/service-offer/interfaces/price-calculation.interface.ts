export interface DiscountApplied {
  offerId: string;
  name: string;
  type: 'percent' | 'amount';
  value: number;
  amount: number;
}

export interface PriceCalculation {
  basePrice: number;
  discountApplied: DiscountApplied | null;
  finalPrice: number;
  currency: string;
}


