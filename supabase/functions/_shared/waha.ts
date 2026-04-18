const WAHA_API_URL = () => Deno.env.get("WAHA_API_URL")!;
const WAHA_API_KEY = () => Deno.env.get("WAHA_API_KEY")!;

export async function wahaFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${WAHA_API_URL()}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Api-Key": WAHA_API_KEY(),
      ...options.headers,
    },
  });
  return res;
}

export async function wahaJson<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await wahaFetch(path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WAHA ${res.status}: ${text}`);
  }
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}
