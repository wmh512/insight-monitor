<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getStats } from '../api'

interface Stats {
  total_errors: number
  today_errors: number
  byKind: Record<string, number>
}

const stats = ref<Stats | null>(null)

onMounted(async () => {
  const res = await getStats('demo_project_key_001')
  stats.value = res.data
})
</script>

<template>
  <div v-if="stats">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ stats.total_errors }}</div>
          <div class="label">错误总数</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ stats.today_errors }}</div>
          <div class="label">今日错误</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover">
          <div class="num">{{ Object.keys(stats.byKind).length }}</div>
          <div class="label">错误类型数</div>
        </el-card>
      </el-col>
    </el-row>
    <el-card style="margin-top: 16px">
      <template #header>类型分布</template>
      <div v-for="(cnt, kind) in stats.byKind" :key="kind" class="kind-row">
        <span class="kind-name">{{ kind }}</span>
        <span>{{ cnt }} 次</span>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.num { font-size: 36px; font-weight: 600; text-align: center; }
.label { text-align: center; color: #909399; margin-top: 8px; }
.kind-row { display: flex; justify-content: space-between; padding: 8px 0; }
.kind-name { font-weight: 500; }
</style>
