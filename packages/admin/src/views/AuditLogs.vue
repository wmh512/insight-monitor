<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { browserSummary, getLoginAudit, getOperationAudit, type AuditRecord } from '../api/audit'
import { notifyError } from '../utils/error'

const props = defineProps<{ category: 'auth' | 'operation' }>()
const records = ref<AuditRecord[]>([])
const loading = ref(false)
const total = ref(0)
const detail = ref<AuditRecord | null>(null)
const filters = reactive({ username: '', eventType: '', result: '', ip: '', startTime: '', endTime: '', page: 1, pageSize: 20 })
const timeRange = ref<[string, string] | null>(null)
const eventLabels: Record<string, string> = { login: '登录', logout: '退出登录', 'issue.status.update': '修改错误状态' }
const reasonLabels: Record<string, string> = { invalid_credentials: '用户名或密码错误', not_found: '操作对象不存在', invalid_request: '请求参数无效', permission_denied: '权限不足' }

async function load() {
  loading.value = true
  try {
    filters.startTime = timeRange.value?.[0] ?? ''
    filters.endTime = timeRange.value?.[1] ?? ''
    const response = await (props.category === 'auth' ? getLoginAudit : getOperationAudit)({ ...filters })
    records.value = response.data.list
    total.value = response.data.total
  } catch (error) {
    notifyError(error, '审计记录加载失败')
  } finally {
    loading.value = false
  }
}
function search() { filters.page = 1; void load() }
function reset() {
  Object.assign(filters, { username: '', eventType: '', result: '', ip: '', startTime: '', endTime: '', page: 1 })
  timeRange.value = null
  void load()
}
function changes(row: AuditRecord) {
  if (!row.change_summary) return '-'
  const data = JSON.parse(row.change_summary) as { status?: { from: string; to: string } }
  return data.status ? `${data.status.from} → ${data.status.to}` : '-'
}
onMounted(load)
watch(() => props.category, reset)
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline @submit.prevent="search">
        <el-form-item label="账号"><el-input v-model="filters.username" clearable placeholder="全部账号" @keyup.enter="search" /></el-form-item>
        <el-form-item label="事件">
          <el-select v-model="filters.eventType" clearable placeholder="全部事件" style="width: 160px">
            <template v-if="category === 'auth'"><el-option label="登录" value="login" /><el-option label="退出登录" value="logout" /></template>
            <el-option v-else label="修改错误状态" value="issue.status.update" />
          </el-select>
        </el-form-item>
        <el-form-item label="结果"><el-select v-model="filters.result" clearable placeholder="全部结果" style="width: 120px"><el-option label="成功" value="success" /><el-option label="失败" value="failure" /></el-select></el-form-item>
        <el-form-item label="IP"><el-input v-model="filters.ip" clearable placeholder="来源 IP" @keyup.enter="search" /></el-form-item>
        <el-form-item label="时间"><el-date-picker v-model="timeRange" type="datetimerange" start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 340px" /></el-form-item>
        <el-form-item><el-button type="primary" @click="search">查询</el-button><el-button @click="reset">重置</el-button></el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="records" empty-text="暂无审计记录">
        <el-table-column label="时间" min-width="175"><template #default="{ row }">{{ new Date(row.created_at).toLocaleString() }}</template></el-table-column>
        <el-table-column prop="actor_username" label="账号" min-width="110"><template #default="{ row }">{{ row.actor_username || '-' }}</template></el-table-column>
        <el-table-column label="事件" min-width="130"><template #default="{ row }">{{ eventLabels[row.event_type] || row.event_type }}</template></el-table-column>
        <el-table-column label="结果" width="80"><template #default="{ row }"><el-tag :type="row.result === 'success' ? 'success' : 'danger'">{{ row.result === 'success' ? '成功' : '失败' }}</el-tag></template></el-table-column>
        <el-table-column v-if="category === 'operation'" label="对象 / 变更" min-width="180"><template #default="{ row }"><div>{{ row.target_id || '-' }}</div><small>{{ changes(row) }}</small></template></el-table-column>
        <el-table-column prop="ip" label="来源 IP" min-width="130" />
        <el-table-column v-if="category === 'auth'" label="浏览器 / 系统" min-width="155"><template #default="{ row }">{{ browserSummary(row.user_agent) }}</template></el-table-column>
        <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><el-button link type="primary" @click="detail = row">详情</el-button></template></el-table-column>
      </el-table>
      <el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" class="pagination" @change="load" />
    </el-card>
    <el-dialog :model-value="Boolean(detail)" title="审计详情" width="560px" @close="detail = null">
      <el-descriptions v-if="detail" :column="1" border>
        <el-descriptions-item label="时间">{{ new Date(detail.created_at).toLocaleString() }}</el-descriptions-item>
        <el-descriptions-item label="账号">{{ detail.actor_username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="事件">{{ eventLabels[detail.event_type] || detail.event_type }}</el-descriptions-item>
        <el-descriptions-item label="结果">{{ detail.result === 'success' ? '成功' : '失败' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.failure_reason" label="失败原因">{{ reasonLabels[detail.failure_reason] || detail.failure_reason }}</el-descriptions-item>
        <el-descriptions-item label="来源 IP">{{ detail.ip || '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.target_id" label="操作对象">{{ detail.target_type }} / {{ detail.target_id }}</el-descriptions-item>
        <el-descriptions-item v-if="detail.change_summary" label="变更摘要">{{ changes(detail) }}</el-descriptions-item>
        <el-descriptions-item label="浏览器信息"><span class="user-agent">{{ detail.user_agent || '-' }}</span></el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped>
.pagination { margin-top: 20px; justify-content: flex-end; }
.user-agent { overflow-wrap: anywhere; }
small { color: #909399; }
</style>
