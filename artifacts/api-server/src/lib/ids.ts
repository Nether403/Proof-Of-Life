import { randomBytes } from "node:crypto";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function makeSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
  const suffix = Array.from(randomBytes(4))
    .map((b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length])
    .join("");
  return base ? `${base}-${suffix}` : suffix;
}

export function makeEditToken(): string {
  return randomBytes(24).toString("base64url");
}
