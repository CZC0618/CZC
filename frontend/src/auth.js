import { reactive } from "vue";

const stored = localStorage.getItem("user");
const state = reactive({
  token: localStorage.getItem("token") || "",
  user: stored ? JSON.parse(stored) : null
});

export const auth = {
  get isLoggedIn() {
    return !!state.token;
  },
  get user() {
    return state.user;
  },
  get role() {
    return state.user?.role || "";
  },
  login(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },
  logout() {
    state.token = "";
    state.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  /** 检查当前用户是否可以对指定模块执行写操作 */
  canEdit(module) {
    const r = state.user?.role;
    if (r === "super_admin") return true;
    if (r === "port_admin" && ["vessels", "cargoes", "port-calls"].includes(module)) return true;
    if (r === "finance_admin" && module === "receipts") return true;
    return false;
  }
};
