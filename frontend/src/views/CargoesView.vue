<template>
  <section>
    <h2 class="page-title">货物管理</h2>
    <p class="page-subtitle">管理油品与相关货物批次，跟踪当前装卸状态。</p>

    <el-card shadow="hover" style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">货物列表</span>
          <el-button v-if="canEdit" type="primary" @click="openCreate">新增货物</el-button>
        </div>
      </template>
      <el-input v-model="search" placeholder="搜索货物名称、类别、船舶、目的港…" :prefix-icon="Search" clearable @input="onSearch" style="margin-bottom:16px;max-width:400px" />
      <el-table :data="cargoes" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="category" label="类别" width="100" />
        <el-table-column label="吨位" width="120">
          <template #default="{ row }">{{ row.quantityTons?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="vesselName" label="所属船舶" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="cargoTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="destinationPort" label="目的港" />
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

    <el-dialog v-model="formVisible" :title="editingId ? '编辑货物' : '新增货物'" width="620" align-center @closed="cancelEdit">
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <el-form :model="form" label-position="top" @submit.prevent="submitCargo">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12"><el-form-item label="货物名称"><el-input v-model="form.name" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="货物类别">
              <el-select v-model="form.category" style="width:100%">
                <el-option v-for="c in ['原油','成品油','化工品']" :key="c" :label="c" :value="c" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="吨位"><el-input-number v-model="form.quantityTons" :min="1" style="width:100%" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="所属船舶">
              <el-select v-model="form.vesselName" placeholder="请选择船舶" style="width:100%">
                <el-option v-for="v in vesselNames" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option v-for="s in ['待装船','装卸中','已装船','待出港','已卸货']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="目的港"><el-input v-model="form.destinationPort" /></el-form-item></el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCargo">{{ editingId ? '更新' : '保存货物' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteVisible" title="确认删除" width="420" align-center>
      <p>确定要删除货物「{{ deleting?.name }}」吗？此操作不可撤销。</p>
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
const formVisible = ref(false);
const deleting = ref(null);
const deleteVisible = ref(false);

const form = ref(defaultForm());

function defaultForm() {
  return { name: "", category: "原油", quantityTons: 10000, vesselName: "", status: "待装船", destinationPort: "" };
}

function cargoTagType(status) {
  if (["装卸中"].includes(status)) return "warning";
  if (["已装船", "已卸货"].includes(status)) return "success";
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

function openCreate() {
  clearMessages();
  editingId.value = null;
  form.value = defaultForm();
  formVisible.value = true;
}

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
    formVisible.value = false;
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
    await api.deleteCargo(deleting.value.id);
    deleteVisible.value = false;
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadCargoes();
  } catch (e) {
    deleteVisible.value = false;
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadCargoes(); loadVesselNames(); });
</script>
