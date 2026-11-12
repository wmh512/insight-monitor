<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api'
import { selectedProject } from '../stores/project'

const projects = ref<{ projectKey: string; name: string }[]>([])
onMounted(async () => {
  const response = await api.get('/api/projects') as unknown as { data: { projectKey: string; name: string }[] }
  projects.value = response.data
  if (!projects.value.some((project) => project.projectKey === selectedProject.value) && projects.value[0]) selectedProject.value = projects.value[0].projectKey
})
</script>

<template>
  <el-select v-model="selectedProject" placeholder="选择项目" style="width: 190px">
    <el-option v-for="project in projects" :key="project.projectKey" :label="project.name" :value="project.projectKey" />
  </el-select>
</template>
