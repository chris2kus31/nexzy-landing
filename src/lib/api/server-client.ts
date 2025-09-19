import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || "https://api.nexzy.app";
const API_SECRET_KEY = process.env.API_SECRET_KEY;

export async function serverFetch(endpoint: string, options: RequestInit = {}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("nexzy-session");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_SECRET_KEY!,
      ...(sessionToken && { Authorization: `Bearer ${sessionToken.value}` }),
      ...options.headers,
    },
    cache: options.cache || "no-store", // Important for dynamic data
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  return response.json();
}
