<template>
  <div class="login-page">
    <div class="login-card">
      <p class="brand-tag">PETRO PORT OPS</p>
      <h1>用户登录</h1>
      <p class="subtitle">石油公司进出港管理系统</p>

      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

      <form @submit.prevent="handleSubmit">
        <label>
          用户名
          <input v-model="form.username" required autocomplete="username" />
        </label>
        <label>
          密码
          <input v-model="form.password" required type="password" autocomplete="current-password" />
        </label>
        <button class="primary-button" type="submit" :disabled="loading">
          {{ loading ? '请稍候…' : '登录' }}
        </button>
      </form>

      <p class="toggle-text">账户由管理员统一分配，如需开通请联系超级管理员</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
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
  background: #fff;
  border-radius: 20px;
  padding: 40px 36px;
  width: 400px;
  max-width: calc(100vw - 32px);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.25);
}

@media (max-width: 768px) {
  .login-card {
    padding: 28px 20px;
    width: auto;
  }

  .login-card h1 {
    font-size: 22px;
  }
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

.login-card form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.login-card label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #334155;
  font-size: 14px;
}

.login-card input,
.login-card select {
  height: 44px;
  border: 1px solid #d7dfeb;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 15px;
  background: #fff;
}

.login-card .primary-button {
  margin-top: 8px;
  width: 100%;
}

.login-card .primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.toggle-text {
  text-align: center;
  margin: 20px 0 0;
  font-size: 14px;
  color: #62708a;
}

.toggle-text a {
  color: #0369a1;
  font-weight: 600;
}
</style>
