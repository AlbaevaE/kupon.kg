import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { StaffRole } from "@prisma/client";
import type { JWT } from "@auth/core/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      businessId: string;
      businessName: string;
      businessSlug: string;
      role: StaffRole;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    role: StaffRole;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    role: StaffRole;
  }
}

// Reference imported JWT type so the augmentation above is in scope.
type _UseJWT = JWT;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const staff = await prisma.staffMember.findUnique({
          where: { email },
          include: { business: true },
        });

        if (!staff) return null;

        const valid = await bcrypt.compare(password, staff.passwordHash);
        if (!valid) return null;

        return {
          id: staff.id,
          email: staff.email,
          name: staff.name,
          businessId: staff.businessId,
          businessName: staff.business.name,
          businessSlug: staff.business.slug,
          role: staff.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? "";
        token.businessId = user.businessId;
        token.businessName = user.businessName;
        token.businessSlug = user.businessSlug;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.businessId = token.businessId;
      session.user.businessName = token.businessName;
      session.user.businessSlug = token.businessSlug;
      session.user.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
});
