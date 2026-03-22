<template>
  <el-container class="app-shell">
    <el-aside width="240px" class="app-aside">
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
import { computed } from "vue";
import { useRouter } from "vue-router";
import { auth } from "../auth.js";

const router = useRouter();

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

.app-aside {
  background: linear-gradient(180deg, #0f172a, #132b4b);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
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
</style>
