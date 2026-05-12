import { createHmac, pbkdf2Sync, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { env } from "./env";

const KEY_LENGTH = 64;
const PBKDF2_DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const parts = storedHash.split(":");
  const scheme = parts[0];

  if (scheme === "hmac-sha256") {
    const [, salt, hash] = parts;
    if (!salt || !hash) return false;

    const actual = Buffer.from(createPasswordHmac(password, salt), "hex");
    const expected = Buffer.from(hash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

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

function createPasswordHmac(password: string, salt: string) {
  return createHmac("sha256", `${env.appSecret}:${salt}`)
    .update(password)
    .digest("hex");
}
