import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        token.id = user.id;
        token.businessId = (user as any).businessId;
        token.businessName = (user as any).businessName;
        token.businessSlug = (user as any).businessSlug;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as any).businessId = token.businessId;
      (session.user as any).businessName = token.businessName;
      (session.user as any).businessSlug = token.businessSlug;
      (session.user as any).role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: { strategy: "jwt" },
});
