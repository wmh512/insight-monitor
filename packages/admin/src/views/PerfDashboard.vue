<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import { getStats, getPerfList, type PerfRecord } from '../api'
import { notifyError } from '../utils/error'
import { selectedProject } from '../stores/project'

interface PerfStats {
  avg_fp: number
  avg_fcp: number
  avg_lcp: number
  cnt: number
}

const stats = ref<PerfStats | null>(null)
const loadFailed = ref(false)
const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

// 窗口尺寸变化时图表要跟着变（chart.resize 是 ECharts 的官方姿势）
function handleResize() {
  chart?.resize()
}

function renderChart(records: PerfRecord[]) {
  if (!chartEl.value) return
  chart?.dispose()
  chart = echarts.init(chartEl.value)

  // 接口返回是按时间倒序（最新在前），图表从左到右要是正序
  const data = [...records].reverse()

  chart.setOption({
    tooltip: { trigger: 'axis' }, // 悬停某天显示所有系列的值
    legend: { data: ['FCP', 'LCP'] }, // 图例
    grid: { left: 56, right: 24, top: 36, bottom: 48 }, // 边距（给轴标签留位置）
    xAxis: {
      type: 'category',
      data: data.map((r) => new Date(r.created_at).toLocaleTimeString()),
    },
    yAxis: { type: 'value', name: 'ms' },
    series: [
      { name: 'FCP', type: 'line', smooth: true, data: data.map((r) => r.fcp) },
      { name: 'LCP', type: 'line', smooth: true, data: data.map((r) => r.lcp) },
    ],
  })
}

async function load() {
  try {
    // 统计与图表任一失败都保留明确提示，不让页面无声空白。
    const [statsRes, perfRes] = await Promise.all([
      getStats(selectedProject.value),
      getPerfList({ projectKey: selectedProject.value, pageSize: 50 }),
    ])
    stats.value = statsRes.data.perf
    // stats 控制卡片渲染，等待 Vue 挂载容器后再初始化图表。
    await nextTick()
    if (perfRes.data.list.length) renderChart(perfRes.data.list)
    else { chart?.dispose(); chart = null }
    window.addEventListener('resize', handleResize)
  } catch (error) {
    loadFailed.value = true
    notifyError(error, '性能数据加载失败')
  }
}
onMounted(load)
watch(selectedProject, load)

// 组件销毁时清理：图表实例和事件监听都要释放（否则内存泄漏 + 报错）
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
})
</script>

<template>
  <div v-if="stats">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ Math.round(stats.avg_fp) }}</div>
          <div class="label">平均 FP（ms）</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ Math.round(stats.avg_fcp) }}</div>
          <div class="label">平均 FCP（ms）</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ Math.round(stats.avg_lcp) }}</div>
          <div class="label">平均 LCP（ms）</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card style="margin-top: 16px">
      <template #header>FCP / LCP 趋势（最近 {{ stats.cnt }} 次采集）</template>
      <!-- 图表容器：必须有明确高度，否则 ECharts 渲染不出来（经典坑） -->
      <div ref="chartEl" class="chart"></div>
    </el-card>
  </div>
  <el-result v-else-if="loadFailed" icon="error" title="性能数据加载失败" sub-title="请稍后刷新重试" />
</template>

<style scoped>
.num { font-size: 36px; font-weight: 600; text-align: center; }
.label { text-align: center; color: #909399; margin-top: 8px; }
.chart { height: 400px; width: 100%; }
</style>
