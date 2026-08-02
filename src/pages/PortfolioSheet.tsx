import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Badge, Button, Card, EmptyState, Sheet } from "../components/ui";
import { fmtMoney, lineMonthlyCents, plural, totalUnits } from "../lib/engine";
import { downloadWorkbook, parseWorkbookFile, type ParsedImport } from "../lib/sheet";
import { useStore } from "../lib/store";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Business,
  type Category,
  type Frequency,
  type MoneyLine,
} from "../lib/types";
import { AppHeader } from "./Dashboard";

const cellInput =
  "w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-900 hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-2 focus:outline-brand-100";
const cellSelect =
  "w-full appearance-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-gray-700 hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-2 focus:outline-brand-100";

function LineRow({ biz, line, side }: { biz: Business; line: MoneyLine; side: "income" | "expenses" }) {
  const { updateLine, removeLine } = useStore();
  const cats = side === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const multiGroup = biz.groups.length > 1;
  const tiered = !!line.groupAmounts && multiGroup;
  const patch = (p: Partial<MoneyLine>) => updateLine(biz.id, side, { ...line, ...p });

  const perValue = line.kind === "fixed" ? "fixed" : tiered ? "tiered" : "perUnit";
  const setPer = (v: string) => {
    if (v === "fixed") patch({ kind: "fixed", groupAmounts: undefined });
    else if (v === "perUnit") patch({ kind: "perUnit", groupAmounts: undefined });
    else
      patch({
        kind: "perUnit",
        groupAmounts: Object.fromEntries(biz.groups.map((g) => [g.id, line.amountCents])),
      });
  };

  return (
    <tr className="border-t border-gray-100">
      <td className="py-1 pl-4 pr-1">
        <Badge tone={side === "income" ? "profit" : "gray"}>
          {side === "income" ? "Income" : "Expense"}
        </Badge>
      </td>
      <td className="min-w-[150px] px-1 py-1">
        <input
          className={cellInput}
          value={line.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Line name"
        />
      </td>
      <td className="min-w-[130px] px-1 py-1">
        <select
          className={cellSelect}
          value={line.category}
          onChange={(e) => patch({ category: e.target.value as Category })}
        >
          {cats.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </td>
      <td className="min-w-[130px] px-1 py-1">
        {tiered ? (
          <div className="space-y-1">
            {biz.groups.map((g) => (
              <div key={g.id} className="flex items-center gap-1.5">
                <span className="w-16 shrink-0 truncate text-xs text-gray-400">{g.label || "All"}</span>
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">R</span>
                  <input
                    className={`${cellInput} pl-5 tabular`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={(line.groupAmounts![g.id] ?? line.amountCents) / 100 || ""}
                    onChange={(e) => {
                      const cents = Math.max(0, Math.round(Number(e.target.value) * 100) || 0);
                      const ga = { ...line.groupAmounts, [g.id]: cents };
                      patch({ groupAmounts: ga, amountCents: ga[biz.groups[0].id] ?? cents });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">R</span>
            <input
              className={`${cellInput} pl-5 tabular`}
              type="number"
              min={0}
              step="0.01"
              value={line.amountCents / 100 || ""}
              onChange={(e) =>
                patch({ amountCents: Math.max(0, Math.round(Number(e.target.value) * 100) || 0) })
              }
              placeholder="0"
            />
          </div>
        )}
      </td>
      <td className="min-w-[110px] px-1 py-1">
        <select className={cellSelect} value={perValue} onChange={(e) => setPer(e.target.value)}>
          <option value="fixed">Fixed</option>
          <option value="perUnit">Per {biz.unitLabel}</option>
          {multiGroup && <option value="tiered">Per group</option>}
        </select>
      </td>
      <td className="min-w-[95px] px-1 py-1">
        <select
          className={cellSelect}
          value={line.frequency}
          onChange={(e) => patch({ frequency: e.target.value as Frequency })}
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
          <option value="yearly">Yearly</option>
        </select>
      </td>
      <td className="whitespace-nowrap px-2 py-1 text-right text-sm font-semibold text-gray-900 tabular">
        {fmtMoney(lineMonthlyCents(line, biz.groups))}/mo
      </td>
      <td className="py-1 pl-1 pr-3">
        <button
          onClick={() => removeLine(biz.id, side, line.id)}
          aria-label={`Delete ${line.name}`}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-loss-50 hover:text-loss-600"
        >
          <Icon name="trash" size={15} />
        </button>
      </td>
    </tr>
  );
}

function BizSection({ biz }: { biz: Business }) {
  const { addLine } = useStore();
  const revenueMo = biz.income.reduce((s, l) => s + lineMonthlyCents(l, biz.groups), 0);
  const expensesMo = biz.expenses.reduce((s, l) => s + lineMonthlyCents(l, biz.groups), 0);
  const net = revenueMo - expensesMo;

  const addDefault = (side: "income" | "expenses") =>
    addLine(biz.id, side, {
      name: side === "income" ? "New income" : "New expense",
      category: side === "income" ? "sales" : "other",
      amountCents: 0,
      frequency: "monthly",
      kind: "fixed",
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-gray-25 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base"
            style={{ background: `${biz.color}1a` }}
          >
            {biz.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900">{biz.name}</h3>
            <p className="truncate text-xs text-gray-500">
              {plural(totalUnits(biz.groups), biz.unitLabel)}
              {biz.groups.length > 1 &&
                ` · ${biz.groups.map((g) => `${g.count} ${g.label}`).join(" · ")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={net > 0 ? "profit" : net < 0 ? "loss" : "warn"}>
            {net >= 0 ? "+" : "−"}
            {fmtMoney(Math.abs(net)).replace("R", "R")}/mo
          </Badge>
          <Button size="sm" variant="secondary" onClick={() => addDefault("income")}>
            <Icon name="plus" size={14} /> Income
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addDefault("expenses")}>
            <Icon name="plus" size={14} /> Expense
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse">
          <thead>
            <tr className="text-left text-xs font-medium text-gray-500">
              <th className="py-2 pl-4 pr-1 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Line</th>
              <th className="px-2 py-2 font-medium">Category</th>
              <th className="px-2 py-2 font-medium">Amount</th>
              <th className="px-2 py-2 font-medium">Per</th>
              <th className="px-2 py-2 font-medium">Every</th>
              <th className="px-2 py-2 text-right font-medium">/month</th>
              <th className="py-2 pl-1 pr-3" />
            </tr>
          </thead>
          <tbody>
            {biz.income.map((l) => (
              <LineRow key={l.id} biz={biz} line={l} side="income" />
            ))}
            {biz.expenses.map((l) => (
              <LineRow key={l.id} biz={biz} line={l} side="expenses" />
            ))}
            {biz.income.length + biz.expenses.length === 0 && (
              <tr className="border-t border-gray-100">
                <td colSpan={8} className="px-4 py-4 text-sm text-gray-400">
                  No lines yet — add income or expenses above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function PortfolioSheet() {
  const { businesses, importBusinesses } = useStore();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ParsedImport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function onFile(f: File) {
    setParseError(null);
    try {
      const parsed = await parseWorkbookFile(f);
      if (parsed.businesses.length === 0) {
        setParseError(
          parsed.warnings[0] ??
            "Nothing importable found — check the Portfolio tab of the template (sample rows are skipped).",
        );
        return;
      }
      setPreview(parsed);
    } catch {
      setParseError("Couldn't read that file — upload the .xlsx template or a .csv with the same columns.");
    }
  }

  const existingNames = new Set(businesses.map((b) => b.name.trim().toLowerCase()));

  return (
    <div className="min-h-dvh bg-gray-50 pb-16">
      <AppHeader />
      <main className="w-full px-5 pt-5 sm:px-8">
        <button
          onClick={() => nav("/app")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <Icon name="chevron-left" size={16} /> Portfolio
        </button>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              Portfolio Sheet
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Every business, line by line — edit here, or download the Excel sheet, fill it in and
              upload it back.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => downloadWorkbook(businesses)}>
              <Icon name="download" size={16} /> Download .xlsx
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> Upload sheet
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {parseError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-loss-200 bg-loss-50 px-4 py-3 text-sm text-loss-700">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> {parseError}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          The download includes your live numbers plus a <strong>SAMPLE</strong> business showing
          every column (tiers, fixed, weekly, yearly) — sample rows are ignored when you upload.
        </p>

        <div className="mt-4 space-y-4">
          {businesses.map((b) => (
            <BizSection key={b.id} biz={b} />
          ))}
          {businesses.length === 0 && (
            <EmptyState
              icon={<Icon name="table" size={22} />}
              title="Nothing to show yet"
              body="Add a business on the dashboard, or download the template, fill it in and upload it."
              action={
                <Button variant="secondary" onClick={() => downloadWorkbook(businesses)}>
                  <Icon name="download" size={16} /> Download the template
                </Button>
              }
            />
          )}
        </div>
      </main>

      <Sheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Import this sheet?"
        footer={
          preview && (
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  importBusinesses(preview.businesses);
                  setPreview(null);
                }}
              >
                <Icon name="check" size={16} /> Import
              </Button>
            </div>
          )
        }
      >
        {preview && (
          <div className="space-y-3">
            <ul className="space-y-2">
              {preview.businesses.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-25 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-gray-900">
                      {b.icon} {b.name}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {plural(totalUnits(b.groups), b.unitLabel)}
                      {b.groups.length > 1 && ` (${b.groups.map((g) => `${g.count} ${g.label}`).join(", ")})`}{" "}
                      · {b.income.length} income · {b.expenses.length} expense lines
                    </span>
                  </span>
                  <Badge tone={existingNames.has(b.name.trim().toLowerCase()) ? "warn" : "brand"}>
                    {existingNames.has(b.name.trim().toLowerCase()) ? "replaces existing" : "new"}
                  </Badge>
                </li>
              ))}
            </ul>
            {preview.sampleRowsSkipped > 0 && (
              <p className="text-xs text-gray-400">
                {preview.sampleRowsSkipped} SAMPLE row{preview.sampleRowsSkipped === 1 ? "" : "s"} ignored.
              </p>
            )}
            {preview.warnings.length > 0 && (
              <div className="rounded-lg border border-warn-100 bg-warn-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-warn-700">
                  {preview.warnings.length} row{preview.warnings.length === 1 ? "" : "s"} skipped:
                </p>
                <ul className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
                  {preview.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-warn-700">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-gray-500">
              Businesses with matching names are replaced by the sheet; everything else stays.
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
