import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-12 text-[color:var(--foreground)]">
      <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--foreground-muted)]">Access portal</p>
        <h1 className="mt-3 text-2xl font-semibold">Sign in to Outside Your Bubble</h1>
        <p className="mt-2 text-sm text-[color:var(--foreground-muted)]">
          Use your email for a magic link or continue with GitHub. We never share your data outside the brief you request.
        </p>
        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email");
            if (typeof email === "string" && email.length > 3) {
              await signIn("email", { email });
            }
          }}
          className="mt-6 space-y-3"
        >
          <label className="flex flex-col gap-2 text-sm text-[color:var(--foreground-muted)]">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-xl border border-[color:var(--border)] bg-[color:var(--ink)] px-3 py-2 text-[color:var(--foreground)] focus:border-[color:var(--accent-warm)] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-[color:var(--accent-warm)] px-4 py-2 text-sm font-semibold text-[color:var(--ink-strong)] hover:brightness-110"
          >
            Send magic link
          </button>
        </form>
        <form
          action={async () => {
            "use server";
            await signIn("github");
          }}
          className="mt-3"
        >
          <button
            type="submit"
            className="w-full rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--foreground)] hover:border-[color:var(--accent-cool)]"
          >
            Continue with GitHub
          </button>
        </form>
      </section>
    </main>
  );
}
