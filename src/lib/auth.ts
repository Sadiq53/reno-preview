import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { Role } from "@prisma/client";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only-32chars",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@renohub.agency" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          // Allow seamless login with Crewvia Vanguard domain aliases (.in, .agency, renohub)
          const domainSuffixes = ["@crewvia.in", "@crewvia.agency", "@renohub.agency"];
          const currentSuffix = domainSuffixes.find((suffix) => normalizedEmail.endsWith(suffix));
          if (currentSuffix) {
            const prefix = normalizedEmail.slice(0, -currentSuffix.length);
            for (const suffix of domainSuffixes) {
              if (suffix === currentSuffix) continue;
              user = await prisma.user.findUnique({
                where: { email: `${prefix}${suffix}` },
              });
              if (user) break;
            }
          }
        }

        if (!user || !user.passwordHash) {
          throw new Error("Invalid credentials");
        }

        // Check if user is suspended
        if (user.status === "SUSPENDED") {
          const now = new Date();
          if (user.suspendedUntil && user.suspendedUntil <= now) {
            // Auto-lift expired suspension
            await prisma.user.update({
              where: { id: user.id },
              data: {
                status: "ACTIVE",
                suspendedUntil: null,
                suspendReason: null,
              },
            });
            user.status = "ACTIVE";
          } else {
            const reasonMsg = user.suspendReason ? `: ${user.suspendReason}` : "";
            const untilMsg = user.suspendedUntil
              ? ` until ${user.suspendedUntil.toLocaleDateString()}`
              : " permanently";
            throw new Error(`Your account has been suspended${untilMsg}${reasonMsg}. Please contact the agency owner.`);
          }
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) {
          throw new Error("Invalid credentials");
        }

        const avatar = user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: avatar,
          status: user.status,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role as Role;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token?.id) {
        return session;
      }

      try {
        // Live verification against PostgreSQL to prevent zombie sessions & enforce deletion / suspension
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            status: true,
            suspendedUntil: true,
            suspendReason: true,
          },
        });

        // 1. Account was permanently deleted from DB
        if (!dbUser) {
          return {
            ...session,
            user: null as any,
            error: "ACCOUNT_DELETED",
          };
        }

        // 2. Account is suspended
        if (dbUser.status === "SUSPENDED") {
          const now = new Date();
          // If temporary suspension duration has passed, automatically lift it
          if (dbUser.suspendedUntil && dbUser.suspendedUntil <= now) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: {
                status: "ACTIVE",
                suspendedUntil: null,
                suspendReason: null,
              },
            });
            dbUser.status = "ACTIVE";
          } else {
            // Still suspended: kill active session immediately
            return {
              ...session,
              user: null as any,
              error: "ACCOUNT_SUSPENDED",
            };
          }
        }

        // 3. User is active and valid: live hydration of profile & avatar
        const avatar = dbUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dbUser.name)}`;

        session.user = {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          image: avatar,
          status: dbUser.status,
          avatarUrl: dbUser.avatarUrl,
        };
      } catch (err) {
        console.error("[AUTH_SESSION_LOOKUP_ERROR]", err);
      }

      return session;
    },
  },
};
