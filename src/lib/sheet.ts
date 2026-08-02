import * as XLSX from "xlsx";
import type { Business, Category, Frequency, MoneyLine, UnitGroup } from "./types";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./types";
import { newId } from "./seed";

export const SHEET_HEADERS = [
  "Business",
  "Unit",
  "Group",
  "Group Count",
  "Type",
  "Line Name",
  "Category",
  "Amount (R)",
  "Per",
  "Every",
] as const;

type Row = (string | number)[];

const freqLabel: Record<Frequency, string> = { monthly: "monthly", weekly: "weekly", yearly: "yearly" };

/* ---------------- export ---------------- */

function lineRows(b: Business, l: MoneyLine, type: "Income" | "Expense", firstLineOfBiz: boolean): Row[] {
  const single = b.groups.length === 1;
  const count = b.groups.reduce((s, g) => s + g.count, 0);
  if (l.kind === "perUnit" && l.groupAmounts && !single) {
    return b.groups.map((g) => [
      b.name,
      b.unitLabel,
      g.label,
      g.count,
      type,
      l.name,
      CATEGORY_LABELS[l.category],
      (l.groupAmounts![g.id] ?? l.amountCents) / 100,
      `per ${b.unitLabel}`,
      freqLabel[l.frequency],
    ]);
  }
  return [
    [
      b.name,
      b.unitLabel,
      "",
      single && firstLineOfBiz ? count : "",
      type,
      l.name,
      CATEGORY_LABELS[l.category],
      l.amountCents / 100,
      l.kind === "perUnit" ? `per ${b.unitLabel}` : "fixed",
      freqLabel[l.frequency],
    ],
  ];
}

export function businessesToRows(businesses: Business[]): Row[] {
  const rows: Row[] = [];
  for (const b of businesses) {
    const namedInRows = new Set<string>();
    let first = true;
    const push = (l: MoneyLine, type: "Income" | "Expense") => {
      for (const r of lineRows(b, l, type, first)) {
        rows.push(r);
        if (r[2]) namedInRows.add(String(r[2]));
        first = false;
      }
    };
    b.income.forEach((l) => push(l, "Income"));
    b.expenses.forEach((l) => push(l, "Expense"));
    // group-definition rows for groups no tiered line mentioned (or empty business)
    if (b.groups.length > 1) {
      for (const g of b.groups) {
        if (!namedInRows.has(g.label)) {
          rows.push([b.name, b.unitLabel, g.label, g.count, "", "", "", "", "", ""]);
        }
      }
    } else if (b.income.length === 0 && b.expenses.length === 0) {
      rows.push([b.name, b.unitLabel, "", b.groups[0]?.count ?? 0, "", "", "", "", "", ""]);
    }
  }
  return rows;
}

export function sampleRows(): Row[] {
  const B = "SAMPLE — Coffee Cart (delete me)";
  return [
    [B, "customer", "Regulars", 30, "Income", "Membership", "Sales", 450, "per customer", "monthly"],
    [B, "customer", "Walk-ins", 55, "Income", "Membership", "Sales", 280, "per customer", "monthly"],
    [B, "customer", "", "", "Expense", "Beans & milk", "Supplies", 85, "per customer", "monthly"],
    [B, "customer", "", "", "Expense", "Cart rent", "Rent / Mortgage", 3500, "fixed", "monthly"],
    [B, "customer", "", "", "Expense", "Market fee", "Other", 250, "fixed", "weekly"],
    [B, "customer", "", "", "Expense", "Licence", "Insurance", 1200, "fixed", "yearly"],
  ];
}

const INSTRUCTIONS: string[][] = [
  ["Margin — Portfolio Sheet: how to fill it in"],
  [""],
  ["One row = one money line (or one price tier of a line)."],
  ["Business", "Same name on every row of that business. Rows starting with SAMPLE are ignored on upload."],
  ["Unit", 'What you count: "kid", "client", "customer", "order"…'],
  ["Group", "Leave blank for a normal line. Name a tier (e.g. Under 3) to give THAT group its own price — one row per group, same Line Name."],
  ["Group Count", "How many units are in the group (or the business total when Group is blank)."],
  ["Type", "Income or Expense."],
  ["Line Name", "Tuition, Mortgage, Staff… Rows with a Group but no Line Name just define the group and its count."],
  ["Category", "Rent / Mortgage, Food, Staff, Utilities, Insurance, Supplies, Marketing, Sales, Other."],
  ["Amount (R)", "Rand. Per-unit lines: the price for ONE unit."],
  ["Per", '"fixed" (same every period) or "per kid"/"per customer" (scales with count).'],
  ["Every", "monthly, weekly or yearly — Margin normalizes everything to monthly."],
  [""],
  ["Upload replaces businesses with the same name and adds new ones. Businesses not in the file are kept."],
];

