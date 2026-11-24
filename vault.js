// 加密與本地儲存：PBKDF2-SHA256 → AES-256-GCM，資料只存在 IndexedDB
const DB_NAME = 'pass-memo';
const STORE = 'kv';
export const FORMAT = 'pass-memo';
export const ITERATIONS = 600000;
const MIN_ITER = 100000;
const MAX_ITER = 5000000;

const enc = new TextEncoder();
const dec = new TextDecoder();
const AAD = enc.encode('pass-memo/v1');

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbDelete(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

export function unb64(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function newSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(password, salt, iterations = ITERATIONS) {
  const base = await crypto.subtle.importKey(
    'raw', enc.encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']);
}

// 把資料加密成可存檔／可備份的物件（每次都用新的隨機 IV）
export async function seal(session, data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: AAD },
    session.key,
    enc.encode(JSON.stringify(data)));
  return {
    format: FORMAT,
    v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: session.iterations, salt: b64(session.salt) },
    cipher: 'AES-256-GCM',
    iv: b64(iv),
    ct: b64(new Uint8Array(ct)),
  };
}

export function isValidBlob(blob) {
  return !!blob && typeof blob === 'object' &&
    blob.format === FORMAT && blob.v === 1 &&
    blob.kdf && blob.kdf.name === 'PBKDF2' && blob.kdf.hash === 'SHA-256' &&
    Number.isInteger(blob.kdf.iterations) &&
    blob.kdf.iterations >= MIN_ITER && blob.kdf.iterations <= MAX_ITER &&
    typeof blob.kdf.salt === 'string' && typeof blob.iv === 'string' && typeof blob.ct === 'string';
}

// 用密碼解開加密物件。密碼錯誤或檔案被竄改都會丟出 BAD_PASSWORD
export async function unseal(blob, password) {
  if (!isValidBlob(blob)) throw new Error('BAD_FORMAT');
  let salt, iv, ct;
  try {
    salt = unb64(blob.kdf.salt);
    iv = unb64(blob.iv);
    ct = unb64(blob.ct);
  } catch {
    throw new Error('BAD_FORMAT');
  }
  const iterations = blob.kdf.iterations;
  const key = await deriveKey(password, salt, iterations);
  let plain;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: AAD }, key, ct);
  } catch {
    throw new Error('BAD_PASSWORD');
  }
  let data;
  try {
    data = JSON.parse(dec.decode(plain));
  } catch {
    throw new Error('BAD_FORMAT');
  }
  return { session: { key, salt, iterations }, data };
}
