<template>
  <section>
    <h2 class="page-title">船舶管理</h2>
    <p class="page-subtitle">登记货轮基础信息，跟踪当前港口作业状态。</p>

    <div v-if="canEdit" class="panel">
      <h3 style="margin-top: 0">{{ editingId ? '编辑船舶' : '新增船舶' }}</h3>
      <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
      <div v-if="successMsg" class="success-msg">{{ successMsg }}</div>
      <form class="form-grid" @submit.prevent="submitVessel">
        <label>
          船舶名称
          <input v-model="form.name" required />
        </label>
        <label>
          IMO 编号
          <input v-model="form.imo" required />
        </label>
        <label>
          当前状态
          <select v-model="form.status">
            <option>锚地等待</option>
            <option>待进港</option>
            <option>进港中</option>
            <option>靠泊中</option>
            <option>在港</option>
            <option>装卸中</option>
            <option>待出港</option>
            <option>出港中</option>
            <option>已离港</option>
          </select>
        </label>
        <label>
          运力吨位
          <input v-model.number="form.capacityTons" required type="number" min="1" />
        </label>
        <label>
          上一港口
          <input v-model="form.lastPort" required />
        </label>
        <label>
          ETA
          <input v-model="form.eta" required type="datetime-local" />
        </label>
        <div class="form-actions">
          <button class="primary-button" type="submit">{{ editingId ? '更新' : '保存船舶' }}</button>
          <button v-if="editingId" class="secondary-button" type="button" @click="cancelEdit">取消</button>
        </div>
      </form>
    </div>

    <div class="panel">
      <h3 style="margin-top: 0">船舶列表</h3>
      <div class="search-bar">
        <input v-model="search" placeholder="搜索船舶名称、IMO、状态、港口…" @input="onSearch" />
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>IMO</th>
            <th>状态</th>
            <th>运力吨位</th>
            <th>上一港口</th>
            <th>ETA</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="vessels.length === 0">
            <td colspan="7" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="item in vessels" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.imo }}</td>
            <td><span class="status-tag" :class="vesselTagClass(item.status)">{{ item.status }}</span></td>
            <td>{{ item.capacityTons?.toLocaleString() }}</td>
            <td>{{ item.lastPort }}</td>
            <td>{{ item.eta }}</td>
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

    <!-- 删除确认 -->
    <div v-if="deleting" class="confirm-overlay" @click.self="deleting = null">
      <div class="confirm-box">
        <h3>确认删除</h3>
        <p>确定要删除船舶「{{ deleting.name }}」吗？此操作不可撤销。</p>
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

const canEdit = auth.canEdit("vessels");

const vessels = ref([]);
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
  return { name: "", imo: "", status: "待进港", capacityTons: 50000, lastPort: "", eta: "" };
}

function vesselTagClass(status) {
  if (["在港", "装卸中", "靠泊中"].includes(status)) return "tag-green";
  if (["待进港", "进港中", "锚地等待"].includes(status)) return "tag-orange";
  if (["已离港"].includes(status)) return "tag-gray";
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
    await api.deleteVessel(deleting.value.id);
    deleting.value = null;
    successMsg.value = "删除成功";
    await loadVessels();
  } catch (e) {
    deleting.value = null;
    errorMsg.value = e.message;
  }
}

onMounted(loadVessels);
</script>
