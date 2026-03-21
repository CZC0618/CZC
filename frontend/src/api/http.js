const API_BASE_URL = "http://localhost:3000/api";

function getToken() {
  return localStorage.getItem("token") || "";
}

async function request(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("登录已过期");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "请求失败" }));
    throw new Error(error.message || "请求失败");
  }

  return response.json();
}

function qs(params) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const api = {
  getDashboard() {
    return request("/dashboard");
  },

  /* Vessels */
  getVessels(params) {
    return request(`/vessels${qs(params)}`);
  },
  getAllVesselNames() {
    return request("/vessels?pageSize=1000").then(r => r.data.map(v => v.name));
  },
  createVessel(payload) {
    return request("/vessels", { method: "POST", body: JSON.stringify(payload) });
  },
  updateVessel(id, payload) {
    return request(`/vessels/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteVessel(id) {
    return request(`/vessels/${id}`, { method: "DELETE" });
  },

  /* Cargoes */
  getCargoes(params) {
    return request(`/cargoes${qs(params)}`);
  },
  createCargo(payload) {
    return request("/cargoes", { method: "POST", body: JSON.stringify(payload) });
  },
  updateCargo(id, payload) {
    return request(`/cargoes/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteCargo(id) {
    return request(`/cargoes/${id}`, { method: "DELETE" });
  },

  /* Port Calls */
  getPortCalls(params) {
    return request(`/port-calls${qs(params)}`);
  },
  createPortCall(payload) {
    return request("/port-calls", { method: "POST", body: JSON.stringify(payload) });
  },
  updatePortCall(id, payload) {
    return request(`/port-calls/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deletePortCall(id) {
    return request(`/port-calls/${id}`, { method: "DELETE" });
  },

  /* Receipts */
  getReceipts(params) {
    return request(`/receipts${qs(params)}`);
  },
  createReceipt(payload) {
    return request("/receipts", { method: "POST", body: JSON.stringify(payload) });
  },
  updateReceipt(id, payload) {
    return request(`/receipts/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteReceipt(id) {
    return request(`/receipts/${id}`, { method: "DELETE" });
  },
  /* Raw receipt request (returns full response for 422 handling) */
  async submitReceiptRaw(method, url, payload) {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    const data = await response.json().catch(() => ({ message: "请求失败" }));
    return { ok: response.ok, status: response.status, data };
  },

  /* Auth */
  login(payload) {
    return request("/auth/login", { method: "POST", body: JSON.stringify(payload) });
  },
  getMe() {
    return request("/auth/me");
  },

  /* User management (super admin) */
  getUsers() {
    return request("/auth/users");
  },
  createUser(payload) {
    return request("/auth/users", { method: "POST", body: JSON.stringify(payload) });
  },
  updateUser(id, payload) {
    return request(`/auth/users/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteUser(id) {
    return request(`/auth/users/${id}`, { method: "DELETE" });
  }
};
