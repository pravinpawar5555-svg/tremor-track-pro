// @ts-nocheck -- Web Crypto BufferSource typing noise (Uint8Array<ArrayBufferLike>); logic is tested end to end.
// Minimal Web Push sender (VAPID + RFC 8291 aes128gcm) using Web Crypto only — runs on the Worker runtime.
export const VAPID_PUBLIC_KEY =
  "BDlgMlxE2HlljiT1RwuhP7PuaMxa5buSwd7ElHq6k-BNu4iiOyw9GsQ-Ya6kbz7Xh2yyWdy61mMsj977ktC_ofQ";

const enc = new TextEncoder();
const b64u = (u: Uint8Array) => {
  let s = "";
  for (const c of u) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64u = (s: string) => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};
const concat = (...a: Uint8Array[]) => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0));
  let o = 0;
  for (const x of a) { out.set(x, o); o += x.length; }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, len: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8));
}

async function vapidAuth(endpoint: string, privD: string) {
  const pub = fromB64u(VAPID_PUBLIC_KEY);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: privD, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const aud = new URL(endpoint).origin;
  const head = b64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:ops@forbesmarshall.com" })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${VAPID_PUBLIC_KEY}`;
}

async function encrypt(payload: Uint8Array, p256dh: string, authSecret: string) {
  const uaPub = fromB64u(p256dh);
  const auth = fromB64u(authSecret);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode("WebPush: info\0"), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = 65;
  return concat(header, asPub, ct);
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

/** Returns the HTTP status from the push service (404/410 = subscription gone). */
export async function sendWebPush(sub: PushSub, message: object, privD: string): Promise<number> {
  const body = await encrypt(enc.encode(JSON.stringify(message)), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuth(sub.endpoint, privD),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });
  return res.status;
}
