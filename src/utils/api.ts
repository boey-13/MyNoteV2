// src/utils/api.ts
import { getCurrentUserId } from '../utils/session';

const BASE_URL =
  __DEV__
    ? "http://10.0.2.2:5000/api" // Android 模拟器
    : "http://10.0.2.2:5000/api"; // 按需改：iOS 模拟器可用 http://localhost:5000/api

const DEFAULT_TIMEOUT = 10000;

function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT) {
  return new Promise<T>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(to); resolve(v); }).catch(e => { clearTimeout(to); reject(e); });
  });
}

async function authHeaders() {
  const uid = (await getCurrentUserId()) ?? 1; // 兜底 1
  return {
    'Content-Type': 'application/json',
    'X-User': String(uid),
  };
}

export async function getJson<T>(path: string) {
  const headers = await authHeaders();
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, { headers }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: any) {
  const headers = await authHeaders();
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function del(path: string) {
  const headers = await authHeaders();
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return true;
}

// 不需要认证的POST请求（用于注册等）
export async function postJsonNoAuth<T>(path: string, body: any) {
  const headers = {
    'Content-Type': 'application/json',
  };
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, {
    method: 'POST', headers, body: JSON.stringify(body),
  }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}