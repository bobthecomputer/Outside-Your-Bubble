declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles?: string[];
      prefs?: Record<string, unknown>;
      nationality?: string | null;
    };
  }

  interface User {
    roles: string[];
    prefs: Record<string, unknown> | null;
    nationality: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
  }
}
