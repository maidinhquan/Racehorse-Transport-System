export interface RegistrationSession {
  email: string;
  registrationToken: string;
  otpExpiresAt: number;
  resendAvailableAt: number;
}

const storageKey = "racehorse.pendingRegistration";

// Keep only token/email/deadlines in this tab. Never persist passwords or OTPs.
export function saveRegistrationSession(session: RegistrationSession): void {
  sessionStorage.setItem(storageKey, JSON.stringify(session));
}

export function loadRegistrationSession(): RegistrationSession | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (!value || typeof value !== "object") return null;
    const session = value as Partial<RegistrationSession>;
    if (typeof session.email !== "string" || typeof session.registrationToken !== "string" ||
      !/^[a-f0-9]{32}$/i.test(session.registrationToken) ||
      typeof session.otpExpiresAt !== "number" || !Number.isFinite(session.otpExpiresAt) ||
      typeof session.resendAvailableAt !== "number" || !Number.isFinite(session.resendAvailableAt)) return null;
    return session as RegistrationSession;
  } catch { return null; }
}

export function clearRegistrationSession(): void {
  sessionStorage.removeItem(storageKey);
}
