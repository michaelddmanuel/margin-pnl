import { Link } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Button } from "../components/ui";

function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#7f56d9" />
      <rect x="14" y="34" width="9" height="16" rx="2.5" fill="#fff" opacity="0.72" />
      <rect x="27.5" y="26" width="9" height="24" rx="2.5" fill="#fff" opacity="0.88" />
      <rect x="41" y="16" width="9" height="34" rx="2.5" fill="#fff" />
    </svg>
  );
}

const features = [
  {
    icon: "layers" as const,
    title: "Every business, one screen",
    body: "Day care, cleaning company, whatever's next — add each one and the portfolio view rolls them all up so you can see which ones carry the others.",
  },
  {
    icon: "coins" as const,
    title: "Per-kid, per-client costs",
    body: "Every line is fixed (\"mortgage $2,400/mo\") or per-unit (\"food $150 per kid\"). Margin multiplies, normalizes to monthly, and does the arithmetic that matters.",
  },
  {
    icon: "target" as const,
    title: "The break-even line",
    body: "\"You need 9 kids to be in the black.\" Drag the what-if slider and watch the number flip green or red — before you sign the lease.",
  },
];

export function Home() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-gray-900">Margin</span>
        </div>
        <Link to="/login">
          <Button variant="secondary" size="sm">
            Log in
          </Button>
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-3xl px-5 pb-14 pt-12 text-center sm:pt-20">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            <Icon name="bar-chart" size={14} /> Multi-business P&amp;L cockpit
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl sm:leading-[1.1]">
            Are we making money —<br className="hidden sm:block" /> or losing it?
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
            One honest dashboard for every business you run. Feed it real numbers — the mortgage,
            food per kid, what each kid pays — and read the verdict: profit, margin&nbsp;%, and the
            break-even line.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Open the cockpit <Icon name="arrow-right" size={18} />
              </Button>
            </Link>
            <span className="text-sm text-gray-500">
              Demo login: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700">admin / admin</code>
            </span>
          </div>

          {/* verdict strip mock */}
          <div className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg">🏠</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Sunshine Day Care</p>
                  <p className="text-xs text-gray-500">12 kids · $800/kid tuition</p>
                </div>
              </div>
              <span className="rounded-full border border-profit-200 bg-profit-50 px-2.5 py-0.5 text-sm font-semibold text-profit-700 tabular">
                +$1,750/mo
              </span>
            </div>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="bg-profit-500" style={{ width: "82%" }} />
              <div className="bg-loss-500" style={{ width: "18%" }} />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Break-even at <strong className="text-gray-900">10 kids</strong> — you have 12.{" "}
              <span className="font-medium text-profit-700">In the black.</span>
            </p>
          </div>
        </section>

        <section className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto grid max-w-5xl gap-4 px-5 py-14 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name={f.icon} size={20} />
                </div>
                <h3 className="text-base font-semibold text-gray-900">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 px-5 py-8 text-center">
        <p className="text-sm text-gray-500">
          Margin · demo build — your numbers live in this browser only. Not accounting software; all
          figures are estimated monthly.
        </p>
      </footer>
    </div>
  );
}
