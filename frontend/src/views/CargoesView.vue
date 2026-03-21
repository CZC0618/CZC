<template>
  <section>
    <h2 class="page-title">货物管理</h2>
    <p class="page-subtitle">管理油品与相关货物批次，跟踪当前装卸状态。</p>

    <div v-if="canEdit" class="panel">
      <h3 style="margin-top: 0">{{ editingId ? '编辑货物' : '新增货物' }}</h3>
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <form class="form-grid" @submit.prevent="submitCargo">
        <label>
          货物名称
          <input v-model="form.name" required />
        </label>
        <label>
          货物类别
          <select v-model="form.category">
            <option>原油</option>
            <option>成品油</option>
            <option>化工品</option>
          </select>
        </label>
        <label>
          吨位
          <input v-model.number="form.quantityTons" required type="number" min="1" />
        </label>
        <label>
          所属船舶
          <select v-model="form.vesselName" required>
            <option value="" disabled>请选择船舶</option>
            <option v-for="v in vesselNames" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label>
          状态
          <select v-model="form.status">
            <option>待装船</option>
            <option>装卸中</option>
            <option>已装船</option>
            <option>待出港</option>
            <option>已卸货</option>
          </select>
        </label>
        <label>
          目的港
          <input v-model="form.destinationPort" required />
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">{{ editingId ? '更新' : '保存货物' }}</button>
          <button v-if="editingId" class="secondary-button" type="button" @click="cancelEdit">取消</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">货物列表</h3>
      <div class="search-bar">
        <input v-model="search" placeholder="搜索货物名称、类别、船舶、目的港…" @input="onSearch" />
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类别</th>
            <th>吨位</th>
            <th>所属船舶</th>
            <th>状态</th>
            <th>目的港</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="cargoes.length === 0">
            <td colspan="7" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="item in cargoes" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.quantityTons?.toLocaleString() }}</td>
            <td>{{ item.vesselName }}</td>
            <td><span class="status-tag" :class="cargoTagClass(item.status)">{{ item.status }}</span></td>
            <td>{{ item.destinationPort }}</td>
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
        <p>确定要删除货物「{{ deleting.name }}」吗？此操作不可撤销。</p>
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

const canEdit = auth.canEdit("cargoes");

const cargoes = ref([]);
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
  return { name: "", category: "原油", quantityTons: 10000, vesselName: "", status: "待装船", destinationPort: "" };
}

function cargoTagClass(status) {
  if (["装卸中"].includes(status)) return "tag-orange";
  if (["已装船", "已卸货"].includes(status)) return "tag-green";
  if (["待出港"].includes(status)) return "";
  return "";
}

let searchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadCargoes(); }, 300);
}

async function loadVesselNames() {
  try { vesselNames.value = await api.getAllVesselNames(); } catch { /* ignore */ }
}

async function loadCargoes() {
  try {
    const res = await api.getCargoes({ search: search.value, page: page.value, pageSize });
    cargoes.value = res.data;
    total.value = res.total;
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize));
  } catch { /* ignore */ }
}

function goPage(p) {
  page.value = p;
  loadCargoes();
}

function clearMessages() { errorMsg.value = ""; successMsg.value = ""; }

async function submitCargo() {
  clearMessages();
  try {
    if (editingId.value) {
      await api.updateCargo(editingId.value, { ...form.value });
      successMsg.value = "更新成功";
    } else {
      await api.createCargo({ ...form.value });
      successMsg.value = "创建成功";
    }
    cancelEdit();
    await loadCargoes();
    await loadVesselNames();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function startEdit(item) {
  clearMessages();
  editingId.value = item.id;
  form.value = { name: item.name, category: item.category, quantityTons: item.quantityTons, vesselName: item.vesselName, status: item.status, destinationPort: item.destinationPort };
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
    await api.deleteCargo(deleting.value.id);
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadCargoes();
  } catch (e) {
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadCargoes(); loadVesselNames(); });
</script>
