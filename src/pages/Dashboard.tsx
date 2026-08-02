import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Badge, Button, Card, EmptyState, Field, Input, Sheet } from "../components/ui";
import { deriveBusiness, fmtMoney, fmtSigned, plural } from "../lib/engine";
import { signOut, useStore } from "../lib/store";
import { BUSINESS_COLORS, BUSINESS_ICONS, type Business } from "../lib/types";

export function AppHeader() {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link to="/app" className="flex items-center gap-2">
          <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#7f56d9" />
            <rect x="14" y="34" width="9" height="16" rx="2.5" fill="#fff" opacity="0.72" />
            <rect x="27.5" y="26" width="9" height="24" rx="2.5" fill="#fff" opacity="0.88" />
            <rect x="41" y="16" width="9" height="34" rx="2.5" fill="#fff" />
          </svg>
          <span className="text-base font-bold tracking-tight text-gray-900">Margin</span>
        </Link>
        <button
          onClick={() => {
            signOut();
            nav("/login");
          }}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Icon name="logout" size={16} /> Log out
        </button>
      </div>
    </header>
  );
}

/* ---------------- New / Edit business modal ---------------- */

export function BusinessModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing?: Business;
}) {
  const { addBusiness, updateBusiness } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? BUSINESS_ICONS[0]);
  const [color, setColor] = useState(editing?.color ?? BUSINESS_COLORS[0]);
  const [unitLabel, setUnitLabel] = useState(editing?.unitLabel ?? "");
  const [unitCount, setUnitCount] = useState(editing ? String(editing.unitCount) : "");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const u = unitLabel.trim().toLowerCase() || "unit";
    const c = Math.max(0, Math.round(Number(unitCount) || 0));
    if (!n) {
      setErr("Give it a name.");
      return;
    }
    if (editing) {
      updateBusiness(editing.id, { name: n, icon, color, unitLabel: u, unitCount: c });
      onClose();
    } else {
      const biz = addBusiness({ name: n, icon, color, unitLabel: u, unitCount: c });
      onClose();
      nav(`/app/b/${biz.id}`);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Edit business" : "New business"}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit as unknown as () => void} type="button">
            {editing ? "Save" : "Add business"}
          </Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" error={err ?? undefined}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr(null);
            }}
            placeholder="Day Care #2"
            aria-invalid={!!err}
            autoFocus
          />
        </Field>

        <Field label="Icon">
          <div className="flex flex-wrap gap-2">
            {BUSINESS_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`flex h-10 w-10 items-center justify-center rounded-lg border text-lg transition-colors ${
                  icon === i
                    ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div className="flex gap-2.5">
            {BUSINESS_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`color ${c}`}
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-110 ring-2 ring-gray-900 ring-offset-2" : ""}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Unit" hint='"kid", "client", "order"…'>
            <Input
              value={unitLabel}
              onChange={(e) => setUnitLabel(e.target.value)}
              placeholder="kid"
            />
          </Field>
          <Field label="How many right now?">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              value={unitCount}
              onChange={(e) => setUnitCount(e.target.value)}
              placeholder="12"
            />
          </Field>
        </div>
        {/* allow Enter key to submit */}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

/* ---------------- Business card ---------------- */

function BizCard({ biz }: { biz: Business }) {
  const nav = useNavigate();
  const d = deriveBusiness(biz);
  const total = d.revenueMo + d.expensesMo;
  const revPct = total > 0 ? (d.revenueMo / total) * 100 : 50;

  return (
    <Card className="p-4 sm:p-5" onClick={() => nav(`/app/b/${biz.id}`)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: `${biz.color}1a` }}
          >
            {biz.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">{biz.name}</h3>
            <p className="text-sm text-gray-500">{plural(biz.unitCount, biz.unitLabel)}</p>
          </div>
        </div>
        <Badge tone={d.status === "profit" ? "profit" : d.status === "loss" ? "loss" : "warn"}>
          {d.status === "profit" ? (
            <Icon name="trend-up" size={12} />
          ) : d.status === "loss" ? (
            <Icon name="trend-down" size={12} />
          ) : null}
          {fmtSigned(d.netMo)}/mo
        </Badge>
      </div>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="bg-profit-500" style={{ width: `${revPct}%` }} />
        <div className="bg-loss-500" style={{ width: `${100 - revPct}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500 tabular">
        <span>
          In <strong className="font-semibold text-gray-700">{fmtMoney(d.revenueMo)}</strong>
        </span>
        <span>
          Out <strong className="font-semibold text-gray-700">{fmtMoney(d.expensesMo)}</strong>
        </span>
      </div>
    </Card>
  );
}

