import NextAuth from "next-auth";
import { authConfig } from "./options";

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);

export const { GET, POST } = handlers;
