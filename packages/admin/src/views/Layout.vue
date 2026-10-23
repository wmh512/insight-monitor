<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">Insight 监控</div>
      <el-menu :default-active="route.path" router background-color="#001529" text-color="#fff" active-text-color="#409eff">
        <el-menu-item index="/errors">错误列表</el-menu-item>
        <el-menu-item index="/stats">概览统计</el-menu-item>
      </el-menu>
    </aside>
    <div class="main">
      <header class="header">监控后台</header>
      <div class="content">
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
.header { height: 60px; background: #fff; display: flex; align-items: center; padding: 0 24px; font-size: 18px; }
.content { padding: 24px; flex: 1; overflow: auto; }
</style>