/* ---------------- Dashboard ---------------- */

export function Dashboard() {
  const { businesses } = useStore();
  const [adding, setAdding] = useState(false);

  const portfolio = useMemo(() => {
    const derived = businesses.map((b) => ({ b, d: deriveBusiness(b) }));
    const totalNet = derived.reduce((s, x) => s + x.d.netMo, 0);
    const profitable = derived.filter((x) => x.d.netMo > 0).length;
    const sorted = [...derived].sort((a, z) => z.d.netMo - a.d.netMo);
    return { derived, totalNet, profitable, best: sorted[0], worst: sorted[sorted.length - 1] };
  }, [businesses]);

  return (
    <div className="min-h-dvh bg-gray-50 pb-24">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-5 pt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Portfolio</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {plural(businesses.length, "business").replace("businesss", "businesses")} · estimated
              monthly
            </p>
          </div>
          <div className="hidden sm:block">
            <Button onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} /> Add business
            </Button>
          </div>
        </div>

        {businesses.length > 0 && (
          <div className="no-scrollbar -mx-5 mt-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
            <Card className="min-w-[150px] flex-1 p-4">
              <p className="text-xs font-medium text-gray-500">Total net / mo</p>
              <p
                className={`mt-1 text-xl font-bold tabular ${portfolio.totalNet >= 0 ? "text-profit-700" : "text-loss-700"}`}
              >
                {fmtSigned(portfolio.totalNet)}
              </p>
            </Card>
            <Card className="min-w-[150px] flex-1 p-4">
              <p className="text-xs font-medium text-gray-500">Profitable</p>
              <p className="mt-1 text-xl font-bold text-gray-900 tabular">
                {portfolio.profitable}
                <span className="text-sm font-medium text-gray-400"> / {businesses.length}</span>
              </p>
            </Card>
            <Card className="min-w-[170px] flex-1 p-4">
              <p className="text-xs font-medium text-gray-500">Best performer</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                {portfolio.best ? `${portfolio.best.b.icon} ${portfolio.best.b.name}` : "—"}
              </p>
              {portfolio.best && (
                <p className="text-xs font-medium text-profit-700 tabular">
                  {fmtSigned(portfolio.best.d.netMo)}/mo
                </p>
              )}
            </Card>
            <Card className="min-w-[170px] flex-1 p-4">
              <p className="text-xs font-medium text-gray-500">Needs attention</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                {portfolio.worst ? `${portfolio.worst.b.icon} ${portfolio.worst.b.name}` : "—"}
              </p>
              {portfolio.worst && (
                <p
                  className={`text-xs font-medium tabular ${portfolio.worst.d.netMo < 0 ? "text-loss-700" : "text-profit-700"}`}
                >
                  {fmtSigned(portfolio.worst.d.netMo)}/mo
                </p>
              )}
            </Card>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {portfolio.derived.map(({ b }) => (
            <BizCard key={b.id} biz={b} />
          ))}
        </div>

        {businesses.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon={<Icon name="layers" size={22} />}
              title="No businesses yet"
              body="Add your first one — name it, pick its unit (kid, client, order), and start feeding it real numbers."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Icon name="plus" size={18} /> Add your first business
                </Button>
              }
            />
          </div>
        )}

        <p className="mt-10 text-center text-xs text-gray-400">
          Demo build — data lives in this browser only. Estimated monthly figures; not accounting
          software.
        </p>
      </main>

      {/* mobile FAB */}
      <button
        onClick={() => setAdding(true)}
        aria-label="Add business"
        className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-colors hover:bg-brand-700 sm:hidden"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <Icon name="plus" size={24} />
      </button>

      {adding && <BusinessModal open onClose={() => setAdding(false)} />}
    </div>
  );
}
