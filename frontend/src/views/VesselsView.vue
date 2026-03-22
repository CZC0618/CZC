<template>
  <section>
    <h2 class="page-title">船舶管理</h2>
    <p class="page-subtitle">登记货轮基础信息，跟踪当前港口作业状态。</p>

    <el-card shadow="hover" style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">船舶列表</span>
          <el-button v-if="canEdit" type="primary" @click="openCreate">新增船舶</el-button>
        </div>
      </template>
      <el-input v-model="search" placeholder="搜索船舶名称、IMO、状态、港口…" :prefix-icon="Search" clearable @input="onSearch" style="margin-bottom:16px;max-width:400px" />
      <el-table :data="vessels" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="imo" label="IMO" width="120" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="vesselTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="运力吨位" width="120">
          <template #default="{ row }">{{ row.capacityTons?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="lastPort" label="上一港口" />
        <el-table-column prop="eta" label="ETA" width="180" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="canEdit">
              <el-button size="small" type="primary" link @click="startEdit(row)">编辑</el-button>
              <el-button size="small" type="danger" link @click="confirmDelete(row)">删除</el-button>
            </template>
            <span v-else style="color:#94a3b8;font-size:13px">只读</span>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="goPage"
        />
      </div>
    </el-card>

    <el-dialog v-model="formVisible" :title="editingId ? '编辑船舶' : '新增船舶'" width="620" align-center @closed="cancelEdit">
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <el-form :model="form" label-position="top" @submit.prevent="submitVessel">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12"><el-form-item label="船舶名称"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="IMO 编号"><el-input v-model="form.imo" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="当前状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option v-for="s in vesselStatuses" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="运力吨位"><el-input-number v-model="form.capacityTons" :min="1" style="width:100%" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="上一港口"><el-input v-model="form.lastPort" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="ETA"><el-input v-model="form.eta" type="datetime-local" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitVessel">{{ editingId ? '更新' : '保存船舶' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteVisible" title="确认删除" width="420" align-center>
      <p>确定要删除船舶「{{ deleting?.name }}」吗？此操作不可撤销。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { Search } from "@element-plus/icons-vue";
import { api } from "../api/http.js";
import { auth } from "../auth.js";

const canEdit = auth.canEdit("vessels");
const vesselStatuses = ["锚地等待","待进港","进港中","靠泊中","在港","装卸中","待出港","出港中","已离港"];

const vessels = ref([]);
const total = ref(0);
const page = ref(1);
const totalPages = ref(1);
const pageSize = 10;
const search = ref("");
const errorMsg = ref("");
const successMsg = ref("");
const editingId = ref(null);
const formVisible = ref(false);
const deleting = ref(null);
const deleteVisible = ref(false);

const form = ref(defaultForm());

function defaultForm() {
  return { name: "", imo: "", status: "待进港", capacityTons: 50000, lastPort: "", eta: "" };
}

function vesselTagType(status) {
  if (["在港", "装卸中", "靠泊中"].includes(status)) return "success";
  if (["待进港", "进港中", "锚地等待"].includes(status)) return "warning";
  if (["已离港"].includes(status)) return "info";
  return "";
}

let searchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadVessels(); }, 300);
}

async function loadVessels() {
  try {
    const res = await api.getVessels({ search: search.value, page: page.value, pageSize });
    vessels.value = res.data;
    total.value = res.total;
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize));
  } catch { /* ignore */ }
}

function goPage(p) {
  page.value = p;
  loadVessels();
}

function clearMessages() { errorMsg.value = ""; successMsg.value = ""; }

function openCreate() {
  clearMessages();
  editingId.value = null;
  form.value = defaultForm();
  formVisible.value = true;
}

async function submitVessel() {
  clearMessages();
  try {
    if (editingId.value) {
      await api.updateVessel(editingId.value, { ...form.value });
      successMsg.value = "更新成功";
    } else {
      await api.createVessel({ ...form.value });
      successMsg.value = "创建成功";
    }
    formVisible.value = false;
    cancelEdit();
    await loadVessels();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function startEdit(item) {
  clearMessages();
  editingId.value = item.id;
  form.value = { name: item.name, imo: item.imo, status: item.status, capacityTons: item.capacityTons, lastPort: item.lastPort, eta: item.eta };
  formVisible.value = true;
}

function cancelEdit() {
  editingId.value = null;
  form.value = defaultForm();
}

function confirmDelete(item) {
  clearMessages();
  deleting.value = item;
  deleteVisible.value = true;
}

async function doDelete() {
  try {
    await api.deleteVessel(deleting.value.id);
    deleteVisible.value = false;
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadVessels();
  } catch (e) {
    deleteVisible.value = false;
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(loadVessels);
</script>
