<template>
  <section>
    <h2 class="page-title">用户管理</h2>
    <p class="page-subtitle">管理系统用户账户及角色权限分配。</p>

    <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin:16px 0" />
    <el-alert v-if="successMsg" :title="successMsg" type="success" show-icon :closable="false" style="margin:16px 0" />

    <el-card shadow="hover" style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">用户列表</span>
          <el-button type="primary" @click="openCreate">添加用户</el-button>
        </div>
      </template>
      <el-table :data="users" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <el-tag :type="roleTagType(row.role)" size="small">{{ roleLabel(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" link @click="startEdit(row)">编辑</el-button>
            <el-button v-if="row.id !== currentUserId" size="small" type="danger" link @click="confirmDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加用户弹窗 -->
    <el-dialog v-model="createVisible" title="添加用户" width="480" align-center>
      <el-form :model="createForm" label-position="top" @submit.prevent="doCreate">
        <el-form-item label="用户名"><el-input v-model="createForm.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="createForm.password" type="password" show-password placeholder="至少 6 位" /></el-form-item>
        <el-form-item label="角色">
          <el-select v-model="createForm.role" style="width:100%">
            <el-option v-for="r in roles" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="doCreate">添加用户</el-button>
      </template>
    </el-dialog>

    <!-- 编辑弹框 -->
    <el-dialog v-model="editVisible" :title="'编辑用户：' + (editing?.username || '')" width="460" align-center>
      <el-form :model="editForm" label-position="top" @submit.prevent="doUpdate">
        <el-form-item label="角色">
          <el-select v-model="editForm.role" style="width:100%">
            <el-option v-for="r in roles" :key="r.value" :label="r.label" :value="r.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="新密码（留空则不修改）">
          <el-input v-model="editForm.password" type="password" show-password placeholder="至少 6 位" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="doUpdate">保存</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认 -->
    <el-dialog v-model="deleteVisible" title="确认删除" width="420" align-center>
      <p>确定要删除用户「{{ deleting?.username }}」吗？此操作不可撤销。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { api } from "../api/http.js";
import { auth } from "../auth.js";

const roles = [
  { value: "super_admin", label: "超级管理员" },
  { value: "port_admin", label: "进出港管理员" },
  { value: "finance_admin", label: "财务管理员" }
];

const users = ref([]);
const errorMsg = ref("");
const successMsg = ref("");
const editing = ref(null);
const editVisible = ref(false);
const editForm = ref({ role: "", password: "" });
const deleting = ref(null);
const deleteVisible = ref(false);
const createVisible = ref(false);
const currentUserId = auth.user?.id;
const createForm = ref({ username: "", password: "", role: "port_admin" });

function roleLabel(role) {
  const map = { super_admin: "超级管理员", port_admin: "进出港管理员", finance_admin: "财务管理员" };
  return map[role] || role;
}

function roleTagType(role) {
  if (role === "super_admin") return "danger";
  if (role === "port_admin") return "warning";
  if (role === "finance_admin") return "success";
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

function openCreate() {
  clearMessages();
  createForm.value = { username: "", password: "", role: "port_admin" };
  createVisible.value = true;
}

async function doCreate() {
  clearMessages();
  try {
    await api.createUser(createForm.value);
    successMsg.value = "用户添加成功";
    createVisible.value = false;
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
  editVisible.value = true;
}

async function doUpdate() {
  clearMessages();
  try {
    const payload = { role: editForm.value.role };
    if (editForm.value.password) payload.password = editForm.value.password;
    await api.updateUser(editing.value.id, payload);
    editVisible.value = false;
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
  deleteVisible.value = true;
}

async function doDelete() {
  try {
    await api.deleteUser(deleting.value.id);
    deleteVisible.value = false;
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadUsers();
  } catch (e) {
    deleteVisible.value = false;
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(loadUsers);
</script>
