import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

const API_URL = process.env.BACKEND_URL || "http://localhost:8000";

// Augment session type so session.user.id is always present
declare module "next-auth" {
    interface Session {
        user: { id: string } & DefaultSession["user"];
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        }),

        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                try {
                    const res = await fetch(`${API_URL}/api/auth/user-by-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: credentials.email }),
                    });

                    if (!res.ok) return null;

                    const user = await res.json();
                    if (!user?.password_hash) return null;

                    const valid = await bcrypt.compare(
                        credentials.password as string,
                        user.password_hash
                    );
                    if (!valid) return null;

                    return {
                        id: String(user.id),
                        name: user.name,
                        email: user.email,
                        image: user.image ?? null,
                    };
                } catch {
                    return null;
                }
            },
        }),
    ],

    session: { strategy: "jwt" },

    callbacks: {
        async jwt({ token, user, account }) {
            // On first sign-in, user object is available
            if (user) {
                token.sub = user.id;
            }
            // For Google OAuth, upsert the user record in our backend
            if (account?.provider === "google" && user?.email) {
                try {
                    const res = await fetch(`${API_URL}/api/auth/google-upsert`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: user.email,
                            name: user.name,
                            image: user.image,
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        token.sub = String(data.id);
                    }
                } catch {
                    // non-fatal: token.sub will be Google's sub if backend is down
                }
            }
            return token;
        },

        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            return session;
        },
    },

    pages: {
        signIn: "/",
    },
});
