export const ALLOWED_USERS = [
  "ammu32811@gmail.com",
  "spaadi1601@gmail.com",
];

const PIN_SESSION_KEY = "khushi-pin-user";

export function isAllowedEmail(email: string | null | undefined) {
  return !!email && ALLOWED_USERS.includes(email.toLowerCase());
}

export function setPinUnlocked(uid: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PIN_SESSION_KEY, uid);
}

export function isPinUnlocked(uid: string) {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(PIN_SESSION_KEY) === uid;
}

export function clearPinUnlocked() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PIN_SESSION_KEY);
}
