import type { Catalog } from "./types.ts";

// All requests are same-origin (dev goes through the Vite proxy), so cookies ride along.
const opts: RequestInit = { credentials: "same-origin" };

export async function getSession(): Promise<boolean> {
  const r = await fetch("/api/session", opts);
  if (!r.ok) return false;
  return (await r.json()).authed === true;
}

export async function login(password: string): Promise<boolean> {
  const r = await fetch("/api/login", {
    ...opts,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return r.ok;
}

export async function logout(): Promise<void> {
  await fetch("/api/logout", { ...opts, method: "POST" });
}

export async function getCatalog(): Promise<Catalog> {
  const r = await fetch("/api/catalog", opts);
  if (!r.ok) throw new Error(`catalog failed: ${r.status}`);
  return r.json();
}

export function videoUrl(file: string): string {
  return `/videos/${encodeURIComponent(file)}`;
}

// Poster frames are generated alongside videos, same base name with a .jpg extension.
export function posterUrl(file: string): string {
  return `/posters/${encodeURIComponent(file.replace(/\.[^.]+$/, ".jpg"))}`;
}
