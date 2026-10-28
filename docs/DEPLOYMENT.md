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

## 更新流程（日常发版：tar 整体部署）

> ⚠️ **不要用 `scp 多个文件 → 同一个目录`**——scp 会把不同源目录的文件平铺进同一个目标目录，
> 文件会"放错房间"（P022，本项目已踩三次）。**打包整体部署，目录结构原样保留，不存在错位可能。**

```bash
# ① 本地打包（结构原样保留）
tar -czf deploy-src.tgz -C packages/server/src .
scp deploy-src.tgz root@114.132.238.83:/opt/insight/
```

```bash
# ② 云上：先备份（可回滚）→ 解包覆盖 → 清孤儿 → 补权限 → 重启
cp -r /opt/insight/packages/server/src /opt/insight/src-backup-$(date +%m%d-%H%M)
tar -xzf /opt/insight/deploy-src.tgz -C /opt/insight/packages/server/src --overwrite
chmod -R o+rX /opt/insight          # nginx 用户要读得到（umask 027 的坑，见下表）
pm2 restart insight-api --update-env
```

```bash
# ③ 验证（不看日志，看功能——curl 打接口看返回字段）
curl -s "http://localhost:3000/api/errors?projectKey=demo_project_key_001&pageSize=2"
```

| 改了什么 | 怎么上线 |
|---|---|
| 服务端代码 | 上面的 tar 四步（**改了 .env 必须 `--update-env`**，否则 PM2 用旧环境快照） |
| 后台前端 | 本地 `pnpm --filter @insight/admin build` → scp 覆盖 `admin/dist/` → **chmod 补权限**（无需重启） |
| 数据库结构 | `docs/migrate-issue.sql` 等迁移脚本上云执行（**脚本要幂等，重复执行不报错**） |
| 数据库数据 | `mysqldump --result-file=...`（**别用 shell 重定向**）→ scp → `mysql -u insight -p insight_monitor < file` |
| 紧急回滚 | `rm -rf /opt/insight/packages/server/src && cp -r /opt/insight/src-backup-<日期> /opt/insight/packages/server/src && pm2 restart insight-api` |

## 踩坑记录（全部有案底）

| # | 坑 | 解法 | 案底 |
|---|---|---|---|
| 1 | `mysqldump > file` 在 PowerShell 5.1 里以 UTF-16LE 写出，mysql 导入报 `ASCII '\0'` | 用 mysqldump 自带的 `--result-file`，不借道 shell 重定向 | P020 |
| 2 | Nginx 403：root umask 027 导致 scp 上传的文件"其他人"不可读，nginx 用户够不着 | `chmod -R o+rX /opt/insight` | — |
| 3 | 改 `.env` 后新服务起不来：旧进程占着 3000（EADDRINUSE），且旧进程带着旧配置在岗 | `Get-NetTCPConnection -LocalPort 3000` 找进程杀掉再起（云上：`fuser -k 3000/tcp` 或按 PID kill） | — |
| 4 | 空库直接查 API 报 500 `ER_NO_SUCH_TABLE` | 先跑第 6 步数据搬家（含建表） | — |
| 5 | `dnf module list nodejs` 无模块——但 `dnf install nodejs` 直接能装 20 | 工具的一条报错路径 ≠ 此路不通，先试直接安装 | — |
| 6 | **scp 多源平铺**：多文件从不同源目录传到同一目标目录 → 文件"放错房间"，旧文件继续在岗 | **改用 tar 整体部署**（结构原样保留）+ 传完 `grep -c` 验证目标文件 | P022 |
| 7 | **部分文件更新**：新 routes + 旧 controller → 进程启动即 SyntaxError（比完全没更新更糟） | 发版要么全上要么全不上；重启后先看启动日志 | — |
| 8 | 改了 `.env` 但 PM2 仍用旧环境快照 | `pm2 restart <app> --update-env`（PM2 会主动警告这件事） | — |
| 9 | 手写 SQL 占位符与列数错位 → `ER_WRONG_VALUE_COUNT` | 列清单与值表达式写在一起（相邻常量）；**上线前用真库跑一遍目标语句** | P024 |
| 10 | 新增 PATCH 接口后前端"点了没反应" | CORS `Allow-Methods` 补全（**非简单方法会触发预检**）；本地用 OPTIONS + `Access-Control-Request-Method` 模拟预检验证 | P025 |
| 11 | 服务端没有 body 解析中间件 → `ctx.request.body` 恒为 undefined → 400 | 沿用仓库既有模式：`getRawBody` 手动读流 + JSON.parse | P026 |
| 12 | 迁移脚本重复执行报 `Duplicate entry` | 迁移脚本必须**幂等**：`INSERT IGNORE` / `CREATE TABLE IF NOT EXISTS` | — |

## 已知取舍（Roadmap）

- **HTTPS/域名**：待域名备案（1-2 周）后配 Nginx + 证书；先用 IP + HTTP
- **API 地址硬编码**：admin 的 `baseURL` 与 demo 的 `reportUrl` 暂写死线上 IP，应改为环境变量注入（dev=localhost / prod=相对路径走代理）
- **上报 token** 为静态单值（写死在 demo 页中可见），生产级应项目级 token + 服务端存储
- `today_errors` 类型已修复（`CAST(... AS UNSIGNED)`，2026-10-25 发版）
- 无 CI/CD：手动 tar 部署 + restart，量级够用；上 GitHub Actions 是 P2

---

## 附：多项目共用一台服务器（2026-10-28 观察）

```
pm2 status
huawei-mall-api   1.0.0 │ fork │ pid 972970 │ 20h │ online │ 69.4mb
insight-api       0.1.0 │ fork │ pid 1243538 │  0s │ online │ 12.4mb
```

**这台机器上已经跑着两个业务后端**（商城 API + 监控 API），PM2 统一守护、Nginx 按路径分流。
"单机多项目"不是设想而是既成事实——新增项目只需：加一个 PM2 进程 + 加一段 Nginx location + 建一个独立库。
**边界**：CPU/内存共享（4C4G 当前余量充足），项目间无资源隔离；真要做隔离该上容器（Docker）或各自独立实例。
