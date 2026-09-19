import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-col bg-[var(--color-canvas)]">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <p className="text-lg font-semibold text-[var(--color-ink)]">PaySell</p>
          <Link
            href="/auth/login"
            className="rounded-lg bg-[var(--color-brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]"
          >
            Admin sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--color-brand)]">
          Commerce through conversation
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
          WhatsApp-first digital commerce for informal vendors.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-ink-muted)]">
          PaySell helps vendors list products, receive orders, and complete
          sales through WhatsApp. This web console is for operations staff.
          Buyers and sellers stay in the conversation.
        </p>
      </main>
    </div>
  );
}
