import Link from "next/link";
import { auth, signIn, signOut } from "@/lib/auth";
import { CommandPalette } from "@/components/command-palette";
import { OYB_BRAND } from "@/lib/config";

export async function SiteHeader() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-900/60 bg-neutral-950/75 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <div className="flex flex-col">
          <Link href="/" className="text-lg font-semibold text-neutral-100">
            {OYB_BRAND.name}
          </Link>
          <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">
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
                className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
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
                className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
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
