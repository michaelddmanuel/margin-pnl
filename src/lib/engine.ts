import type { Business, Frequency, MoneyLine } from "./types";

/** cents/month for one line at a given unit count — integer math, rounded once */
export function lineMonthlyCents(line: MoneyLine, unitCount: number): number {
  const base = line.kind === "perUnit" ? line.amountCents * unitCount : line.amountCents;
  return normalizeToMonthlyCents(base, line.frequency);
}

export function normalizeToMonthlyCents(cents: number, freq: Frequency): number {
  switch (freq) {
    case "monthly":
      return cents;
    case "weekly":
      return Math.round((cents * 52) / 12);
    case "yearly":
      return Math.round(cents / 12);
  }
}

export interface Derived {
  revenueMo: number;
  expensesMo: number;
  netMo: number;
  /** null when revenue is 0 */
  marginPct: number | null;
  /** units needed to break even; null = no per-unit path to profit */
  breakEvenUnits: number | null;
  /** contribution per unit in cents (income/unit − variable cost/unit) */
  unitContributionMo: number;
  fixedExpensesMo: number;
  status: "profit" | "loss" | "breakeven";
}

export function deriveBusiness(b: Business, unitCountOverride?: number): Derived {
  const n = unitCountOverride ?? b.unitCount;
  const revenueMo = b.income.reduce((s, l) => s + lineMonthlyCents(l, n), 0);
  const expensesMo = b.expenses.reduce((s, l) => s + lineMonthlyCents(l, n), 0);
  const netMo = revenueMo - expensesMo;

  const incomePerUnitMo = b.income
    .filter((l) => l.kind === "perUnit")
    .reduce((s, l) => s + normalizeToMonthlyCents(l.amountCents, l.frequency), 0);
  const variablePerUnitMo = b.expenses
    .filter((l) => l.kind === "perUnit")
    .reduce((s, l) => s + normalizeToMonthlyCents(l.amountCents, l.frequency), 0);
  const fixedExpensesMo = b.expenses
    .filter((l) => l.kind === "fixed")
    .reduce((s, l) => s + normalizeToMonthlyCents(l.amountCents, l.frequency), 0);
  const fixedIncomeMo = revenueMo - incomePerUnitMo * n;

  const unitContributionMo = incomePerUnitMo - variablePerUnitMo;
  // fixed income offsets fixed cost before units have to cover it
  const gap = fixedExpensesMo - fixedIncomeMo;
  let breakEvenUnits: number | null = null;
  if (unitContributionMo > 0) {
    breakEvenUnits = Math.max(0, Math.ceil(gap / unitContributionMo));
  } else if (gap <= 0) {
    breakEvenUnits = 0; // fixed income already covers everything
  }

  return {
    revenueMo,
    expensesMo,
    netMo,
    marginPct: revenueMo > 0 ? (netMo / revenueMo) * 100 : null,
    breakEvenUnits,
    unitContributionMo,
    fixedExpensesMo,
    status: netMo > 0 ? "profit" : netMo < 0 ? "loss" : "breakeven",
  };
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

/** whole dollars, e.g. $9,600 */
export function fmtMoney(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) || Math.abs(dollars) >= 1000
    ? usd.format(Math.round(dollars))
    : usdCents.format(dollars);
}

/** signed, e.g. +$1,750 / −$250 */
export function fmtSigned(cents: number): string {
  const s = fmtMoney(Math.abs(cents));
  return cents > 0 ? `+${s}` : cents < 0 ? `−${s}` : s;
}

export function fmtPct(p: number | null): string {
  if (p === null) return "—";
  return `${p.toFixed(1)}%`;
}

export function plural(n: number, label: string): string {
  return `${n} ${label}${n === 1 ? "" : "s"}`;
}
