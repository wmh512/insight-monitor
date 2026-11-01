<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { signIn } from '../stores/session'
import { notifyError } from '../utils/error'

const route = useRoute()
const router = useRouter()
const form = reactive({ username: '', password: '' })
const submitting = ref(false)

async function submit() {
  if (!form.username.trim() || !form.password || submitting.value) return
  submitting.value = true
  try {
    await signIn(form.username.trim(), form.password)
    ElMessage.success('登录成功，欢迎回来')
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/errors'
    await router.replace(redirect)
  } catch (error) {
    notifyError(error, '登录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-panel">
      <div class="brand">Insight <span>监控</span></div>
      <p class="eyebrow">PRIVATE OBSERVABILITY</p>
      <h1>查看每一次异常</h1>
      <p class="subtitle">登录管理后台，查看错误与性能数据。</p>
      <el-alert v-if="route.query.expired" title="登录已失效，请重新登录" type="warning" :closable="false" show-icon />
      <el-form label-position="top" @submit.prevent="submit">
        <el-form-item label="管理员账号">
          <el-input v-model="form.username" autocomplete="username" placeholder="请输入管理员账号" size="large" autofocus />
        </el-form-item>
        <el-form-item label="管理员密码">
          <el-input v-model="form.password" type="password" autocomplete="current-password" placeholder="请输入管理员密码" size="large" show-password @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" size="large" native-type="submit" :loading="submitting" :disabled="!form.username.trim() || !form.password">
          {{ submitting ? '正在验证…' : '登录' }}
        </el-button>
      </el-form>
      <p class="hint">凭证仅用于本次验证，浏览器不会保存明文密码。</p>
    </section>
  </main>
</template>

<style scoped>
.login-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #eef3f8; box-sizing: border-box; }
.login-panel { width: min(420px, 100%); padding: 42px; border: 1px solid #e0e7ef; border-radius: 14px; background: #fff; box-shadow: 0 18px 50px #243b5312; box-sizing: border-box; }
.brand { font-size: 24px; font-weight: 700; color: #102a43; }
.brand span { color: #1677a3; }
.eyebrow { margin: 34px 0 10px; color: #6b8299; font-size: 11px; letter-spacing: 2px; }
h1 { margin: 0 0 12px; color: #102a43; font-size: 30px; }
.subtitle { margin: 0 0 26px; color: #6b8299; line-height: 1.7; }
.el-alert { margin-bottom: 22px; }
.el-button { width: 100%; margin-top: 8px; }
.hint { margin: 22px 0 0; color: #8a9aad; font-size: 12px; line-height: 1.7; }
</style>
