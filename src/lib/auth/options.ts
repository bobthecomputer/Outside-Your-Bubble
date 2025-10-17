import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Email from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import { DEFAULT_PREFERENCES } from "@/lib/config";

const fromAddress = process.env.EMAIL_FROM ?? "news@outsideyourbubble.ai";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
  secure: false,
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
});

async function sendEmail({
  identifier,
  url,
}: {
  identifier: string;
  url: string;
}) {
  if (process.env.RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: identifier,
        subject: "Your Outside Your Bubble magic link",
        html: `<p>Sign in to Outside Your Bubble using the secure link below:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
      }),
    });
    return;
  }

  if (!transporter.options.auth) {
    console.info("[magic-link]", { identifier, url });
    return;
  }

  await transporter.sendMail({
    from: fromAddress,
    to: identifier,
    subject: "Your Outside Your Bubble magic link",
    html: `<p>Sign in to Outside Your Bubble using the secure link below:</p><p><a href="${url}">${url}</a></p><p>This link expires in 15 minutes.</p>`,
  });
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Email({
      from: fromAddress,
      maxAge: 60 * 15,
      sendVerificationRequest: async ({ identifier, url }) => {
        await sendEmail({ identifier, url });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.roles = user.roles as string[];
        session.user.prefs = user.prefs as Record<string, unknown> | undefined;
        session.user.nationality = user.nationality ?? null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
      }
      return token;
    },
    async signIn({ user }) {
      if (!user.roles || user.roles.length === 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: ["free"] },
        });
      }
      return true;
    },
  },
  events: {
    createUser: async ({ user }) => {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          roles: ["free"],
          prefs: DEFAULT_PREFERENCES,
          nationality: null,
        },
      });
    },
  },
};
