export function formatIdr(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const CATEGORY_LABELS: Record<string, string> = {
  noodles: "Noodles",
  seasoning: "Seasoning & Cooking",
  beverages: "Beverages",
  coffee: "Coffee",
  powder_drinks: "Powder Drinks",
  snacks: "Snacks & Ice Cream",
  household: "Household",
  personal_care: "Personal Care",
  baby_care: "Baby Care",
};

export function categoryLabel(category: string) {
  return CATEGORY_LABELS[category] ?? category;
}
