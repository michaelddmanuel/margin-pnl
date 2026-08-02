import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Badge, Button, Card, EmptyState, Field, Input, Sheet } from "../components/ui";
import { deriveBusiness, fmtMoney, fmtSigned, plural, totalUnits } from "../lib/engine";
import { newId } from "../lib/seed";
import { signOut, useStore } from "../lib/store";
import { BUSINESS_COLORS, BUSINESS_ICONS, type Business, type UnitGroup } from "../lib/types";

export function AppHeader() {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="flex w-full items-center justify-between px-5 py-3 sm:px-8">
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
  const [rows, setRows] = useState<{ id: string; label: string; count: string }[]>(
    editing
      ? editing.groups.map((g) => ({ id: g.id, label: g.label, count: String(g.count) }))
      : [{ id: newId("grp"), label: "", count: "" }],
  );
  const [err, setErr] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const u = unitLabel.trim().toLowerCase() || "unit";
    if (!n) {
      setErr("Give it a name.");
      return;
    }
    const groups: UnitGroup[] = rows.map((r, i) => ({
      id: r.id,
      label: r.label.trim() || (rows.length > 1 ? `Tier ${i + 1}` : ""),
      count: Math.max(0, Math.round(Number(r.count) || 0)),
    }));
    if (editing) {
      updateBusiness(editing.id, { name: n, icon, color, unitLabel: u, groups });
      onClose();
    } else {
      const biz = addBusiness({ name: n, icon, color, unitLabel: u, groups });
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

        <Field label="Unit" hint='"kid", "client", "order"…'>
          <Input
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="kid"
          />
        </Field>

        <Field
          label={rows.length > 1 ? `${unitLabel.trim() || "Unit"} groups & counts` : "How many right now?"}
          hint={
            rows.length > 1
              ? "Each group can have its own price on per-unit lines (e.g. by age)."
              : undefined
          }
        >
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={r.id} className="flex items-center gap-2">
                {rows.length > 1 && (
                  <Input
                    value={r.label}
                    onChange={(e) =>
                      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))
                    }
                    placeholder={i === 0 ? "Under 3" : "Ages 3–6"}
                    className="flex-1"
                  />
                )}
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={r.count}
                  onChange={(e) =>
                    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, count: e.target.value } : x)))
                  }
                  placeholder="12"
                  className={rows.length > 1 ? "w-24" : ""}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove group"
                    onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                    className="rounded-lg p-2 text-gray-400 hover:bg-loss-50 hover:text-loss-600"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, { id: newId("grp"), label: "", count: "" }])}
              className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <Icon name="plus" size={16} /> Add {unitLabel.trim() || "unit"} group (different price tier)
            </button>
          </div>
        </Field>
        {/* allow Enter key to submit */}
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}

/* ---------------- delete confirm (shared: dashboard card menu + settings tab) ---------------- */

export function DeleteBusinessSheet({
  biz,
  open,
  onClose,
  afterDelete,
}: {
  biz: Business;
  open: boolean;
  onClose: () => void;
  afterDelete?: () => void;
}) {
  const { removeBusiness } = useStore();
  const [text, setText] = useState("");
  const close = () => {
    setText("");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title="Delete business?"
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={close}>
            Keep it
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={text.trim().toLowerCase() !== biz.name.toLowerCase()}
            onClick={() => {
              removeBusiness(biz.id);
              close();
              afterDelete?.();
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={biz.name}
          className="mt-3"
        />
      </Field>
    </Sheet>
  );
}

/* ---------------- Business card ---------------- */

function BizCard({ biz }: { biz: Business }) {
  const nav = useNavigate();
  const d = deriveBusiness(biz);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const total = d.revenueMo + d.expensesMo;
  const revPct = total > 0 ? (d.revenueMo / total) * 100 : 50;

  return (
    <Card className="p-4 sm:p-5" onClick={() => nav(`/app/b/${biz.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
            style={{ background: `${biz.color}1a` }}
          >
            {biz.icon}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-gray-900">{biz.name}</h3>
            <p className="truncate text-sm text-gray-500">
              {plural(totalUnits(biz.groups), biz.unitLabel)}
              {biz.groups.length > 1 &&
                ` · ${biz.groups.map((g) => `${g.count} ${g.label}`).join(" · ")}`}
            </p>
          </div>
        </div>
        <div className="relative flex shrink-0 items-center gap-1">
          <Badge tone={d.status === "profit" ? "profit" : d.status === "loss" ? "loss" : "warn"}>
            {d.status === "profit" ? (
              <Icon name="trend-up" size={12} />
            ) : d.status === "loss" ? (
              <Icon name="trend-down" size={12} />
            ) : null}
            {fmtSigned(d.netMo)}/mo
          </Badge>
          <button
            aria-label={`Menu for ${biz.name}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <Icon name="dots" size={18} />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="anim-pop absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                >
                  <Icon name="edit" size={16} /> Edit business
                </button>
                <button
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-loss-600 hover:bg-loss-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setDeleteOpen(true);
                  }}
                >
                  <Icon name="trash" size={16} /> Delete…
                </button>
              </div>
            </>
          )}
        </div>
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

      {/* modals live inside the clickable card — block bubbling to nav */}
      {(editOpen || deleteOpen) && (
        <div onClick={(e) => e.stopPropagation()} className="cursor-default">
          {editOpen && <BusinessModal open onClose={() => setEditOpen(false)} editing={biz} />}
          <DeleteBusinessSheet biz={biz} open={deleteOpen} onClose={() => setDeleteOpen(false)} />
        </div>
      )}
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
      <main className="w-full px-5 pt-6 sm:px-8">
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
          <div className="no-scrollbar -mx-5 mt-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-4">
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
