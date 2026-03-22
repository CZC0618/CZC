<template>
  <section>
    <h2 class="page-title">港口业务概览</h2>
    <p class="page-subtitle">查看当前船舶、货物与进出港任务的整体情况。</p>

    <el-row :gutter="16" style="margin-top: 20px">
      <el-col :xs="12" :sm="8" :md="4" :lg="4" v-for="stat in statCards" :key="stat.label">
        <el-card shadow="hover" :body-style="stat.danger ? { borderTop: '3px solid #f56c6c' } : {}">
          <el-statistic :title="stat.label" :value="stat.value" :value-style="stat.danger ? { color: '#dc2626' } : {}" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 货物类别分布 -->
    <el-card v-if="dashboard.categoryBreakdown.length" shadow="hover" style="margin-top: 20px">
      <template #header><span style="font-weight:600">货物类别分布</span></template>
      <el-row :gutter="16">
        <el-col :xs="24" :sm="8" v-for="cat in dashboard.categoryBreakdown" :key="cat.category">
          <el-card shadow="never" style="background:#f8fafc;margin-bottom:12px">
            <el-statistic :title="cat.category" :value="cat.count" suffix="批" />
            <div style="color:#62708a;font-size:13px;margin-top:4px">{{ cat.totalTons?.toLocaleString() }} 吨</div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="hover" style="margin-top: 20px">
      <template #header><span style="font-weight:600">近期进出港计划</span></template>
      <el-table :data="dashboard.recentPortCalls" stripe>
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
      </el-table>
    </el-card>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive } from "vue";
import { api } from "../api/http.js";

const dashboard = reactive({
  stats: {
    totalVessels: 0,
    totalCargoes: 0,
    inPortVessels: 0,
    totalPortCalls: 0,
    delayedPortCalls: 0
  },
  categoryBreakdown: [],
  recentPortCalls: []
});

const statCards = computed(() => [
  { label: "船舶总数", value: dashboard.stats.totalVessels },
  { label: "货物总数", value: dashboard.stats.totalCargoes },
  { label: "在港船舶", value: dashboard.stats.inPortVessels },
  { label: "进行中作业", value: dashboard.stats.totalPortCalls },
  { label: "延误作业", value: dashboard.stats.delayedPortCalls, danger: dashboard.stats.delayedPortCalls > 0 }
]);

function portCallTagType(status) {
  if (status === "作业中") return "warning";
  if (status === "已完成") return "success";
  if (status === "已取消") return "info";
  if (status === "待放行") return "danger";
  return "";
}

onMounted(async () => {
  Object.assign(dashboard, await api.getDashboard());
});
</script>