export function downloadWorkbook(businesses: Business[]) {
  const rows: Row[] = [[...SHEET_HEADERS], ...businessesToRows(businesses), ...sampleRows()];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 9 },
    { wch: 20 }, { wch: 17 }, { wch: 11 }, { wch: 13 }, { wch: 9 },
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  wsInfo["!cols"] = [{ wch: 14 }, { wch: 110 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Portfolio");
  XLSX.utils.book_append_sheet(wb, wsInfo, "Instructions");
  XLSX.writeFile(wb, "margin-portfolio.xlsx");
}

/* ---------------- import ---------------- */

export interface ParsedImport {
  businesses: Business[];
  warnings: string[];
  sampleRowsSkipped: number;
}

function parseFrequency(s: string): Frequency {
  const t = s.toLowerCase();
  if (t.includes("week")) return "weekly";
  if (t.includes("year") || t.includes("annu")) return "yearly";
  return "monthly";
}

function parseCategory(s: string, income: boolean): Category {
  const t = s.trim().toLowerCase();
  const pool = income ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  for (const c of pool) {
    if (t === c || CATEGORY_LABELS[c].toLowerCase().includes(t) || t.includes(c)) {
      if (t.length > 0) return c;
    }
  }
  if (t.includes("mortgage") || t.includes("rent")) return income ? "other" : "rent";
  return income ? "sales" : "other";
}

const ICONS_FOR_NEW = ["🏪", "🚚", "🍽️", "✂️", "🧺", "🛠️", "📦", "🚗", "🌱", "☕"];
const COLORS_FOR_NEW = ["#17b26a", "#f79009", "#ee46bc", "#06aed4", "#7f56d9", "#2e90fa"];

export function parseRows(rows: Row[]): ParsedImport {
  const warnings: string[] = [];
  let sampleRowsSkipped = 0;

  const headerIdx = rows.findIndex((r) => r.some((c) => String(c).trim().toLowerCase() === "business"));
  if (headerIdx === -1) {
    return { businesses: [], warnings: ["No header row found — keep the first row (Business, Unit, Group…) from the template."], sampleRowsSkipped: 0 };
  }
  const header = rows[headerIdx].map((c) => String(c).trim().toLowerCase());
  const col = (...names: string[]) => header.findIndex((h) => names.some((n) => h.startsWith(n)));
  const ci = {
    business: col("business"),
    unit: col("unit"),
    group: col("group count") === col("group") ? -1 : col("group"),
    count: col("group count", "count"),
    type: col("type"),
    line: col("line name", "line", "name"),
    category: col("category"),
    amount: col("amount"),
    per: col("per"),
    every: col("every", "frequency"),
  };
  // "group" must not match the "group count" column
  if (ci.group === -1) {
    const gi = header.findIndex((h, i) => h === "group" && i !== ci.count);
    ci.group = gi;
  }

  interface Bucket {
    name: string;
    type: "income" | "expenses";
    category: Category;
    frequency: Frequency;
    kind: "fixed" | "perUnit";
    entries: { group: string; cents: number }[];
  }
  interface Draft {
    name: string;
    unitLabel: string;
    groupCounts: Map<string, number>; // label (lower) -> count; "" = default
    groupLabels: Map<string, string>; // lower -> display
    buckets: Map<string, Bucket>;
    order: string[];
  }
  const drafts = new Map<string, Draft>();
  const draftOrder: string[] = [];

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const cell = (idx: number) => (idx >= 0 && r[idx] != null ? String(r[idx]).trim() : "");
    const bizName = cell(ci.business);
    if (!bizName && r.every((c) => String(c ?? "").trim() === "")) continue;
    if (!bizName) {
      warnings.push(`Row ${i + 1}: no Business name — skipped.`);
      continue;
    }
    if (bizName.toLowerCase().startsWith("sample")) {
      sampleRowsSkipped++;
      continue;
    }
    const key = bizName.toLowerCase();
    if (!drafts.has(key)) {
      drafts.set(key, {
        name: bizName,
        unitLabel: "",
        groupCounts: new Map(),
        groupLabels: new Map(),
        buckets: new Map(),
        order: [],
      });
      draftOrder.push(key);
    }
    const d = drafts.get(key)!;
    if (!d.unitLabel && cell(ci.unit)) d.unitLabel = cell(ci.unit).toLowerCase();

    const groupLabel = cell(ci.group);
    const gKey = groupLabel.toLowerCase();
    const countRaw = cell(ci.count);
    if (countRaw !== "") {
      const c = Math.max(0, Math.round(Number(countRaw)));
      if (Number.isFinite(c)) {
        const prev = d.groupCounts.get(gKey);
        d.groupCounts.set(gKey, gKey === "" ? Math.max(prev ?? 0, c) : (prev ?? c));
        if (gKey) d.groupLabels.set(gKey, groupLabel);
      }
    } else if (gKey && !d.groupCounts.has(gKey)) {
      d.groupCounts.set(gKey, 0);
      d.groupLabels.set(gKey, groupLabel);
    }

    const lineName = cell(ci.line);
    if (!lineName) continue; // group-definition row

    const typeRaw = cell(ci.type).toLowerCase();
    const type: "income" | "expenses" = typeRaw.startsWith("inc")
      ? "income"
      : typeRaw.startsWith("exp")
        ? "expenses"
        : (warnings.push(`Row ${i + 1}: Type "${cell(ci.type)}" not Income/Expense — treated as Expense.`), "expenses");

    const amountNum = Number(cell(ci.amount).replace(/[R\s,]/gi, (m) => (m === "," ? "." : "")));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      warnings.push(`Row ${i + 1}: "${lineName}" has no usable Amount — skipped.`);
      continue;
    }
    const cents = Math.round(amountNum * 100);

    const perRaw = cell(ci.per).toLowerCase();
    const kind: "fixed" | "perUnit" = perRaw.includes("fix") ? "fixed" : perRaw.includes("per") || gKey ? "perUnit" : "fixed";

    const bKey = `${type}|${lineName.toLowerCase()}`;
    if (!d.buckets.has(bKey)) {
      d.buckets.set(bKey, {
        name: lineName,
        type,
        category: parseCategory(cell(ci.category), type === "income"),
        frequency: parseFrequency(cell(ci.every)),
        kind,
        entries: [],
      });
      d.order.push(bKey);
    }
    d.buckets.get(bKey)!.entries.push({ group: gKey, cents });
  }

  const businesses: Business[] = [];
  let styleIdx = 0;
  for (const key of draftOrder) {
    const d = drafts.get(key)!;
    const namedKeys = [...d.groupCounts.keys()].filter((k) => k !== "");
    let groups: UnitGroup[];
    if (namedKeys.length > 0) {
      groups = namedKeys.map((k) => ({
        id: newId("grp"),
        label: d.groupLabels.get(k) ?? k,
        count: d.groupCounts.get(k) ?? 0,
      }));
    } else {
      groups = [{ id: newId("grp"), label: "", count: d.groupCounts.get("") ?? 0 }];
    }
    const gid = (label: string) => {
      const g = groups.find((x) => x.label.toLowerCase() === label);
      return g?.id;
    };

    const income: MoneyLine[] = [];
    const expenses: MoneyLine[] = [];
    for (const bKey of d.order) {
      const bk = d.buckets.get(bKey)!;
      const named = bk.entries.filter((e) => e.group !== "");
      let line: MoneyLine;
      if (named.length > 0 && groups.length > 1) {
        const groupAmounts: Record<string, number> = {};
        for (const e of named) {
          const id = gid(e.group);
          if (id) groupAmounts[id] = e.cents;
        }
        line = {
          id: newId("ln"),
          name: bk.name,
          category: bk.category,
          amountCents: named[0].cents,
          frequency: bk.frequency,
          kind: "perUnit",
          groupAmounts,
        };
      } else {
        line = {
          id: newId("ln"),
          name: bk.name,
          category: bk.category,
          amountCents: bk.entries[0].cents,
          frequency: bk.frequency,
          kind: bk.kind,
        };
      }
      (bk.type === "income" ? income : expenses).push(line);
    }

    businesses.push({
      id: newId("biz"),
      name: d.name,
      icon: ICONS_FOR_NEW[styleIdx % ICONS_FOR_NEW.length],
      color: COLORS_FOR_NEW[styleIdx % COLORS_FOR_NEW.length],
      unitLabel: d.unitLabel || "unit",
      groups,
      income,
      expenses,
      createdAt: new Date().toISOString(),
    });
    styleIdx++;
  }

  return { businesses, warnings, sampleRowsSkipped };
}

export async function parseWorkbookFile(file: File): Promise<ParsedImport> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes("portfolio")) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: "" });
  return parseRows(rows);
}
