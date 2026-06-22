// Client-side draft cart for multi-entry purchases.
// Stored in sessionStorage so it survives back/forward and pick-add loops
// but doesn't bleed across browser sessions.

export type CartEntry = {
  fullName: string;
  team: string;
  // Optional per-entry contact. When `selfManaged` is true the entrant will
  // receive their own notifications at this email/phone going forward.
  // Otherwise email/phone are ignored and the owner's contact is used.
  email?: string | null;
  phone?: string | null;
  selfManaged?: boolean;
};

const KEY = (competitionId: string) => `losc:cart:${competitionId}`;

function safe(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCart(competitionId: string): CartEntry[] {
  const s = safe();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY(competitionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e: unknown): e is CartEntry =>
        !!e &&
        typeof e === "object" &&
        typeof (e as CartEntry).fullName === "string" &&
        typeof (e as CartEntry).team === "string",
    );
  } catch {
    return [];
  }
}

export function addToCart(competitionId: string, entry: CartEntry) {
  const s = safe();
  if (!s) return;
  const existing = readCart(competitionId);
  existing.push(entry);
  s.setItem(KEY(competitionId), JSON.stringify(existing));
}

export function clearCart(competitionId: string) {
  const s = safe();
  if (!s) return;
  s.removeItem(KEY(competitionId));
}

export function removeFromCart(competitionId: string, index: number) {
  const s = safe();
  if (!s) return;
  const existing = readCart(competitionId);
  existing.splice(index, 1);
  s.setItem(KEY(competitionId), JSON.stringify(existing));
}
