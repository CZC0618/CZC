<template>
  <div class="login-page">
    <el-card class="login-card" shadow="always">
      <p class="brand-tag">PETRO PORT OPS</p>
      <h1>用户登录</h1>
      <p class="subtitle">石油公司进出港管理系统</p>

      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom: 16px" />

      <el-form :model="form" @submit.prevent="handleSubmit" label-position="top">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" :prefix-icon="Lock" show-password autocomplete="current-password" />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" size="large" style="width:100%">
          {{ loading ? '请稍候…' : '登录' }}
        </el-button>
      </el-form>

      <p class="toggle-text">账户由管理员统一分配，如需开通请联系超级管理员</p>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { User, Lock } from "@element-plus/icons-vue";
import { api } from "../api/http.js";
import { auth } from "../auth.js";

const router = useRouter();
const loading = ref(false);
const errorMsg = ref("");
const form = ref({ username: "", password: "" });

async function handleSubmit() {
  errorMsg.value = "";
  loading.value = true;
  try {
    const res = await api.login({ username: form.value.username, password: form.value.password });
    auth.login(res.token, res.user);
    router.push("/dashboard");
  } catch (e) {
    errorMsg.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0e7490 100%);
}

.login-card {
  width: 420px;
  max-width: calc(100vw - 32px);
  border-radius: 16px;
}

.login-card .brand-tag {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.18em;
  color: #0369a1;
}

.login-card h1 {
  margin: 12px 0 4px;
  font-size: 26px;
  color: #0f172a;
}

.subtitle {
  margin: 0 0 24px;
  color: #62708a;
  font-size: 14px;
}

.toggle-text {
  text-align: center;
  margin: 20px 0 0;
  font-size: 14px;
  color: #62708a;
}
</style>
