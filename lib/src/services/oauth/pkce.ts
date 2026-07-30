import crypto from "crypto";

const base64url = (buffer: Buffer) => buffer.toString("base64url");

/**
 * PKCE (RFC 7636) lets a public client prove that the app redeeming the code is
 * the one that asked for it, without a client secret we'd have to ship.
 */
export function createPKCEPair() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest()
  );
  return { verifier, challenge };
}

export const createState = () => base64url(crypto.randomBytes(16));
