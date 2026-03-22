<template>
  <section>
    <h2 class="page-title">回执管理</h2>
    <p class="page-subtitle">记录货物交易回执信息，包括货量、金额及运输路线。</p>

    <el-card shadow="hover" style="margin-top:20px">
      <template #header>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600">回执列表</span>
          <el-button v-if="canEdit" type="primary" @click="openCreate">新增回执</el-button>
        </div>
      </template>
      <el-input v-model="search" placeholder="搜索订单号、船舶名称、始发地、目的地、交易状态…" :prefix-icon="Search" clearable @input="onSearch" style="margin-bottom:16px;max-width:400px" />
      <el-table :data="receipts" stripe>
        <el-table-column prop="id" label="编号" width="80" />
        <el-table-column prop="orderNo" label="订单号" />
        <el-table-column label="货量（吨）" width="120">
          <template #default="{ row }">{{ row.quantityTons?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column label="交易金额（元）" width="140">
          <template #default="{ row }">{{ row.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</template>
        </el-table-column>
        <el-table-column prop="origin" label="始发地" />
        <el-table-column prop="destination" label="目的地" />
        <el-table-column prop="vesselName" label="船舶名称" />
        <el-table-column label="交易状态" width="120">
          <template #default="{ row }">
            <el-tag :type="tradeTagType(row.tradeStatus)" size="small">{{ row.tradeStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="editingId ? '编辑回执' : '新增回执'" width="620" align-center @closed="cancelEdit">
      <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" style="margin-bottom:16px" />
      <el-form :model="form" label-position="top" @submit.prevent="submitReceipt">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12"><el-form-item label="订单号"><el-input v-model="form.orderNo" placeholder="例如 ORD-20260321-001" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="货量（吨）"><el-input-number v-model="form.quantityTons" :min="1" style="width:100%" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="交易金额（元）"><el-input-number v-model="form.amount" :min="0.01" :precision="2" style="width:100%" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="始发地"><el-input v-model="form.origin" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12"><el-form-item label="目的地"><el-input v-model="form.destination" /></el-form-item></el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="船舶名称">
              <el-select v-model="form.vesselName" placeholder="请选择船舶" style="width:100%">
                <el-option v-for="v in vesselNames" :key="v" :label="v" :value="v" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12">
            <el-form-item label="交易状态">
              <el-select v-model="form.tradeStatus" style="width:100%">
                <el-option v-for="s in ['待确认','交易中','交易完成','已取消']" :key="s" :label="s" :value="s" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReceipt">{{ editingId ? '更新' : '保存回执' }}</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认 -->
    <el-dialog v-model="deleteVisible" title="确认删除" width="420" align-center>
      <p>确定要删除该回执（{{ deleting?.vesselName }} - {{ deleting?.origin }} → {{ deleting?.destination }}）吗？此操作不可撤销。</p>
      <template #footer>
        <el-button @click="deleteVisible = false">取消</el-button>
        <el-button type="danger" @click="doDelete">删除</el-button>
      </template>
    </el-dialog>

    <!-- 一致性警告弹框 -->
    <el-dialog v-model="warningVisible" title="⚠ 数据不一致警告" width="480" align-center>
      <p>回执信息与船舶/货物记录存在以下不一致：</p>
      <ul style="margin:0 0 16px;padding-left:20px;color:#dc2626;font-size:14px">
        <li v-for="(w, i) in warningList" :key="i">{{ w }}</li>
      </ul>
      <p style="color:#62708a;font-size:13px">是否仍然提交该回执？</p>
      <template #footer>
        <el-button @click="dismissWarning">取消</el-button>
        <el-button type="primary" @click="forceSubmit">仍然提交</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { Search } from "@element-plus/icons-vue";
import { api } from "../api/http.js";
import { auth } from "../auth.js";

const canEdit = auth.canEdit("receipts");

const receipts = ref([]);
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
const warningList = ref([]);
const warningVisible = computed({
  get: () => warningList.value.length > 0,
  set: (v) => { if (!v) warningList.value = []; }
});

const form = ref(defaultForm());

function defaultForm() {
  return { orderNo: "", quantityTons: null, amount: null, origin: "", destination: "", vesselName: "", tradeStatus: "待确认" };
}

function tradeTagType(status) {
  if (status === "交易完成") return "success";
  if (status === "交易中") return "warning";
  if (status === "已取消") return "info";
  return "";
}

let searchTimer;
function onSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadReceipts(); }, 300);
}

async function loadVesselNames() {
  try { vesselNames.value = await api.getAllVesselNames(); } catch { /* ignore */ }
}

async function loadReceipts() {
  try {
    const res = await api.getReceipts({ search: search.value, page: page.value, pageSize });
    receipts.value = res.data;
    total.value = res.total;
    totalPages.value = Math.max(1, Math.ceil(res.total / pageSize));
  } catch { /* ignore */ }
}

function goPage(p) {
  page.value = p;
  loadReceipts();
}

function clearMessages() { errorMsg.value = ""; successMsg.value = ""; }

function openCreate() {
  clearMessages();
  editingId.value = null;
  form.value = defaultForm();
  formVisible.value = true;
}

async function submitReceipt(force = false) {
  clearMessages();
  warningList.value = [];
  try {
    const payload = { ...form.value };
    if (force) payload.forceSubmit = true;

    const method = editingId.value ? "PUT" : "POST";
    const url = editingId.value ? `/receipts/${editingId.value}` : "/receipts";

    const res = await api.submitReceiptRaw(method, url, payload);

    if (res.status === 422 && res.data.type === "consistency_warning") {
      warningList.value = res.data.warnings;
      return;
    }

    if (!res.ok) {
      errorMsg.value = res.data.message || "请求失败";
      return;
    }

    successMsg.value = editingId.value ? "更新成功" : "创建成功";
    formVisible.value = false;
    cancelEdit();
    await loadReceipts();
  } catch (e) {
    errorMsg.value = e.message;
  }
}

function forceSubmit() {
  warningList.value = [];
  submitReceipt(true);
}

function dismissWarning() {
  warningList.value = [];
}

function startEdit(item) {
  clearMessages();
  editingId.value = item.id;
  form.value = { orderNo: item.orderNo || "", quantityTons: item.quantityTons, amount: item.amount, origin: item.origin, destination: item.destination, vesselName: item.vesselName, tradeStatus: item.tradeStatus || "待确认" };
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
    await api.deleteReceipt(deleting.value.id);
    deleteVisible.value = false;
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadReceipts();
  } catch (e) {
    deleteVisible.value = false;
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadReceipts(); loadVesselNames(); });
</script>
