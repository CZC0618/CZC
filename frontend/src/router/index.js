import { createRouter, createWebHistory } from "vue-router";
import { auth } from "../auth.js";
import CargoesView from "../views/CargoesView.vue";
import DashboardView from "../views/DashboardView.vue";
import LoginView from "../views/LoginView.vue";
import PortCallsView from "../views/PortCallsView.vue";
import ReceiptsView from "../views/ReceiptsView.vue";
import UsersView from "../views/UsersView.vue";
import VesselsView from "../views/VesselsView.vue";

const routes = [
  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: { guest: true }
  },
  {
    path: "/",
    redirect: "/dashboard"
  },
  {
    path: "/dashboard",
    name: "dashboard",
    component: DashboardView
  },
  {
    path: "/vessels",
    name: "vessels",
    component: VesselsView
  },
  {
    path: "/cargoes",
    name: "cargoes",
    component: CargoesView
  },
  {
    path: "/port-calls",
    name: "port-calls",
    component: PortCallsView
  },
  {
    path: "/receipts",
    name: "receipts",
    component: ReceiptsView
  },
  {
    path: "/users",
    name: "users",
    component: UsersView,
    meta: { role: "super_admin" }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to) => {
  if (to.meta.guest) return true;
  if (!auth.isLoggedIn) return { name: "login" };
  if (to.meta.role && auth.role !== to.meta.role) return { name: "dashboard" };
  return true;
});

export default router;
