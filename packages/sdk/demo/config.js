// Demo 的唯一环境配置入口。上报 token 是公开写入凭证，不是管理员密码。
// 部署时保持 /api/report 同源；本地开发改为 http://localhost:3000/api/report。
window.INSIGHT_DEMO_CONFIG = {
  projectId: 'demo_project_key_001',
  reportUrl: '/api/report',
  token: 'dev-token',
};
