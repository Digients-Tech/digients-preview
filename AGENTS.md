# Digients data preview portal

继承 `/Users/alex/Workspaces/digients/AGENTS.md`。本仓库维护具身视频数据的 `sample.digients.tech` / `dev.sample.digients.tech` 门户。

## 代码与数据入口

- `web/`：React + Vite + TypeScript。当前入口为 `App.tsx` → `components/L4Explorer.tsx`，默认全量视频网格、精选在前。`VideoCard.tsx` 只挂载可见视频，共用 IntersectionObserver；`SubtaskTimeline.tsx` 负责卡片与详情的分段时间轴；`EpisodeDetail.tsx` 用原生 dialog 管理放大详情、焦点恢复和标注加载；URL 的 `episode` / `t` / `view` 支持时刻分享，浏览器返回保留网格状态。
- `L4Player.tsx` 以 video frame callback 作为共享播放时钟，管理原视频/手部叠加和同步 3D；`PoseScene.tsx` 按需加载 Three.js，渲染真实头部/相机位姿及所有有效手部 track，保留 orbit/zoom/整段轨迹视角；`TemporalDetail.tsx` 提供 subtask/action 双分段时间轴与完整语义详情，点条播放；`SceneMemory.tsx` 常驻右栏，默认截至当前时刻，仅越过源时间戳时触发更新点。`L4Annotations.tsx` 保留为旧详情实现；`l4-core.ts` 管理时间、检索和记忆选择；`explorer.css` 管理样式。`PRODUCT.md` / `DESIGN.md` 记录产品与视觉约定。
- 原 taxonomy 页面组件（`TaxonomyBrowser.tsx`、`ScenarioPreview.tsx`、`CaptionPanel.tsx` 等）、`caption.ts` 与 `index.css` 保留为旧实现，当前 L4 页面不引用它们。
- L4 私有运行数据在 `L4_DATA_DIR`，本地默认 `data/l4-1x-20260921`。`server/src/l4.ts` 提供鉴权后的 catalogue、原始 JSON、Range 视频、poster、MANO 下载和 gzip 空间数据接口；不向前端提供 S3 凭据或签名 URL。
- `server/src/l4-gallery.ts` 从原始 L4 taxonomy 生成 industry/scene/task 与紧凑 subtask 索引，兼容已有 v1 catalogue；不能拿 L0 coarse category 冒充 L4 industry。缓存按 catalog mtime 刷新，一个数据版本内 captions 视为不可变。网格接口不展开完整 memory/动作正文；进入详情才请求单条原始 JSON。
- `server/scripts/prepare-l4-delivery.py` 从本地 L0/L4 和已读取的 S3 inventories 校验 ID/时间范围、生成检索目录，并保留原始 L4 字节。输出数据不进入 Git。`deploy/prepare-l4-media.py` 从 stdin 接收临时 GET URL，在独立 dev 数据目录下载、校验、生成 poster；不能记录 URL。
- `server/`：Hono + tsx。`src/index.ts` 定义路由；`data.ts` 校验并按 mtime 缓存 `catalog.json`；`videos.ts` 提供本地视频 Range、poster 和 caption；`auth.ts` 管理访问口令与会话。
- `catalog.json` 是实际展示目录；`curated.json` 是同步阶段的人工选样映射。`server/scripts/taxonomy-canon.json` 和 `gen-catalog-from-taxonomy.ts` 管理从 caption taxonomy 重建分类。先核对当前 catalogue 的生成来源，再选择同步或重建命令，避免意外重写目录。
- `deploy/spatial_payload.py` 把新 MANO v2 和 HaWoR camera fields 转成浏览器逐帧数据：`traj` 是 camera-to-world xyz+xyzw，相机 translation 乘 scale；MANO `joints_3d` 已含平移/左手镜像，不可再加 translation 或镜像。以首帧相机归一化，Rx(pi) 转为 y-up。保留 track ID/逐帧有效性，不插补缺失手、不补造身体或房间；`tests/spatial_payload_test.py` 用 dev Python 验证坐标变换。
- 当前分类保留人工挑选的 COS domain/scenario 树；提交 `4364a26` 已撤回按 caption taxonomy 自动分组。`gen:catalog` 工具保留但处于停用状态，不能作为例行重建步骤；只有明确要改变分类方案时才使用。
- `videos/`、`posters/`、`captions/` 是不进入 Git 的媒体/标注资产。克隆代码不包含真实预览数据。
- `sync-from-cos.ts` 读取腾讯 COS；`sync-handhead-s3.ts` 读取 AWS S3 的标注、手部和头部可视化；`gen-combos.ts` 合成手部/头部视频。页面默认优先播放 `comboFile`，标注仍由原始 `file` 的同名 JSON 定位。
- 标注适配同时支持旧版 `steps[].actions` 与新版顶层 `actions[]`。S3 原始 sidecar 与线上 caption 不保证是同一版本；重建或强制同步前对照实际在线文件、schema 和哈希，不能仅凭 UUID 相同就覆盖线上标注。

## 环境与验证

- Node.js + pnpm workspace；部署脚本使用 Node 22，pnpm 版本遵从根 `package.json` 的 `packageManager`。依赖使用 `pnpm install --frozen-lockfile`，不安装全局替代工具链。
- `pnpm dev`：Vite 5173 + API 8787；`pnpm typecheck` 检查两端；`pnpm build` 构建前端；`pnpm start` 启动 Hono；`pnpm test` 检查 L4 时间边界、双语检索和记忆条目筛选。浏览器验收需使用真实媒体，检查暂停/播放状态下切换视图、跳转、更换片段、窄屏和登录保护。
- 媒体生成需要现有 ffmpeg / ffprobe；一次性 Python 检查使用 `micromamba run -n dev python`。
- 一次性检查、下载和证据写入 `/Users/alex/Workspaces/tmp/digients_tmp/<task-name>/`。

## 数据与部署边界

- Digients AWS 凭据只使用上级约定的 `aws/` 配置；仓库脚本提到的“默认 AWS profile”不能授权读取本机 `~/.aws`。腾讯 COS 与 AWS S3 使用独立凭据及 endpoint，禁止把 Digients AWS key 传给 COS 的通用 AWS 环境变量 fallback。
- 数据同步脚本会写本地 catalogue 和媒体目录。只读检查时不要执行 `sync:*`、`gen:*` 或 `deploy/update.sh`。
- 正式站目录 `/opt/digients-preview`、服务 `digients-preview`、端口 8787；开发站目录 `/opt/digients-preview-dev`、服务 `digients-preview-dev`、端口 8788。部署身份是 `ubuntu`，操作前重新核对分支、未提交修改、端口和目标服务。
- 后续开发优先使用开发站。改媒体前必须检查 `videos/`、`posters/`、`captions/` 的真实路径和运行时覆盖项；开发站可能通过符号链接复用正式站资产，不能把开发站目录名当作数据隔离证明。
- L4 dev 通过 `/opt/digients-preview-releases/` 下的独立版本和 dev service drop-in 部署，数据独立放在 `/opt/digients-preview-data/`。保留旧 dev checkout 的未提交修改；部署和回退见 `deploy/L4-DEV.md`。
- `/etc/caddy/Caddyfile` 是线上多站配置；仓库 `deploy/Caddyfile` 是安装模板，不得覆盖线上配置。`wholebodysample` 和 `scene.sample` 是独立站点，具体职责见 `deploy/DEPLOY-GUIDE.md`。
- `POST /api/request-access` 会发邮件；只读页面检查不提交该表单。
