<template>
  <section>
    <h2 class="page-title">港口业务概览</h2>
    <p class="page-subtitle">查看当前船舶、货物与进出港任务的整体情况。</p>

    <div class="stats-grid" style="margin-top: 20px">
      <article class="stat-card">
        <small>船舶总数</small>
        <strong>{{ dashboard.stats.totalVessels }}</strong>
      </article>
      <article class="stat-card">
        <small>货物总数</small>
        <strong>{{ dashboard.stats.totalCargoes }}</strong>
      </article>
      <article class="stat-card">
        <small>在港船舶</small>
        <strong>{{ dashboard.stats.inPortVessels }}</strong>
      </article>
      <article class="stat-card">
        <small>进行中作业</small>
        <strong>{{ dashboard.stats.totalPortCalls }}</strong>
      </article>
      <article class="stat-card" :style="dashboard.stats.delayedPortCalls > 0 ? 'border-color:#fecaca;background:linear-gradient(135deg,#fff,#fef2f2)' : ''">
        <small>延误作业</small>
        <strong :style="dashboard.stats.delayedPortCalls > 0 ? 'color:#dc2626' : ''">{{ dashboard.stats.delayedPortCalls }}</strong>
      </article>
    </div>

    <!-- 货物类别分布 -->
    <div v-if="dashboard.categoryBreakdown.length" class="panel" style="margin-top: 20px">
      <h3 style="margin-top: 0">货物类别分布</h3>
      <div class="breakdown-grid">
        <div v-for="cat in dashboard.categoryBreakdown" :key="cat.category" class="breakdown-card">
          <small>{{ cat.category }}</small>
          <strong>{{ cat.count }} 批</strong>
          <span style="display:block;color:#62708a;font-size:13px;margin-top:2px">{{ cat.totalTons?.toLocaleString() }} 吨</span>
        </div>
      </div>
    </div>

    <div class="panel" style="margin-top: 20px">
      <h3 style="margin-top: 0">近期进出港计划</h3>
      <table class="table">
        <thead>
          <tr>
            <th>船舶</th>
            <th>方向</th>
            <th>泊位</th>
            <th>货物</th>
            <th>计划时间</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="dashboard.recentPortCalls.length === 0">
            <td colspan="6" class="empty-row">暂无数据</td>
          </tr>
          <tr v-for="item in dashboard.recentPortCalls" :key="`${item.vesselName}-${item.scheduledAt}`">
            <td>{{ item.vesselName }}</td>
            <td>{{ item.direction }}</td>
            <td>{{ item.berth }}</td>
            <td>{{ item.cargoName }}</td>
            <td>{{ item.scheduledAt }}</td>
            <td><span class="status-tag" :class="portCallTagClass(item.status)">{{ item.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted, reactive } from "vue";
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

function portCallTagClass(status) {
  if (status === "作业中") return "tag-orange";
  if (status === "已完成") return "tag-green";
  if (status === "已取消") return "tag-gray";
  if (status === "待放行") return "tag-red";
  return "";
}

onMounted(async () => {
  Object.assign(dashboard, await api.getDashboard());
});
</script>
