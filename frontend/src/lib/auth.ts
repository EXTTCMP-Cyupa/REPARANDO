export type UserRole = "ADMIN" | "WORKER" | "CLIENT";

export type SessionUser = {
  email: string;
  role: UserRole;
  userId: string;
};

export type SessionState = {
  accessToken: string;
  user: SessionUser;
};

const STORAGE_KEY = "reparando.session";

export function getStoredSession(): SessionState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionState;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: SessionState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}
