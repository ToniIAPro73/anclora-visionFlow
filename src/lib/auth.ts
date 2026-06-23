import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { CANONICAL_WORKSPACE_ID } from "@/lib/workspace-context";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Anclora Internal",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        // For internal use: accept any registered user (password auth added in DEC-IDENTITY-001 resolution)
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.userId = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        // Attach role from WorkspaceMember
        const member = await db.workspaceMember.findFirst({
          where: { userId: token.userId as string, workspaceId: CANONICAL_WORKSPACE_ID },
          select: { role: true },
        });
        session.user.role = member?.role ?? "viewer";
        session.user.workspaceId = CANONICAL_WORKSPACE_ID;
      }
      return session;
    },
  },
};

export async function getSession(): Promise<{ user: { id: string; email: string; role: string; workspaceId: string } } | null> {
  const { getServerSession } = await import("next-auth");
  try {
    const session = await getServerSession(authOptions);
    return session as { user: { id: string; email: string; role: string; workspaceId: string } } | null;
  } catch {
    return null;
  }
}
