import type { Business, Frequency, MoneyLine, UnitGroup } from "./types";

export function totalUnits(groups: UnitGroup[]): number {
  return groups.reduce((s, g) => s + g.count, 0);
}

/** rate for one unit of a given group (falls back to the line's flat amount) */
export function groupRateCents(line: MoneyLine, groupId: string): number {
  return line.groupAmounts?.[groupId] ?? line.amountCents;
}

/** cents/month for one line at a given group mix — integer math, rounded once */
export function lineMonthlyCents(line: MoneyLine, groups: UnitGroup[]): number {
  if (line.kind === "fixed") return normalizeToMonthlyCents(line.amountCents, line.frequency);
  const base = groups.reduce((s, g) => s + groupRateCents(line, g.id) * g.count, 0);
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
  /** avg contribution per unit at the current mix, in cents */
  unitContributionMo: number | null;
  fixedExpensesMo: number;
  /** break-even assumes the current group mix (multi-group businesses) */
  mixBased: boolean;
  totalUnits: number;
  status: "profit" | "loss" | "breakeven";
}

export function deriveBusiness(b: Business, groupsOverride?: UnitGroup[]): Derived {
  const groups = groupsOverride ?? b.groups;
  const n = totalUnits(groups);
  const revenueMo = b.income.reduce((s, l) => s + lineMonthlyCents(l, groups), 0);
  const expensesMo = b.expenses.reduce((s, l) => s + lineMonthlyCents(l, groups), 0);
  const netMo = revenueMo - expensesMo;

  const perUnitIncomeTotalMo = b.income
    .filter((l) => l.kind === "perUnit")
    .reduce((s, l) => s + lineMonthlyCents(l, groups), 0);
  const perUnitExpenseTotalMo = b.expenses
    .filter((l) => l.kind === "perUnit")
    .reduce((s, l) => s + lineMonthlyCents(l, groups), 0);
  const fixedExpensesMo = expensesMo - perUnitExpenseTotalMo;
  const fixedIncomeMo = revenueMo - perUnitIncomeTotalMo;

  // avg contribution per unit at this mix; for an empty single-group biz use raw rates
  let unitContributionMo: number | null = null;
  if (n > 0) {
    unitContributionMo = (perUnitIncomeTotalMo - perUnitExpenseTotalMo) / n;
  } else if (groups.length === 1) {
    const gid = groups[0].id;
    const rate = (lines: MoneyLine[]) =>
      lines
        .filter((l) => l.kind === "perUnit")
        .reduce((s, l) => s + normalizeToMonthlyCents(groupRateCents(l, gid), l.frequency), 0);
    unitContributionMo = rate(b.income) - rate(b.expenses);
  }

  const gap = fixedExpensesMo - fixedIncomeMo;
  let breakEvenUnits: number | null = null;
  if (unitContributionMo !== null && unitContributionMo > 0) {
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
    unitContributionMo: unitContributionMo === null ? null : Math.round(unitContributionMo),
    fixedExpensesMo,
    mixBased: groups.length > 1,
    totalUnits: n,
    status: netMo > 0 ? "profit" : netMo < 0 ? "loss" : "breakeven",
  };
}

const zar = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});
const zarCents = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  minimumFractionDigits: 2,
});

/** whole rand, e.g. R9 600 */
export function fmtMoney(cents: number): string {
  const rand = cents / 100;
  return Number.isInteger(rand) || Math.abs(rand) >= 1000
    ? zar.format(Math.round(rand))
    : zarCents.format(rand);
}

/** signed, e.g. +R1 750 / −R250 */
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

/** rescale group counts to a new total, preserving the mix (largest-remainder rounding) */
export function scaleGroupCounts(groups: UnitGroup[], newTotal: number): UnitGroup[] {
  const cur = totalUnits(groups);
  if (groups.length === 1) return [{ ...groups[0], count: newTotal }];
  let floors: number[];
  let fracs: { i: number; frac: number }[];
  if (cur === 0) {
    const even = newTotal / groups.length;
    floors = groups.map(() => Math.floor(even));
    fracs = groups.map((_, i) => ({ i, frac: even - Math.floor(even) }));
  } else {
    const raw = groups.map((g) => (g.count * newTotal) / cur);
    floors = raw.map(Math.floor);
    fracs = raw.map((r, i) => ({ i, frac: r - Math.floor(r) }));
  }
  let rem = newTotal - floors.reduce((a, b) => a + b, 0);
  for (const { i } of fracs.sort((a, z) => z.frac - a.frac)) {
    if (rem <= 0) break;
    floors[i] += 1;
    rem -= 1;
  }
  return groups.map((g, i) => ({ ...g, count: floors[i] }));
}
