/**
 * Reads API JSON without surfacing the browser's low-level SyntaxError when a
 * developer accidentally opens the Vite-only sandbox instead of the full app.
 */
export async function parseApiJson<T>(response: Response): Promise<T> {
  const body = await response.text();
  const status = response.status > 0
    ? ` (HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""})`
    : "";

  if (body.trim().length === 0) {
    throw new Error(
      `The API returned an empty response${status}. If you are using the Vite-only sandbox, run pnpm quickstart for the API-backed Workshop.`,
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    const contentType = response.headers.get("content-type");
    const contentHint = contentType ? ` (${contentType})` : "";
    throw new Error(
      `The API returned a response that was not JSON${status}${contentHint}. If you are using the Vite-only sandbox, run pnpm quickstart for the API-backed Workshop.`,
    );
  }
}
