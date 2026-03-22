<template>
  <el-container class="app-shell">
    <!-- Mobile top bar -->
    <div class="mobile-header">
      <el-button :icon="Expand" text @click="drawerOpen = true" class="hamburger-btn" />
      <span class="mobile-brand">进出港管理系统</span>
    </div>

    <!-- Sidebar: drawer on mobile, fixed aside on desktop -->
    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      :size="240"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="sidebar-inner">
        <div class="brand-area">
          <p class="brand-tag">PETRO PORT OPS</p>
          <h1 class="brand-title">进出港管理系统</h1>
          <p class="brand-desc">管理货轮、货物与进出港作业</p>
        </div>
        <el-menu
          :default-active="$route.path"
          router
          background-color="#0f172a"
          text-color="#dbeafe"
          active-text-color="#ffffff"
          class="sidebar-menu"
          @select="drawerOpen = false"
        >
          <el-menu-item v-for="item in visibleMenu" :key="item.to" :index="item.to">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
        <div class="sidebar-footer">
          <div class="user-info">
            <el-icon :size="16"><User /></el-icon>
            <span class="user-name">{{ auth.user?.username }}</span>
            <el-tag size="small" type="info" effect="dark" round>{{ roleLabel }}</el-tag>
          </div>
          <el-button type="info" plain @click="handleLogout" class="logout-btn">退出登录</el-button>
        </div>
      </div>
    </el-drawer>

    <!-- Desktop sidebar -->
    <el-aside width="240px" class="app-aside desktop-aside">
      <div class="brand-area">
        <p class="brand-tag">PETRO PORT OPS</p>
        <h1 class="brand-title">进出港管理系统</h1>
        <p class="brand-desc">管理货轮、货物与进出港作业</p>
      </div>

      <el-menu
        :default-active="$route.path"
        router
        background-color="#0f172a"
        text-color="#dbeafe"
        active-text-color="#ffffff"
        class="sidebar-menu"
      >
        <el-menu-item v-for="item in visibleMenu" :key="item.to" :index="item.to">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="sidebar-footer">
        <div class="user-info">
          <el-icon :size="16"><User /></el-icon>
          <span class="user-name">{{ auth.user?.username }}</span>
          <el-tag size="small" type="info" effect="dark" round>{{ roleLabel }}</el-tag>
        </div>
        <el-button type="info" plain @click="handleLogout" class="logout-btn">退出登录</el-button>
      </div>
    </el-aside>

    <el-main class="app-main">
      <RouterView />
    </el-main>
  </el-container>
</template>

<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Expand } from "@element-plus/icons-vue";
import { auth } from "../auth.js";

const router = useRouter();
const drawerOpen = ref(false);

const allMenuItems = [
  { label: "概览看板", to: "/dashboard", icon: "DataBoard", roles: null },
  { label: "船舶管理", to: "/vessels", icon: "Ship", roles: null },
  { label: "货物管理", to: "/cargoes", icon: "Box", roles: null },
  { label: "进出港作业", to: "/port-calls", icon: "SetUp", roles: null },
  { label: "回执管理", to: "/receipts", icon: "Document", roles: null },
  { label: "用户管理", to: "/users", icon: "UserFilled", roles: ["super_admin"] }
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
.app-shell {
  min-height: 100vh;
}

/* --- Mobile top bar --- */
.mobile-header {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 999;
  height: 50px;
  background: linear-gradient(135deg, #0f172a, #132b4b);
  align-items: center;
  padding: 0 12px;
  gap: 10px;
}

.hamburger-btn {
  color: #fff !important;
  font-size: 22px;
}

.mobile-brand {
  color: #fff;
  font-weight: 700;
  font-size: 16px;
}

/* --- Desktop sidebar --- */
.desktop-aside {
  background: linear-gradient(180deg, #0f172a, #132b4b);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* --- Shared sidebar inner styles --- */
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #0f172a, #132b4b);
}

.brand-area {
  padding: 28px 20px 16px;
}

.brand-tag {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: #7dd3fc;
}

.brand-title {
  margin: 12px 0 8px;
  font-size: 24px;
  color: #fff;
}

.brand-desc {
  margin: 0;
  color: #c7d2fe;
  font-size: 13px;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
}

.sidebar-menu .el-menu-item {
  border-radius: 8px;
  margin: 4px 10px;
  height: 44px;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(135deg, #1d4ed8, #0284c7) !important;
}

.sidebar-footer {
  border-top: 1px solid rgba(255,255,255,0.1);
  padding: 16px 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #e0f2fe;
}

.user-name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.logout-btn {
  width: 100%;
}

.app-main {
  background: #f3f6fb;
  padding: 28px;
}

/* --- Mobile responsive --- */
@media (max-width: 768px) {
  .mobile-header {
    display: flex;
  }

  .desktop-aside {
    display: none !important;
  }

  .app-main {
    padding: 62px 14px 14px;
  }
}
</style>

<style>
/* Global: mobile drawer background fix */
.mobile-drawer .el-drawer__body {
  padding: 0;
  background: #0f172a;
}
</style>
