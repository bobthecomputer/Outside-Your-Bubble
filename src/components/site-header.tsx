import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { CommandPalette } from "@/components/command-palette";
import { OYB_BRAND } from "@/lib/config";

export async function SiteHeader() {
  const session = await auth();
  const brandParts = OYB_BRAND.name.split(" ");
  const brandLead = brandParts[0] ?? OYB_BRAND.name;
  const brandAccent = brandParts[1];
  const brandTail = brandParts.slice(2).join(" ");
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface-glass)] px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex flex-col">
          <Link href="/" className="text-lg font-semibold text-[color:var(--foreground)] font-serif tracking-tight">
            <span>{brandLead}</span>
            {brandAccent && <span className="text-[color:var(--accent-warm)]"> {brandAccent}</span>}
            {brandTail && <span> {brandTail}</span>}
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--foreground-muted)]">
            {OYB_BRAND.slogan}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <CommandPalette />
          {session?.user ? (
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--foreground)] hover:border-[color:var(--accent-cool)] hover:text-[color:var(--paper-bright)]"
              >
                Sign out
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                "use server";
                await signIn();
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--foreground)] hover:border-[color:var(--accent-warm)] hover:text-[color:var(--paper-bright)]"
              >
                Sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
