# 部署指南 — digients-preview

> 给接手改这个门户的人。`deploy/README.md` 讲的是**从零装一台新机器**；这份讲**在已经跑起来的那台上改东西**。
>
> 最后更新：2026-09-01

## 1. 一句话

一台 Lightsail 上跑着**两份同样的代码**（prod 和 dev）和**三个别人的静态站**，前面统一由 Caddy 分流。改网页 = 改代码 → 在机器上 pull + build + 重启对应的 systemd 服务。

## 2. 机器

```
ssh alexzhang@18.142.14.149          # Ubuntu 24.04，Lightsail，ap-southeast-1
```

用你 GitHub 上那把公钥登（`github.com/hyzhang24.keys` 里的两把都装了）。账号有免密 sudo。

⚠️ **磁盘只剩 12 GB**（38G 已用 26G）。视频是大头，拉数据前先 `df -h`。

## 3. 这台机器上跑着什么

| 域名 | 是什么 | 端口 | 代码在 | systemd 服务 |
|---|---|---|---|---|
| `sample.digients.tech` | **生产**门户（对客户） | 8787 | `/opt/digients-preview` | `digients-preview` |
| `dev.sample.digients.tech` | **dev/staging** 门户 | 8788 | `/opt/digients-preview-dev` | `digients-preview-dev` |
| `dev.digients.tech` | 只回一句「已迁移」的静态页 | — | Caddyfile 里内联 | — |
| `wholebodysample.digients.tech` | Matt 的动捕 sample 静态站 | — | `/srv/mocap-sample` | — |
| `scene.sample.digients.tech` | 占位假门（数据还没有） | — | `/srv/scene-sample` | — |

两个 Node 服务都以 `User=ubuntu` 运行，代码目录也属 `ubuntu`。**所以部署时切成 ubuntu 做，别用你自己的账号 build**，否则文件属主会乱：

```bash
sudo -iu ubuntu
```

## 4. 改 dev 站（`dev.sample.digients.tech`）

正常流程：本地改 → push 到 GitHub → 机器上 pull + build + 重启。一条命令：

```bash
sudo -iu ubuntu
APP_DIR=/opt/digients-preview-dev bash /opt/digients-preview-dev/deploy/update.sh
```

脚本会自己从 `APP_DIR` 推出服务名（`digients-preview-dev`）和健康检查端口（8788），
最后打印 `/healthz` 的结果。想手动来也行：

```bash
sudo -iu ubuntu
cd /opt/digients-preview-dev
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
exit                                         # 回到自己的账号
sudo systemctl restart digients-preview-dev  # 注意服务名带 -dev
curl -s localhost:8788/healthz               # 期望 ok
```

⚠️ **dev 那份代码当前不在 `main` 上**，在 `feat/remove-taxonomy-crumbs`。`git pull` 前先 `git branch --show-current` 看清楚你在拉哪条分支。

## 5. 改生产站（`sample.digients.tech`）

同上，把路径换成 `/opt/digients-preview`、服务换成 `digients-preview`、端口换成 8787。**先在 dev 上验过再动生产。**

## 6. 🔴 两个会咬人的地方

> 曾经的第三个：`update.sh` 收 `APP_DIR`，重启的服务名却写死成 `digients-preview` ——
> 拿它部署 dev 会「build 了 dev、重启了 prod」，而健康检查打在 prod 端口上、无论如何都报 ok。
> **2026-09-01 已修**，现在服务名和端口都从 `APP_DIR` 推导。如果你手上是旧版脚本，先 `git pull`。

### 6.1 不要拿仓库里的 `deploy/Caddyfile` 覆盖线上的

**线上 `/etc/caddy/Caddyfile` 是唯一真相**，里面有 5 个 site block。仓库里那份只有 1 个（生产那条），是最初装机时的模板，早就落后了。覆盖上去会一次抹掉 dev 路由、Matt 的站和占位门。

改 Caddy 就直接改线上那份：

```bash
sudo nano /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile   # 先验，别直接 reload
sudo systemctl reload caddy
```

### 6.2 `videos/` `captions/` `posters/` 不在 git 里

机器上那 20 多 G 数据是**可重建的缓存，不是唯一副本**，源在腾讯 COS 和 AWS S3。别把它们当代码管，也别以为丢了就没了。重建链（在代码目录里跑）：

```bash
pnpm sync:cos → pnpm sync:handhead → pnpm gen:posters → pnpm gen:combos → pnpm gen:catalog
```

## 7. 排查

```bash
sudo systemctl status digients-preview-dev        # 服务状态
sudo journalctl -u digients-preview-dev -f        # 实时日志
sudo journalctl -u caddy -n 50 --no-pager         # Caddy 日志（证书问题看这里）
curl -s localhost:8788/healthz                    # 绕开 Caddy 直接问应用
```

**判断是应用挂了还是 Caddy 挂了**：`localhost:8788/healthz` 通但公网 502 → Caddy 的问题；`localhost` 也不通 → 应用的问题。

## 8. 环境变量 / 密码

```
/etc/digients-preview.env         生产（门户访问口令 + session secret）
/etc/digients-preview-dev.env     dev
```

改完必须重启对应服务才生效。**这两个文件不进 git**，仓库里只有 `deploy/digients-preview.env.example` 模板。

## 9. 边界

- **DNS 在 GoDaddy，不在 Route53**，由 Shawn 管。要加新域名找他。
- `/srv/mocap-sample` 是 Matt（`mattsun`）的，`/srv/scene-sample` 是占位站 —— 都不归这个仓库管，别动。
- 这台机器**没有 staging 的 staging**。dev 站就是你的试验场，生产站是真的对客户开着的。
