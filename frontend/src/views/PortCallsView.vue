<template>
  <section>
    <h2 class="page-title">进出港作业</h2>
    <p class="page-subtitle">安排船舶进港、出港、泊位和货物作业计划。</p>

    <div v-if="canEdit" class="panel">
      <h3 style="margin-top: 0">{{ editingId ? '编辑作业单' : '新增作业单' }}</h3>
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <form class="form-grid" @submit.prevent="submitPortCall">
        <label>
          船舶名称
          <select v-model="form.vesselName" required>
            <option value="" disabled>请选择船舶</option>
            <option v-for="v in vesselNames" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label>
          作业方向
          <select v-model="form.direction">
            <option>进港</option>
            <option>出港</option>
          </select>
        </label>
        <label>
          泊位
          <input v-model="form.berth" required placeholder="如 A-01、B-02" />
        </label>
        <label>
          关联货物
          <input v-model="form.cargoName" required />
        </label>
        <label>
          计划时间
          <input v-model="form.scheduledAt" required type="datetime-local" />
        </label>
        <label>
          状态
          <select v-model="form.status">
            <option>已排期</option>
            <option>作业中</option>
            <option>待放行</option>
            <option>已完成</option>
            <option>已取消</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">{{ editingId ? '更新' : '保存作业单' }}</button>
          <button v-if="editingId" class="secondary-button" type="button" @click="cancelEdit">取消</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">作业单列表</h3>
      <div class="search-bar">
        <input v-model="search" placeholder="搜索船舶、方向、泊位、货物、状态…" @input="onSearch" />
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>船舶</th>
            <th>方向</th>
            <th>泊位</th>
            <th>货物</th>
            <th>计划时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="portCalls.length === 0">
            <td colspan="7" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="item in portCalls" :key="item.id">
            <td>{{ item.vesselName }}</td>
            <td>{{ item.direction }}</td>
            <td>{{ item.berth }}</td>
            <td>{{ item.cargoName }}</td>
            <td>{{ item.scheduledAt }}</td>
            <td><span class="status-tag" :class="portCallTagClass(item.status)">{{ item.status }}</span></td>
            <td>
              <div v-if="canEdit" class="action-cell">
                <button class="btn-edit" @click="startEdit(item)">编辑</button>
                <button class="btn-delete" @click="confirmDelete(item)">删除</button>
              </div>
              <span v-else style="color:#94a3b8;font-size:13px">只读</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </div>
    </div>

    <div v-if="deleting" class="confirm-overlay" @click.self="deleting = null">
      <div class="confirm-box">
        <h3>确认删除</h3>
        <p>确定要删除该作业单（{{ deleting.vesselName }} - {{ deleting.direction }}）吗？此操作不可撤销。</p>
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

const canEdit = auth.canEdit("port-calls");

const portCalls = ref([]);
const vesselNames = ref([]);
const total = ref(0);
const page = ref(1);
const totalPages = ref(1);
const pageSize = 10;
const search = ref("");
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref(null);
const deleting = ref(null);

const form = ref(defaultForm());

function defaultForm() {
  return { vesselName: "", direction: "进港", berth: "", cargoName: "", scheduledAt: "", status: "已排期" };
}

function portCallTagClass(status) {
  if (status === "作业中") return "tag-orange";
  if (status === "已完成") return "tag-green";
  if (status === "已取消") return "tag-gray";
  if (status === "待放行") return "tag-red";
  return "";
}

let searchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadPortCalls(); }, 300);
}

async function loadVesselNames() {
  try { vesselNames.value = await api.getAllVesselNames(); } catch { /* ignore */ }
}

async function loadPortCalls() {
  try {
    const res = await api.getPortCalls({ search: search.value, page: page.value, pageSize });
    portCalls.value = res.data;
    total.value = res.total;
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize));
  } catch { /* ignore */ }
}

function goPage(p) {
  page.value = p;
  loadPortCalls();
}

function clearMessages() { errorMsg.value = ""; successMsg.value = ""; }

async function submitPortCall() {
  clearMessages();
  try {
    if (editingId.value) {
      await api.updatePortCall(editingId.value, { ...form.value });
      successMsg.value = "更新成功";
    } else {
      await api.createPortCall({ ...form.value });
      successMsg.value = "创建成功";
    }
    cancelEdit();
    await loadPortCalls();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function startEdit(item) {
  clearMessages();
  editingId.value = item.id;
  form.value = { vesselName: item.vesselName, direction: item.direction, berth: item.berth, cargoName: item.cargoName, scheduledAt: item.scheduledAt, status: item.status };
}

function cancelEdit() {
  editingId.value = null;
  form.value = defaultForm();
}

function confirmDelete(item) {
  clearMessages();
  deleting.value = item;
}

async function doDelete() {
  try {
    await api.deletePortCall(deleting.value.id);
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadPortCalls();
  } catch (e) {
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadPortCalls(); loadVesselNames(); });
</script>
