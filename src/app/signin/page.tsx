import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col justify-center gap-6 px-4 py-12 text-neutral-200">
      <h1 className="text-2xl font-semibold">Sign in to Outside Your Bubble</h1>
      <p className="text-sm text-neutral-400">
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
        className="space-y-3"
      >
        <label className="flex flex-col gap-2 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-neutral-100 focus:border-sky-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Send magic link
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md border border-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
        >
          Continue with GitHub
        </button>
      </form>
    </main>
  );
}
