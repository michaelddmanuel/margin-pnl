import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { Button, Field, Input } from "../components/ui";
import { signIn } from "../lib/store";

export function Login() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (signIn(user, pass)) {
      nav(loc.state?.from ?? "/app", { replace: true });
    } else {
      setError("That's not it — the demo gate is admin / admin.");
    }
  }

  function fillDemo() {
    setUser("admin");
    setPass("admin");
    setError(null);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <Link to="/" className="mx-auto mb-6 flex items-center gap-2.5">
          <svg width={40} height={40} viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#7f56d9" />
            <rect x="14" y="34" width="9" height="16" rx="2.5" fill="#fff" opacity="0.72" />
            <rect x="27.5" y="26" width="9" height="24" rx="2.5" fill="#fff" opacity="0.88" />
            <rect x="41" y="16" width="9" height="34" rx="2.5" fill="#fff" />
          </svg>
        </Link>
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900">
          Log in to Margin
        </h1>
        <p className="mt-1.5 text-center text-sm text-gray-500">
          One dashboard for every business you run.
        </p>

        <button
          type="button"
          onClick={fillDemo}
          className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
        >
          <Icon name="lock" size={14} /> Demo: admin / admin — tap to fill
        </button>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <Field label="Username" error={error ?? undefined}>
            <Input
              value={user}
              onChange={(e) => {
                setUser(e.target.value);
                setError(null);
              }}
              placeholder="admin"
              autoCapitalize="none"
              autoComplete="username"
              aria-invalid={!!error}
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={pass}
              onChange={(e) => {
                setPass(e.target.value);
                setError(null);
              }}
              placeholder="admin"
              autoComplete="current-password"
              aria-invalid={!!error}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full">
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs leading-relaxed text-gray-400">
          Demo build — this gate is a stage prop, not security. Your numbers live in this browser
          only.
        </p>
      </div>
    </div>
  );
}
