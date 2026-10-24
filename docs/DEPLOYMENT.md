# 部署文档（Deployment Runbook）

> 本文档记录 insight-monitor 从零到公网上线的完整过程与踩坑，目标是：**任何人按此文档可复现部署**。

## 线上架构（2026-10-24 首版）

```
公网用户
  → 腾讯云安全组（只开 22/80/443/3000，3306 不开）
  → Nginx :80
      ├── /          → admin 静态站（Vue3 SPA，try_files 回退）
      ├── /api/*     → 反向代理到 localhost:3000
      └── /sdk/*     → demo 页 + SDK 产物静态文件
  → PM2 守护的 Node 进程（Koa API :3000）
  → MySQL 8（只听 localhost，应用账号最小权限连接）
```

| 组件 | 版本/位置 | 说明 |
|---|---|---|
| 服务器 | 腾讯云轻量 4C4G，OpenCloudOS 9.6 | IP 见团队内部记录 |
| Node | 20.20.2（AppStream 源，`dnf install nodejs`） | PM2 进程守护 |
| MySQL | 8.0.45（`dnf install mysql-server`） | systemd 托管，开机自启 |
| Nginx | 1.29.8 | systemd 托管，开机自启 |

## 首次部署步骤（Runbook）

### 1. 安全组

控制台 → 防火墙 → 添加规则：80/443/3000 TCP 允许，来源 0.0.0.0/0。
**3306 绝不开放**——数据库只允许本机 Node 通过 localhost 连接（纵深防御：应用账号 + 网络层双保险）。

### 2. 云上装环境

```bash
dnf install -y nodejs mysql-server nginx
systemctl enable --now mysqld nginx     # enable=开机自启，now=立即启动
npm install -g pm2 --registry=https://registry.npmmirror.com
systemctl is-active mysqld nginx        # 验证：两行 active
```

### 3. MySQL 初始化

```bash
mysql -u root                           # RHEL 系默认 socket 认证，免密进入
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '强密码';
CREATE DATABASE insight_monitor CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'insight'@'localhost' IDENTIFIED BY '应用密码';
GRANT ALL PRIVILEGES ON insight_monitor.* TO 'insight'@'localhost';
FLUSH PRIVILEGES;
```

安全设计：**应用不用 root**，专用账号 + 只限本机 + 只给单库权限（最小权限原则）。

### 4. 传代码（本地 PowerShell → scp）

```powershell
scp -r packages\server\src            root@IP:/opt/insight/packages/server/
scp    packages\server\package.json   root@IP:/opt/insight/packages/server/
scp -r packages\admin\dist            root@IP:/opt/insight/packages/admin/
scp -r packages\sdk\dist              root@IP:/opt/insight/packages/sdk/
scp -r packages\sdk\demo              root@IP:/opt/insight/packages/sdk/
```

### 5. 装依赖 + 配置 + 点火

```bash
cd /opt/insight/packages/server
npm install --registry=https://registry.npmmirror.com
# 写 .env（heredoc）：PORT / REPORT_TOKEN / DB_* （注意 DB_USER=insight）
pm2 start src/index.js --name insight-api
pm2 logs insight-api --lines 10 --nostream   # 看到"监控服务端已启动"即点火成功
```

### 6. 数据搬家（本地 → 云）

```powershell
# 本地：导出（必须 --result-file，见坑 1）
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p insight_monitor --result-file=C:\Users\xxx\Desktop\insight-dump.sql
scp C:\Users\xxx\Desktop\insight-dump.sql root@IP:/opt/insight/
```

```bash
# 云上：导入
mysql -u insight -p insight_monitor < /opt/insight/insight-dump.sql
mysql -u insight -p insight_monitor -e "SELECT COUNT(*) FROM error_report;"   # 验证条数
```

### 7. Nginx 配置

`/etc/nginx/conf.d/insight.conf`：

```nginx
server {
    listen 80;
    server_name _;
    location / {
        root /opt/insight/packages/admin/dist;
        try_files $uri $uri/ /index.html;      # SPA history 模式回退
    }
    location /api/ {
        proxy_pass http://localhost:3000;      # 反向代理
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /sdk/ {
        root /opt/insight/packages;            # demo + SDK 产物
    }
}
```

```bash
nginx -t && systemctl reload nginx
chmod -R o+rX /opt/insight                     # 权限修复，见坑 2
```

## 更新流程（日常发版）

| 改了什么 | 怎么上线 |
|---|---|
| 服务端代码 | scp 覆盖 `server/src/` → `pm2 restart insight-api` |
| 后台前端 | 本地 `pnpm --filter @insight/admin build` → scp 覆盖 `admin/dist/`（无需重启，静态文件） |
| 数据库结构/数据 | mysqldump → scp → `mysql < ` 导入 |

## 踩坑记录（全部有案底）

| # | 坑 | 解法 | 案底 |
|---|---|---|---|
| 1 | `mysqldump > file` 在 PowerShell 5.1 里以 UTF-16LE 写出，mysql 导入报 `ASCII '\0'` | 用 mysqldump 自带的 `--result-file`，不借道 shell 重定向 | P020 |
| 2 | Nginx 403：root umask 027 导致 scp 上传的文件"其他人"不可读，nginx 用户够不着 | `chmod -R o+rX /opt/insight` | — |
| 3 | 改 `.env` 后新服务起不来：旧进程占着 3000（EADDRINUSE），且旧进程带着旧配置在岗 | `Get-NetTCPConnection -LocalPort 3000` 找进程杀掉再起（云上：`fuser -k 3000/tcp` 或按 PID kill） | — |
| 4 | 空库直接查 API 报 500 `ER_NO_SUCH_TABLE` | 先跑第 6 步数据搬家（含建表） | — |
| 5 | `dnf module list nodejs` 无模块——但 `dnf install nodejs` 直接能装 20 | 工具的一条报错路径 ≠ 此路不通，先试直接安装 | — |

## 已知取舍（Roadmap）

- **HTTPS/域名**：待域名备案（1-2 周）后配 Nginx + 证书；先用 IP + HTTP
- **API 地址硬编码**：admin 的 `baseURL` 与 demo 的 `reportUrl` 暂写死线上 IP，应改为环境变量注入（dev=localhost / prod=相对路径走代理）
- **上报 token** 为静态单值（写死在 demo 页中可见），生产级应项目级 token + 服务端存储
- `today_errors` 返回字符串（SUM 的 DECIMAL 语义），需 CAST AS UNSIGNED
- 无 CI/CD：手动 scp + restart，量级够用；上 GitHub Actions 是 P2
