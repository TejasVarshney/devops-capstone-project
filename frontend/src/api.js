// All requests use relative URLs. The browser never needs to know the backend hostname:
// Vite (dev), Nginx (Docker) and the Kubernetes Ingress route /api to FastAPI.
const BASE_URL = "/api";

async function request(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Network error: the API did not respond.");
  }

  if (!response.ok) {
    throw new Error(await describeError(response));
  }
  return response.status === 204 ? null : response.json();
}

async function describeError(response) {
  const fallback = `${response.status} ${response.statusText || "Request failed"}`;
  try {
    const data = await response.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => `${item.loc?.at(-1) ?? "field"}: ${item.msg}`).join("; ");
    }
  } catch {
    // Not JSON (for example an Nginx 502 page).
  }
  return fallback;
}

export const api = {
  listTasks: () => request("/tasks?limit=500"),
  getStats: () => request("/tasks/stats"),
  createTask: (task) => request("/tasks", { method: "POST", body: task }),
  updateTask: (id, changes) => request(`/tasks/${id}`, { method: "PUT", body: changes }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};
