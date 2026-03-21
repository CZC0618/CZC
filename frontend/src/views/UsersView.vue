<template>
  <section>
    <h2 class="page-title">用户管理</h2>
    <p class="page-subtitle">管理系统用户账户及角色权限分配。</p>

    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
    <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>

    <div class="panel">
      <h3 style="margin-top: 0">添加用户</h3>
      <form class="form-grid" @submit.prevent="doCreate">
        <label>
          用户名
          <input v-model="createForm.username" required />
        </label>
        <label>
          密码
          <input v-model="createForm.password" required type="password" placeholder="至少 6 位" />
        </label>
        <label>
          角色
          <select v-model="createForm.role">
            <option value="super_admin">超级管理员</option>
            <option value="port_admin">进出港管理员</option>
            <option value="finance_admin">财务管理员</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">添加用户</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">用户列表</h3>
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>角色</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="users.length === 0">
            <td colspan="5" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="u in users" :key="u.id">
            <td>{{ u.id }}</td>
            <td>{{ u.username }}</td>
            <td>
              <span class="status-tag" :class="roleTagClass(u.role)">{{ roleLabel(u.role) }}</span>
            </td>
            <td>{{ u.createdAt }}</td>
            <td>
              <div class="action-cell">
                <button class="btn-edit" @click="startEdit(u)">编辑</button>
                <button v-if="u.id !== currentUserId" class="btn-delete" @click="confirmDelete(u)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 编辑弹框 -->
    <div v-if="editing" class="confirm-overlay" @click.self="editing = null">
      <div class="confirm-box">
        <h3>编辑用户：{{ editing.username }}</h3>
        <form @submit.prevent="doUpdate" style="display:flex;flex-direction:column;gap:14px">
          <label style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:#334155">
            角色
            <select v-model="editForm.role" style="height:40px;border:1px solid #d7dfeb;border-radius:8px;padding:0 10px;font-size:14px">
              <option value="super_admin">超级管理员</option>
              <option value="port_admin">进出港管理员</option>
              <option value="finance_admin">财务管理员</option>
            </select>
          </label>
          <label style="display:flex;flex-direction:column;gap:6px;font-size:14px;color:#334155">
            新密码（留空则不修改）
            <input v-model="editForm.password" type="password" placeholder="至少 6 位" style="height:40px;border:1px solid #d7dfeb;border-radius:8px;padding:0 10px;font-size:14px" />
          </label>
          <div class="confirm-actions">
            <button class="secondary-button" type="button" @click="editing = null">取消</button>
            <button class="primary-button" type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="deleting" class="confirm-overlay" @click.self="deleting = null">
      <div class="confirm-box">
        <h3>确认删除</h3>
        <p>确定要删除用户「{{ deleting.username }}」吗？此操作不可撤销。</p>
        <div class="confirm-actions">
          <button class="secondary-button" @click="deleting = null">取消</button>
          <button class="danger-button" @click="doDelete">删除</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { api } from "../api/http.js";
import { auth } from "../auth.js";

const users = ref([]);
const errorMsg = ref("");
const successMsg = ref("");
const editing = ref(null);
const editForm = ref({ role: "", password: "" });
const deleting = ref(null);
const currentUserId = auth.user?.id;
const createForm = ref({ username: "", password: "", role: "port_admin" });

function roleLabel(role) {
  const map = { super_admin: "超级管理员", port_admin: "进出港管理员", finance_admin: "财务管理员" };
  return map[role] || role;
}

function roleTagClass(role) {
  if (role === "super_admin") return "tag-red";
  if (role === "port_admin") return "tag-orange";
  if (role === "finance_admin") return "tag-green";
  return "";
}

async function loadUsers() {
  try {
    users.value = await api.getUsers();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function clearMessages() { errorMsg.value = ""; successMsg.value = ""; }

async function doCreate() {
  clearMessages();
  try {
    await api.createUser(createForm.value);
    successMsg.value = "用户添加成功";
    createForm.value = { username: "", password: "", role: "port_admin" };
    await loadUsers();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function startEdit(u) {
  clearMessages();
  editing.value = u;
  editForm.value = { role: u.role, password: "" };
}

async function doUpdate() {
  clearMessages();
  try {
    const payload = { role: editForm.value.role };
    if (editForm.value.password) payload.password = editForm.value.password;
    await api.updateUser(editing.value.id, payload);
    editing.value = null;
    successMsg.value = "更新成功";
    await loadUsers();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function confirmDelete(u) {
  clearMessages();
  deleting.value = u;
}

async function doDelete() {
  try {
    await api.deleteUser(deleting.value.id);
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadUsers();
  } catch (e) {
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(loadUsers);
</script>
