<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getErrorList, setIssueStatus, type ErrorListItem, type IssueStatus } from '../api'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const list = ref<ErrorListItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const loading = ref(false)

// 生命周期状态 → 展示（unseen=新问题，seen=处理中，resolved=已解决）
const STATUS_META: Record<IssueStatus, { text: string; type: 'danger' | 'info' | 'success' }> = {
  unseen: { text: '新', type: 'danger' },
  seen: { text: '处理中', type: 'info' },
  resolved: { text: '已解决', type: 'success' },
}

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

const router = useRouter()

// 点表格行 → 跳该指纹最新记录的详情
function goDetail(row: ErrorListItem) {
  router.push(`/errors/${row.id}`)
}

// 标记已解决 / 重新打开（状态机的人工干预）
async function toggleStatus(row: ErrorListItem) {
  const next: IssueStatus = row.status === 'resolved' ? 'unseen' : 'resolved'
  await setIssueStatus(row.fingerprint, next)
  ElMessage.success(next === 'resolved' ? '已标记为已解决' : '已重新打开')
  await load()
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <el-table :data="list" border @row-click="goDetail">
      <el-table-column prop="message" label="错误信息" show-overflow-tooltip />
      <el-table-column prop="kind" label="类型" width="90" />
      <el-table-column prop="cnt" label="出现次数" width="100" />
      <el-table-column label="状态" width="170">
        <template #default="{ row }">
          <el-tag :type="STATUS_META[row.status as IssueStatus].type" size="small">
            {{ STATUS_META[row.status as IssueStatus].text }}
          </el-tag>
          <span class="notify">已提醒 {{ row.notify_count }} 次</span>
        </template>
      </el-table-column>
      <el-table-column label="指纹" width="120">
        <template #default="{ row }">{{ row.fingerprint.slice(0, 8) }}…</template>
      </el-table-column>
      <el-table-column label="最近出现" width="170">
        <template #default="{ row }">{{ new Date(row.last_seen).toLocaleString() }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <!-- @click.stop：阻止冒泡，否则点按钮会同时触发整行的跳转 -->
          <el-button size="small" text type="primary" @click.stop="toggleStatus(row)">
            {{ row.status === 'resolved' ? '重新打开' : '标记已解决' }}
          </el-button>
        </template>
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
.notify { margin-left: 8px; font-size: 12px; color: #909399; }
:deep(.el-table__row) { cursor: pointer; }
</style>
