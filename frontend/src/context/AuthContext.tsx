import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { login as loginApi } from "../lib/api";
import { clearStoredSession, getStoredSession, setStoredSession, type SessionState, type UserRole } from "../lib/auth";

const FALLBACK_USER_ID_BY_EMAIL: Record<string, string> = {
  "admin@reparando.app": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "worker@reparando.app": "11111111-1111-1111-1111-111111111111",
  "worker2@reparando.app": "44444444-4444-4444-4444-444444444444",
  "client@reparando.app": "33333333-3333-3333-3333-333333333333"
};

type LoginInput = {
  email: string;
  password: string;
};

type AuthContextValue = {
  session: SessionState | null;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SessionState | null>(() => getStoredSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: !!session,
      login: async ({ email, password }) => {
        const result = await loginApi(email, password);
        const role = result.role as UserRole;
        const userId = result.userId ?? FALLBACK_USER_ID_BY_EMAIL[email] ?? "00000000-0000-0000-0000-000000000000";
        const nextSession: SessionState = {
          accessToken: result.accessToken,
          user: {
            email,
            role,
            userId
          }
        };
        setSession(nextSession);
        setStoredSession(nextSession);
      },
      logout: () => {
        setSession(null);
        clearStoredSession();
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
