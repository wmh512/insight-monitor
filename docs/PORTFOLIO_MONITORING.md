# 个人作品集接入记录

## 部署与边界

- 作品集保持原有单文件页面与视觉内容，部署于 `/portfolio/`，独立目录为 `/opt/portfolio`。
- Nginx 使用 `location /portfolio/ { alias /opt/portfolio/; index index.html; }`，不影响后台、SDK、校园或商城。
- 监控脚本使用现有 `/sdk/dist/insight.umd.js` 和 `InsightSDK.init()`，不虚构 PV 或自定义事件 API。
- 独立 `monitor-config.js` 只在服务器保存上报 token，不进入作品集源代码或公开仓库。

## 数据隔离

- 作品集使用独立 `project_key=portfolio` 与项目级上报 token。
- 服务端 `REPORT_TOKENS_JSON` 保存项目 token 映射，旧项目继续使用原全局 token。
- 管理后台从 `/api/projects` 读取项目列表，错误、统计与性能查询随项目切换。
- 错误详情必须携带当前项目 key，服务端按项目校验。
- 虚构演示项目及其数据、viewer 配置与只读界面已移除；保留 Demo Project 和个人作品集。

## 验证

- 服务端 13 项测试、SDK 48 项测试通过，后台构建通过。
- 2026-11-12 作品集页面、Insight 登录、校园与商城健康检查均返回 200。
- 个人作品集已产生真实性能记录；错误列表为空，不人为制造错误。
- 当前仅有少量真实样本，不据此宣称性能结论。HTTPS 待域名 DNS 条件就绪后配置。
