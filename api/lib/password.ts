import { pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 64;
const PBKDF2_ITERATIONS = 120_000;
const PBKDF2_DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST).toString("hex");
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const parts = storedHash.split(":");
  const scheme = parts[0];

  if (scheme === "pbkdf2") {
    const [, iterationsText, salt, hash] = parts;
    const iterations = Number(iterationsText);
    if (!iterations || !salt || !hash) return false;

    const actual = Buffer.from(
      pbkdf2Sync(password, salt, iterations, KEY_LENGTH, PBKDF2_DIGEST).toString("hex"),
      "hex",
    );
    const expected = Buffer.from(hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  const [, salt, hash] = parts;
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const actual = Buffer.from(scryptSync(password, salt, KEY_LENGTH).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
