const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status}).`);
  }
  return payload;
}

export const api = {
  health: () => request("/health"),
  stats: () => request("/stats"),
  scans: ({ riskLevel, search, limit = 50 } = {}) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (riskLevel) params.set("riskLevel", riskLevel);
    if (search?.trim()) params.set("search", search.trim());
    return request(`/scans?${params}`);
  },
  scan: (id) => request(`/scans/${encodeURIComponent(id)}`),
  analyze: (data) =>
    request("/analyze", { method: "POST", body: JSON.stringify(data) }),
  deleteScan: (id) =>
    request(`/scans/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

export const keys = {
  health: ["health"],
  stats: ["stats"],
  scans: (params = {}) => ["scans", params],
  scan: (id) => ["scan", id],
};

export function explainError(error) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function formatDate(value, includeTime = true) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}
