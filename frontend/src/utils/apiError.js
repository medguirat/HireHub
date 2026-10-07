// Every error from the backend and the ai-service has the same body:
//   { code, message, correlationId, fieldErrors? }
// `message` is a sentence to show as is; `fieldErrors` (field -> message) comes with
// validation errors only. These helpers are the only place that reads that body.

export const NETWORK_ERROR = "Can't reach the server. Check your connection and try again.";

/** The error body, or null when there is none (no answer at all, or not one of our errors). */
export function apiError(err) {
  const data = err?.response?.data;
  return data && typeof data === "object" && typeof data.message === "string" ? data : null;
}

/**
 * A sentence for the user: the server's message; a connection message when the server never
 * answered; otherwise the fallback. Unexpected server errors get a short reference that
 * matches the server log (the start of the correlation id).
 */
export function errorMessage(err, fallback) {
  if (err?.request && !err.response) return NETWORK_ERROR;
  const body = apiError(err);
  if (!body) return fallback;
  if (err.response.status === 500 && body.correlationId) {
    return `${body.message} (Reference: ${body.correlationId.slice(0, 8)})`;
  }
  return body.message;
}

export const errorCode = (err) => apiError(err)?.code ?? null;

export const fieldErrors = (err) => apiError(err)?.fieldErrors ?? {};
