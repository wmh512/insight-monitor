# 域名与 HTTPS 部署

## 固定地址

- `https://wmh512zzj622.cn/login`：监控管理后台。
- `https://work.wmh512zzj622.cn/`：个人作品集。
- `https://work.wmh512zzj622.cn/api/report`：作品集 SDK 同源上报。

## 前置条件

1. 在 DNS 控制台添加 `@`、`work` 两条 A 记录，值为 `114.132.238.83`。
2. 确认腾讯云防火墙允许公网 80、443 端口。
3. 备案号为 `冀ICP备2026049028号-1`，只展示已确认的 ICP 备案，不虚构公安备案号。

## 实施边界

- 先添加两个独立 Nginx `server`，保留旧 IP 站点作为回退。
- DNS 生效后再申请证书、启用 HTTPS 跳转和 `TRUST_PROXY_HTTPS=true`。
- 作品集跨域上报只增加 `https://work.wmh512zzj622.cn`，不需要将管理凭证暴露到前端。
- 部署前备份 Insight 代码、后台构建、作品集与 Nginx 配置；不修改校园、商城配置。
- 证书申请、DNS 和 HTTPS 真实访问结果须单独验收，不以配置文件存在代替验证。
