<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getErrorDetail } from '../api'

const route = useRoute() // 读 URL 里的 :id
const router = useRouter() // 返回按钮用
const detail = ref<Record<string, string> | null>(null)
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const res = await getErrorDetail(Number(route.params.id))
    detail.value = res.data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading">
    <div class="toolbar">
      <el-button @click="router.back()">返回列表</el-button>
    </div>
    <el-descriptions v-if="detail" title="错误详情" :column="2" border>
      <el-descriptions-item label="类型">{{ detail.kind }}</el-descriptions-item>
      <el-descriptions-item label="出现时间">{{ new Date(detail.created_at).toLocaleString() }}</el-descriptions-item>
      <el-descriptions-item label="页面地址" :span="2">{{ detail.page_url }}</el-descriptions-item>
      <el-descriptions-item label="浏览器 UA" :span="2">{{ detail.ua }}</el-descriptions-item>
    </el-descriptions>
    <div v-if="detail" class="stack">
      <h4>错误信息</h4>
      <pre>{{ detail.message }}</pre>
      <h4>堆栈跟踪</h4>
      <pre>{{ detail.stack }}</pre>
    </div>
  </div>
</template>

<style scoped>
.toolbar { margin-bottom: 16px; }
.stack { margin-top: 16px; background: #fff; padding: 16px; border-radius: 4px; }
.stack h4 { margin: 12px 0 8px; }
pre {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
