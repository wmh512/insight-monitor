import { ref, watch } from 'vue'

export const selectedProject = ref(localStorage.getItem('insight_project') || 'demo_project_key_001')
watch(selectedProject, (key) => localStorage.setItem('insight_project', key))
