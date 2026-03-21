<template>
  <div class="layout">
    <aside class="sidebar">
      <div>
        <p class="brand-tag">PETRO PORT OPS</p>
        <h1 class="brand-title">进出港管理系统</h1>
        <p class="brand-desc">管理货轮、货物与进出港作业</p>
      </div>

      <nav class="nav-list">
        <RouterLink
          v-for="item in visibleMenu"
          :key="item.to"
          class="nav-item"
          :to="item.to"
        >
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <span class="user-name">{{ auth.user?.username }}</span>
          <span class="user-role">{{ roleLabel }}</span>
        </div>
        <button class="logout-btn" @click="handleLogout">退出登录</button>
      </div>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { auth } from "../auth.js";

const router = useRouter();

const allMenuItems = [
  { label: "概览看板", to: "/dashboard", roles: null },
  { label: "船舶管理", to: "/vessels", roles: null },
  { label: "货物管理", to: "/cargoes", roles: null },
  { label: "进出港作业", to: "/port-calls", roles: null },
  { label: "回执管理", to: "/receipts", roles: null },
  { label: "用户管理", to: "/users", roles: ["super_admin"] }
];

const visibleMenu = computed(() =>
  allMenuItems.filter(i => !i.roles || i.roles.includes(auth.role))
);

const roleLabel = computed(() => {
  const map = { super_admin: "超级管理员", port_admin: "进出港管理员", finance_admin: "财务管理员" };
  return map[auth.role] || auth.role;
});

function handleLogout() {
  auth.logout();
  router.push("/login");
}
</script>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.sidebar {
  padding: 28px 22px;
  background: linear-gradient(180deg, #0f172a, #132b4b);
  color: #ffffff;
  display: flex;
  flex-direction: column;
}

.brand-tag {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: #7dd3fc;
}

.brand-title {
  margin: 12px 0 8px;
  font-size: 30px;
}

.brand-desc {
  margin: 0;
  color: #c7d2fe;
  font-size: 14px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 36px;
  flex: 1;
}

.nav-item {
  padding: 14px 16px;
  border-radius: 12px;
  color: #dbeafe;
  background: rgba(255, 255, 255, 0.04);
}

.nav-item.router-link-active {
  background: linear-gradient(135deg, #1d4ed8, #0284c7);
  color: #ffffff;
}

.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 16px;
  margin-top: 16px;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.user-name {
  font-weight: 600;
  font-size: 15px;
  color: #e0f2fe;
}

.user-role {
  font-size: 12px;
  color: #7dd3fc;
  background: rgba(125,211,252,0.12);
  padding: 3px 10px;
  border-radius: 20px;
}

.logout-btn {
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
}

.logout-btn:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.content {
  padding: 28px;
}
</style>
