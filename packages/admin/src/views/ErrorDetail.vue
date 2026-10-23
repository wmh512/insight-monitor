<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getErrorList, type ErrorListItem } from '../api'

// 页面状态（ref = Vue 的响应式变量，改了界面自动更新）
const list = ref<ErrorListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// 取数：调 Phase 1 封装的 API
async function load() {
  loading.value = true
  try {
    const res = await getErrorList({
      projectKey: 'demo_project_key_001',
      page: page.value,
      pageSize: pageSize.value,
    })
    list.value = res.data.list
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

// 组件挂载后立刻取第一页
onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <el-table :data="list" border>
      <el-table-column prop="message" label="错误信息" show-overflow-tooltip />
      <el-table-column prop="kind" label="类型" width="100" />
      <el-table-column prop="cnt" label="出现次数" width="110" />
      <el-table-column label="指纹" width="130">
        <template #default="{ row }">{{ row.fingerprint.slice(0, 8) }}…</template>
      </el-table-column>
      <el-table-column label="最近出现" width="180">
        <template #default="{ row }">{{ new Date(row.last_seen).toLocaleString() }}</template>
      </el-table-column>
    </el-table>
    <div class="pager">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="load"
      />
    </div>
  </div>
</template>

<style scoped>
.pager { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
