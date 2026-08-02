export type Frequency = "monthly" | "weekly" | "yearly";
export type Kind = "fixed" | "perUnit";
export type Category =
  | "rent"
  | "food"
  | "staff"
  | "utilities"
  | "insurance"
  | "supplies"
  | "marketing"
  | "sales"
  | "other";

export interface MoneyLine {
  id: string;
  name: string;
  category: Category;
  /** cents; per-unit amount if kind === "perUnit" (fallback when no group rate) */
  amountCents: number;
  frequency: Frequency;
  kind: Kind;
  /** per-unit lines only: cents per unit, keyed by group id (tiered pricing) */
  groupAmounts?: Record<string, number>;
}

/** a pricing tier of the business's unit, e.g. "Under 3" kids */
export interface UnitGroup {
  id: string;
  label: string;
  count: number;
}

export interface Business {
  id: string;
  name: string;
  icon: string;
  color: string;
  unitLabel: string;
  groups: UnitGroup[];
  income: MoneyLine[];
  expenses: MoneyLine[];
  createdAt: string;
}

export interface StoreShape {
  businesses: Business[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  rent: "Rent / Mortgage",
  food: "Food",
  staff: "Staff",
  utilities: "Utilities",
  insurance: "Insurance",
  supplies: "Supplies",
  marketing: "Marketing",
  sales: "Sales",
  other: "Other",
};

export const EXPENSE_CATEGORIES: Category[] = [
  "rent",
  "food",
  "staff",
  "utilities",
  "insurance",
  "supplies",
  "marketing",
  "other",
];

export const INCOME_CATEGORIES: Category[] = ["sales", "other"];

export const BUSINESS_ICONS = [
  "🏠", "🧹", "🍽️", "🚚", "✂️", "🧺", "🛠️", "📦", "🚗", "🌱", "☕", "🏪",
] as const;

export const BUSINESS_COLORS = [
  "#7f56d9", "#17b26a", "#2e90fa", "#f79009", "#ee46bc", "#06aed4",
] as const;
