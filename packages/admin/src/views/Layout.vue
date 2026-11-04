<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { currentUser, signOut as clearServerSession } from '../stores/session'
import { notifyError } from '../utils/error'

const route = useRoute()
const router = useRouter()

async function signOut() {
  try {
    await clearServerSession()
  } catch (error) {
    notifyError(error, '服务器退出确认失败，本地登录状态已清除')
  } finally {
    await router.replace('/login')
    ElMessage.success('已退出当前账号')
  }
}
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">Insight 监控</div>
      <el-menu :default-active="route.path" router background-color="#001529" text-color="#fff" active-text-color="#409eff">
        <el-menu-item index="/errors">错误列表</el-menu-item>
        <el-menu-item index="/stats">概览统计</el-menu-item>
        <el-menu-item index="/perf">性能看板</el-menu-item>
        <template v-if="currentUser?.role === 'admin'">
          <el-menu-item index="/audit/login">访问记录</el-menu-item>
          <el-menu-item index="/audit/operations">操作审计</el-menu-item>
        </template>
      </el-menu>
    </aside>
    <div class="main">
      <header class="header"><span>监控后台</span><div class="account"><el-tag v-if="currentUser?.role === 'viewer'" type="info">只读演示</el-tag><el-button text @click="signOut">退出登录</el-button></div></header>
      <div class="content">
        <el-alert v-if="currentUser?.role === 'viewer'" title="当前为只读演示账号，可查看错误和性能数据，不能修改状态。" type="info" :closable="false" show-icon class="viewer-notice" />
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; }
.sidebar { width: 200px; background: #001529; }
.logo { height: 60px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; color: #fff; }
.main { flex: 1; display: flex; flex-direction: column; background: #f0f2f5; }
.header { height: 60px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; font-size: 18px; }
.content { padding: 24px; flex: 1; overflow: auto; }
.account { display: flex; align-items: center; gap: 12px; }
.viewer-notice { margin-bottom: 16px; }
</style>
