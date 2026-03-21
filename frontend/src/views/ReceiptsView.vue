<template>
  <section>
    <h2 class="page-title">回执管理</h2>
    <p class="page-subtitle">记录货物交易回执信息，包括货量、金额及运输路线。</p>

    <div v-if="canEdit" class="panel">
      <h3 style="margin-top: 0">{{ editingId ? '编辑回执' : '新增回执' }}</h3>
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <form class="form-grid" @submit.prevent="submitReceipt">
        <label>
          订单号
          <input v-model="form.orderNo" required placeholder="例如 ORD-20260321-001" />
        </label>
        <label>
          货量（吨）
          <input v-model.number="form.quantityTons" required type="number" min="1" step="any" />
        </label>
        <label>
          交易金额（元）
          <input v-model.number="form.amount" required type="number" min="0.01" step="0.01" />
        </label>
        <label>
          始发地
          <input v-model="form.origin" required />
        </label>
        <label>
          目的地
          <input v-model="form.destination" required />
        </label>
        <label>
          船舶名称
          <select v-model="form.vesselName" required>
            <option value="" disabled>请选择船舶</option>
            <option v-for="v in vesselNames" :key="v" :value="v">{{ v }}</option>
          </select>
        </label>
        <label>
          交易状态
          <select v-model="form.tradeStatus">
            <option>待确认</option>
            <option>交易中</option>
            <option>交易完成</option>
            <option>已取消</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">{{ editingId ? '更新' : '保存回执' }}</button>
          <button v-if="editingId" class="secondary-button" type="button" @click="cancelEdit">取消</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">回执列表</h3>
      <div class="search-bar">
        <input v-model="search" placeholder="搜索订单号、船舶名称、始发地、目的地、交易状态…" @input="onSearch" />
      </div>
      <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>编号</th>
            <th>订单号</th>
            <th>货量（吨）</th>
            <th>交易金额（元）</th>
            <th>始发地</th>
            <th>目的地</th>
            <th>船舶名称</th>
            <th>交易状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="receipts.length === 0">
            <td colspan="10" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="item in receipts" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.orderNo }}</td>
            <td>{{ item.quantityTons?.toLocaleString() }}</td>
            <td>{{ item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</td>
            <td>{{ item.origin }}</td>
            <td>{{ item.destination }}</td>
            <td>{{ item.vesselName }}</td>
            <td><span class="status-tag" :class="tradeTagClass(item.tradeStatus)">{{ item.tradeStatus }}</span></td>
            <td>{{ item.createdAt }}</td>
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
      </div>
      <div class="pagination">
        <span>共 {{ total }} 条</span>
        <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
        <span>{{ page }} / {{ totalPages }}</span>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
      </div>
    </div>

    <!-- 删除确认 -->
    <div v-if="deleting" class="confirm-overlay" @click.self="deleting = null">
      <div class="confirm-box">
        <h3>确认删除</h3>
        <p>确定要删除该回执（{{ deleting.vesselName }} - {{ deleting.origin }} → {{ deleting.destination }}）吗？此操作不可撤销。</p>
        <div class="confirm-actions">
          <button class="secondary-button" @click="deleting = null">取消</button>
          <button class="danger-button" @click="doDelete">删除</button>
        </div>
      </div>
    </div>

    <!-- 一致性警告弹框 -->
    <div v-if="warningList.length" class="confirm-overlay" @click.self="dismissWarning">
      <div class="confirm-box">
        <h3 style="color:#ea580c">⚠ 数据不一致警告</h3>
        <p>回执信息与船舶/货物记录存在以下不一致：</p>
        <ul style="margin:0 0 16px;padding-left:20px;color:#dc2626;font-size:14px">
          <li v-for="(w, i) in warningList" :key="i">{{ w }}</li>
        </ul>
        <p style="color:#62708a;font-size:13px">是否仍然提交该回执？</p>
        <div class="confirm-actions">
          <button class="secondary-button" @click="dismissWarning">取消</button>
          <button class="primary-button" @click="forceSubmit">仍然提交</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from "vue";
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
const deleting = ref(null);
const warningList = ref([]);

const form = ref(defaultForm());

function defaultForm() {
  return { orderNo: "", quantityTons: null, amount: null, origin: "", destination: "", vesselName: "", tradeStatus: "待确认" };
}

function tradeTagClass(status) {
  if (status === "交易完成") return "tag-green";
  if (status === "交易中") return "tag-orange";
  if (status === "已取消") return "tag-gray";
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
    await api.deleteReceipt(deleting.value.id);
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadReceipts();
  } catch (e) {
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(() => { loadReceipts(); loadVesselNames(); });
</script>
