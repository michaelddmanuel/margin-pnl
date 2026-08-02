import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Icon } from "../components/Icon";
import { Button, Card, EmptyState, Field, Input, Select, Sheet } from "../components/ui";
import {
  deriveBusiness,
  fmtMoney,
  fmtPct,
  fmtSigned,
  lineMonthlyCents,
  plural,
} from "../lib/engine";
import { useStore } from "../lib/store";
import {
  CATEGORY_LABELS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  type Business,
  type Category,
  type Frequency,
  type Kind,
  type MoneyLine,
} from "../lib/types";
import { AppHeader, BusinessModal } from "./Dashboard";

const DONUT_COLORS = ["#7f56d9", "#2e90fa", "#f79009", "#17b26a", "#ee46bc", "#06aed4", "#98a2b3", "#f04438"];

type TabId = "overview" | "income" | "expenses" | "settings";
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "income", label: "Income" },
  { id: "expenses", label: "Expenses" },
  { id: "settings", label: "Settings" },
];

/* ---------------- line add/edit drawer ---------------- */

function LineSheet({
  biz,
  side,
  editing,
  onClose,
}: {
  biz: Business;
  side: "income" | "expenses";
  editing: MoneyLine | null;
  onClose: () => void;
}) {
  const { addLine, updateLine } = useStore();
  const cats = side === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const [name, setName] = useState(editing?.name ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amountCents / 100) : "");
  const [category, setCategory] = useState<Category>(editing?.category ?? cats[0]);
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? "monthly");
  const [kind, setKind] = useState<Kind>(editing?.kind ?? "fixed");
  const [err, setErr] = useState<string | null>(null);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const n = name.trim();
    const cents = Math.round(Number(amount) * 100);
    if (!n) return setErr("Name the line.");
    if (!Number.isFinite(cents) || cents <= 0) return setErr("Amount must be more than zero.");
    const data = { name: n, category, amountCents: cents, frequency, kind };
    if (editing) updateLine(biz.id, side, { ...data, id: editing.id });
    else addLine(biz.id, side, data);
    onClose();
  }

  const perUnitHint =
    kind === "perUnit"
      ? `× ${biz.unitCount} ${biz.unitLabel}${biz.unitCount === 1 ? "" : "s"} = ${fmtMoney(
          lineMonthlyCents(
            { id: "x", name: "", category, amountCents: Math.round(Number(amount || "0") * 100), frequency, kind },
            biz.unitCount,
          ),
        )}/mo`
      : undefined;

  return (
    <Sheet
      open
      onClose={onClose}
      title={editing ? `Edit ${side === "income" ? "income" : "expense"}` : `Add ${side === "income" ? "income" : "expense"}`}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => submit()} type="button">
            {editing ? "Save" : "Add line"}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" error={err && !name.trim() ? err : undefined}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
            placeholder={side === "income" ? "Tuition" : "Mortgage"}
            autoFocus
          />
        </Field>

        <Field label="Type">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("fixed")}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                kind === "fixed" ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="block text-sm font-semibold text-gray-900">Fixed</span>
              <span className="block text-xs text-gray-500">same every period</span>
            </button>
            <button
              type="button"
              onClick={() => setKind("perUnit")}
              className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                kind === "perUnit" ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100" : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="block text-sm font-semibold text-gray-900">Per {biz.unitLabel}</span>
              <span className="block text-xs text-gray-500">scales with count</span>
            </button>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={kind === "perUnit" ? `Amount per ${biz.unitLabel}` : "Amount"}
            error={err && name.trim() ? err : undefined}
            hint={perUnitHint}
          >
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                className="pl-7"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setErr(null);
                }}
                placeholder="0"
              />
            </div>
          </Field>
          <Field label="Every">
            <Select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              <option value="monthly">Month</option>
              <option value="weekly">Week</option>
              <option value="yearly">Year</option>
            </Select>
          </Field>
        </div>

        <Field label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {cats.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

/* ---------------- line list (income / expenses tabs) ---------------- */

function LineList({ biz, side }: { biz: Business; side: "income" | "expenses" }) {
  const { removeLine } = useStore();
  const [sheet, setSheet] = useState<{ editing: MoneyLine | null } | null>(null);
  const lines = biz[side];
  const totalMo = lines.reduce((s, l) => s + lineMonthlyCents(l, biz.unitCount), 0);
  const isIncome = side === "income";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Total{" "}
          <strong className={`font-semibold tabular ${isIncome ? "text-profit-700" : "text-gray-900"}`}>
            {fmtMoney(totalMo)}/mo
          </strong>
        </p>
        <Button size="sm" onClick={() => setSheet({ editing: null })}>
          <Icon name="plus" size={16} /> Add {isIncome ? "income" : "expense"}
        </Button>
      </div>

      {lines.length === 0 ? (
        <EmptyState
          icon={<Icon name={isIncome ? "coins" : "wallet"} size={22} />}
          title={isIncome ? "No income lines yet" : "No expense lines yet"}
          body={
            isIncome
              ? `What does each ${biz.unitLabel} pay? Add tuition, fees, plans — fixed or per-${biz.unitLabel}.`
              : `Add the mortgage, staff, food — fixed amounts or per-${biz.unitLabel} costs.`
          }
          action={
            <Button variant="secondary" onClick={() => setSheet({ editing: null })}>
              <Icon name="plus" size={16} /> Add the first line
            </Button>
          }
        />
      ) : (
        <Card className="divide-y divide-gray-100">
          {lines.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{l.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {CATEGORY_LABELS[l.category]} ·{" "}
                  {l.kind === "perUnit"
                    ? `${fmtMoney(l.amountCents)}/${biz.unitLabel}/${l.frequency === "monthly" ? "mo" : l.frequency === "weekly" ? "wk" : "yr"}`
                    : `${fmtMoney(l.amountCents)}/${l.frequency === "monthly" ? "mo" : l.frequency === "weekly" ? "wk" : "yr"} fixed`}
                </p>
              </div>
              <span className={`text-sm font-semibold tabular ${isIncome ? "text-profit-700" : "text-gray-900"}`}>
                {fmtMoney(lineMonthlyCents(l, biz.unitCount))}/mo
              </span>
              <div className="flex shrink-0 gap-0.5">
                <button
                  onClick={() => setSheet({ editing: l })}
                  aria-label={`Edit ${l.name}`}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  onClick={() => removeLine(biz.id, side, l.id)}
                  aria-label={`Delete ${l.name}`}
                  className="rounded-lg p-2 text-gray-400 hover:bg-loss-50 hover:text-loss-600"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {sheet && <LineSheet biz={biz} side={side} editing={sheet.editing} onClose={() => setSheet(null)} />}
    </div>
  );
}

/* ---------------- overview tab ---------------- */

function Overview({ biz }: { biz: Business }) {
  const { updateBusiness } = useStore();
  const [whatIf, setWhatIf] = useState<number | null>(null);
  const n = whatIf ?? biz.unitCount;
  const d = deriveBusiness(biz, n);
  const real = deriveBusiness(biz);

  const donutData = useMemo(() => {
    const byCat = new Map<Category, number>();
    for (const l of biz.expenses) {
      byCat.set(l.category, (byCat.get(l.category) ?? 0) + lineMonthlyCents(l, n));
    }
    return [...byCat.entries()]
      .map(([cat, cents]) => ({ name: CATEGORY_LABELS[cat], value: cents / 100 }))
      .sort((a, z) => z.value - a.value);
  }, [biz.expenses, n]);

  const sliderMax = Math.max(biz.unitCount * 2, (d.breakEvenUnits ?? 0) + 5, 20);

  const breakEvenLine = (() => {
    if (biz.income.length === 0) return `Add an income line to see the break-even ${biz.unitLabel} count.`;
    if (d.breakEvenUnits === null)
      return `Each ${biz.unitLabel} costs more than it brings in — adding ${biz.unitLabel}s can't reach break-even. Raise per-${biz.unitLabel} income or cut per-${biz.unitLabel} costs.`;
    if (d.breakEvenUnits === 0) return `Fixed income already covers all costs — profitable at any ${biz.unitLabel} count.`;
    const diff = n - d.breakEvenUnits;
    if (diff >= 0)
      return `Break-even at ${plural(d.breakEvenUnits, biz.unitLabel)} — you have ${n}. In the black.`;
    const need = d.breakEvenUnits - n;
    return need === 1
      ? `Break-even at ${plural(d.breakEvenUnits, biz.unitLabel)}, you have ${n} — one more ${biz.unitLabel} flips this green.`
      : `Break-even at ${plural(d.breakEvenUnits, biz.unitLabel)}, you have ${n} — ${need} more to flip green.`;
  })();

  const kpis = [
    { label: "Revenue / mo", value: fmtMoney(d.revenueMo), tone: "text-gray-900" },
    { label: "Expenses / mo", value: fmtMoney(d.expensesMo), tone: "text-gray-900" },
    {
      label: "Net / mo",
      value: fmtSigned(d.netMo),
      tone: d.netMo > 0 ? "text-profit-700" : d.netMo < 0 ? "text-loss-700" : "text-gray-900",
    },
    {
      label: "Margin",
      value: fmtPct(d.marginPct),
      tone: (d.marginPct ?? 0) > 0 ? "text-profit-700" : (d.marginPct ?? 0) < 0 ? "text-loss-700" : "text-gray-900",
    },
    {
      label: "Break-even",
      value: d.breakEvenUnits === null ? "—" : plural(d.breakEvenUnits, biz.unitLabel),
      tone: "text-gray-900",
    },
  ];

  return (
    <div className="space-y-4">
      {/* the verdict */}
      <Card
        className={`p-5 ${d.status === "profit" ? "border-profit-200 bg-profit-50" : d.status === "loss" ? "border-loss-200 bg-loss-50" : "border-warn-100 bg-warn-50"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-600">
              {d.status === "profit" ? "Making money" : d.status === "loss" ? "Losing money" : "Breaking even"}
              {whatIf !== null && whatIf !== biz.unitCount && " (what-if)"}
            </p>
            <p
              className={`mt-1 text-3xl font-bold tracking-tight tabular ${d.status === "profit" ? "text-profit-700" : d.status === "loss" ? "text-loss-700" : "text-warn-700"}`}
            >
              {fmtSigned(d.netMo)}
              <span className="text-lg font-semibold">/mo</span>
            </p>
          </div>
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full ${d.status === "profit" ? "bg-profit-100 text-profit-700" : d.status === "loss" ? "bg-loss-100 text-loss-700" : "bg-warn-100 text-warn-700"}`}
          >
            <Icon name={d.status === "loss" ? "trend-down" : "trend-up"} size={24} />
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{breakEvenLine}</p>
      </Card>

      {/* KPI row */}
      <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
        {kpis.map((k) => (
          <Card key={k.label} className="min-w-[130px] flex-1 p-3.5">
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <p className={`mt-1 truncate text-lg font-bold tabular ${k.tone}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* what-if slider */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Icon name="sliders" size={16} className="text-brand-600" /> What if…
          </h3>
          {whatIf !== null && whatIf !== biz.unitCount && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setWhatIf(null)}>
                Reset
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  updateBusiness(biz.id, { unitCount: whatIf });
                  setWhatIf(null);
                }}
              >
                <Icon name="check" size={14} /> Make it real
              </Button>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Drag the {biz.unitLabel} count — watch the verdict flip.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <input
            type="range"
            className="whatif flex-1"
            min={0}
            max={sliderMax}
            step={1}
            value={n}
            onChange={(e) => setWhatIf(Number(e.target.value))}
            aria-label={`what-if ${biz.unitLabel} count`}
          />
          <div className="w-20 shrink-0 text-right">
            <span className="text-2xl font-bold text-gray-900 tabular">{n}</span>
            <span className="block text-xs text-gray-500">{biz.unitLabel}{n === 1 ? "" : "s"}</span>
          </div>
        </div>
        {d.breakEvenUnits !== null && d.breakEvenUnits > 0 && d.breakEvenUnits <= sliderMax && (
          <div className="relative mt-1 h-4">
            <span
              className="absolute -translate-x-1/2 text-[10px] font-medium text-gray-400"
              style={{ left: `${(d.breakEvenUnits / sliderMax) * 100}%` }}
            >
              ▲ break-even {d.breakEvenUnits}
            </span>
          </div>
        )}
        {whatIf !== null && whatIf !== biz.unitCount && (
          <p className="mt-2 text-sm text-gray-600 tabular">
            At {plural(whatIf, biz.unitLabel)}:{" "}
            <strong className={d.netMo >= 0 ? "text-profit-700" : "text-loss-700"}>{fmtSigned(d.netMo)}/mo</strong>{" "}
            <span className="text-gray-400">
              (now: {fmtSigned(real.netMo)}/mo at {biz.unitCount})
            </span>
          </p>
        )}
      </Card>

      {/* expense breakdown donut */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-900">Where the money goes</h3>
        {donutData.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No expense lines yet — add them in the Expenses tab.</p>
        ) : (
          <div className="mt-2 flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
            <div className="relative h-48 w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={false}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => fmtMoney(Math.round((v as number) * 100))}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #eaecf0",
                      boxShadow: "0 4px 8px -2px rgb(16 24 40 / 0.1)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-lg font-bold text-gray-900 tabular">{fmtMoney(d.expensesMo)}</span>
              </div>
            </div>
            <ul className="w-full space-y-1.5">
              {donutData.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  <span className="flex-1 truncate text-gray-600">{s.name}</span>
                  <span className="font-medium text-gray-900 tabular">{fmtMoney(Math.round(s.value * 100))}</span>
                  <span className="w-11 text-right text-xs text-gray-400 tabular">
                    {d.expensesMo > 0 ? `${(((s.value * 100) / d.expensesMo) * 100).toFixed(0)}%` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- settings tab ---------------- */

function Settings({ biz }: { biz: Business }) {
  const { removeBusiness, resetDemo } = useStore();
  const nav = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-gray-900">Business</h3>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p>
            Name <strong className="float-right font-semibold text-gray-900">{biz.name}</strong>
          </p>
          <p>
            Unit <strong className="float-right font-semibold text-gray-900">{biz.unitLabel}</strong>
          </p>
          <p>
            Count <strong className="float-right font-semibold text-gray-900 tabular">{biz.unitCount}</strong>
          </p>
          <p>
            Currency <strong className="float-right font-semibold text-gray-900">USD</strong>
          </p>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={() => setEditOpen(true)}>
          <Icon name="edit" size={16} /> Edit name, icon, unit &amp; count
        </Button>
      </Card>

      <Card className="border-loss-200 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-loss-700">
          <Icon name="alert" size={16} /> Danger zone
        </h3>
        <p className="mt-1.5 text-sm text-gray-500">
          Deleting removes this business and all its lines. This is real — there's no undo.
        </p>
        <Button variant="danger-secondary" className="mt-4 w-full" onClick={() => setConfirming(true)}>
          <Icon name="trash" size={16} /> Delete {biz.name}
        </Button>
      </Card>

      <p className="text-center text-xs text-gray-400">
        Wiped everything by accident?{" "}
        <button
          className="font-medium text-brand-600 hover:underline"
          onClick={() => {
            resetDemo();
            nav("/app");
          }}
        >
          Restore the demo portfolio
        </button>
      </p>

      {editOpen && <BusinessModal open onClose={() => setEditOpen(false)} editing={biz} />}

      <Sheet
        open={confirming}
        onClose={() => {
          setConfirming(false);
          setConfirmText("");
        }}
        title="Delete business?"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
              }}
            >
              Keep it
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={confirmText.trim().toLowerCase() !== biz.name.toLowerCase()}
              onClick={() => {
                removeBusiness(biz.id);
                nav("/app");
              }}
            >
              Delete forever
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          This permanently deletes <strong className="text-gray-900">{biz.name}</strong> and all{" "}
          {biz.income.length + biz.expenses.length} of its money lines.
        </p>
        <Field label={`Type "${biz.name}" to confirm`}>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={biz.name}
            className="mt-3"
          />
        </Field>
      </Sheet>
    </div>
  );
}

/* ---------------- page shell ---------------- */

export function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { businesses } = useStore();
  const [tab, setTab] = useState<TabId>("overview");
  const biz = businesses.find((b) => b.id === id);

  if (!biz) {
    return (
      <div className="min-h-dvh bg-gray-50">
        <AppHeader />
        <main className="mx-auto max-w-3xl px-5 pt-10">
          <EmptyState
            icon={<Icon name="alert" size={22} />}
            title="Business not found"
            body="It may have been deleted. Head back to the portfolio."
            action={<Button onClick={() => nav("/app")}>Back to portfolio</Button>}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-16">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pt-5">
        <button
          onClick={() => nav("/app")}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <Icon name="chevron-left" size={16} /> Portfolio
        </button>

        <div className="mt-3 flex items-center gap-3">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
            style={{ background: `${biz.color}1a` }}
          >
            {biz.icon}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-gray-900">{biz.name}</h1>
            <p className="text-sm text-gray-500">
              {plural(biz.unitCount, biz.unitLabel)} · estimated monthly
            </p>
          </div>
        </div>

        {/* segmented control */}
        <div className="mt-5 grid grid-cols-4 gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2 py-2 text-sm font-semibold transition-colors ${
                tab === t.id ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === "overview" && <Overview biz={biz} />}
          {tab === "income" && <LineList biz={biz} side="income" />}
          {tab === "expenses" && <LineList biz={biz} side="expenses" />}
          {tab === "settings" && <Settings biz={biz} />}
        </div>
      </main>
    </div>
  );
}
