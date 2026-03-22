<template>
  <section>
    <h2 class="page-title">进出港作业</h2>
    <p class="page-subtitle">安排船舶进港、出港、泊位和货物作业计划。</p>

    <el-card shadow="hover" style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">作业单列表</span>
          <el-button v-if="canEdit" type="primary" @click="openCreate">新增作业单</el-button>
        </div>
      </template>
      <el-input v-model="search" placeholder="搜索船舶、方向、泊位、货物、状态…" :prefix-icon="Search" clearable @input="onSearch" style="margin-bottom:16px;max-width:400px" />
      <el-table :data="portCalls" stripe>
        <el-table-column prop="vesselName" label="船舶" />
        <el-table-column prop="direction" label="方向" width="80" />
        <el-table-column prop="berth" label="泊位" width="100" />
        <el-table-column prop="cargoName" label="货物" />
        <el-table-column prop="scheduledAt" label="计划时间" width="180" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="portCallTagType(row.status)" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
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

    <el-dialog v-model="formVisible" :title="editingId ? '编辑作业单' : '新增作业单'" width="620" align-center @closed="cancelEdit">
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <el-form :model="form" label-position="top" @submit.prevent="submitPortCall">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12">
            <el-form-item label="船舶名称">
              <el-select v-model="form.vesselName" placeholder="请选择船舶" style="width:100%">
                <el-option v-for="v in vesselNames" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="作业方向">
              <el-select v-model="form.direction" style="width:100%">
                <el-option v-for="d in ['进港','出港']" :key="d" :label="d" :value="d" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="泊位"><el-input v-model="form.berth" placeholder="如 A-01、B-02" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="关联货物"><el-input v-model="form.cargoName" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="计划时间"><el-input v-model="form.scheduledAt" type="datetime-local" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width:100%">
                <el-option v-for="s in ['已排期','作业中','待放行','已完成','已取消']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitPortCall">{{ editingId ? '更新' : '保存作业单' }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deleteVisible" title="确认删除" width="420" align-center>
      <p>确定要删除该作业单（{{ deleting?.vesselName }} - {{ deleting?.direction }}）吗？此操作不可撤销。</p>
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
const formVisible = ref(false);
const deleting = ref(null);
const deleteVisible = ref(false);

const form = ref(defaultForm());

function defaultForm() {
  return { vesselName: "", direction: "进港", berth: "", cargoName: "", scheduledAt: "", status: "已排期" };
}

function portCallTagType(status) {
  if (status === "作业中") return "warning";
  if (status === "已完成") return "success";
  if (status === "已取消") return "info";
  if (status === "待放行") return "danger";
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

function openCreate() {
  clearMessages();
  editingId.value = null;
  form.value = defaultForm();
  formVisible.value = true;
}

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
    formVisible.value = false;
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
    await api.deletePortCall(deleting.value.id);
    deleteVisible.value = false;
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadPortCalls();
  } catch (e) {
    deleteVisible.value = false;
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadPortCalls(); loadVesselNames(); });
</script>
