// src/utils/api.ts
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

export async function getJson<T>(path: string) {
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "X-User": "1", // 简化：先固定成 1（guest）。接入登录后改为当前用户 ID。
    },
  }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function postJson<T>(path: string, body: any) {
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User": "1",
    },
    body: JSON.stringify(body),
  }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function del(path: string) {
  const res = await withTimeout(fetch(`${BASE_URL}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "X-User": "1",
    },
  }));
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return true;
}
