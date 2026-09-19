# 🔥 Eternal Flame | 守焰者

> **薪火不灭，荣耀永燃**
> 
> *The Flame Endures, The Glory Burns Eternal*

Eternal Flame 公会官方网站 —— 一个面向魔兽世界公会场景的对外展示、信息沉淀、招募审批与成员服务平台。

---

## 📖 项目概览

**项目代号**：`flamekeeper`（守焰者）
**正式站名**：Eternal Flame Guild Hub
**中文名**：守焰者
**Slogan**：薪火不灭，荣耀永燃
**定位**：对外公会官网 + 账号与审批系统 + 内容管理后台 + 数据分析看板 + 插件解释库

### 核心功能

| 功能模块 | 说明 |
| --- | --- |
| 信息发布 | 公告、新闻、战报、活动、招募、维护通知 |
| 入会指南 | 完整入会流程说明、招募要求、常见问题 |
| 公会介绍 | 公会故事、管理层、规则、荣誉墙 |
| 成员名册 | 成员列表（按职业着色）+ 引荐结构树形图 |
| 数据分析 | 职业分布、装等分布、团本进度可视化 |
| 插件库 | 精选插件推荐、WeakAuras 字符串、配置教程 |
| 活动日历 | 团本、大秘境、PVP 活动报名 |
| 媒体画廊 | 击杀截图、活动合照、视频集锦 |
| 账号系统 | 邮箱注册 + 邮箱验证、密码登录、入会审批 |
| 管理后台 | 官员专属的内容审核、数据维护、设置中心 |

### 权限模型

| 角色 | 可见范围 | 审批权 |
| --- | --- | --- |
| 游客 / 待审批用户 | 首页、信息发布、入会指南、公会介绍、画廊、联系我们 | ✗ |
| 公会成员 MEMBER | 上述 + 成员名册、结构图、工具分享、数据分析、活动日历 | ✓（任何成员都可审批） |
| 官员 OFFICER | 上述 + 管理后台、删除申请 | ✓ |
| 管理员 ADMIN | 全部 + 系统设置、邮件群发 | ✓ |

> 未通过审批的注册用户**与游客权限相同**，只能看到公开页面；登录后会引导到
> `/pending` 页面查看申请进度。审批通过者记录**引荐人**（即审批他的人），
> 在「成员名册 → 结构图」中以树形展示。

---

## 🚀 技术栈

| 类别 | 选型 | 版本 |
| --- | --- | --- |
| 框架 | [Next.js](https://nextjs.org/) (App Router) | 16.3 |
| 语言 | TypeScript | 5.x |
| UI 库 | React | 19.x |
| 样式 | Tailwind CSS | 4.x |
| 数据库 | SQLite（生产可用 Postgres 替换） | — |
| ORM | Prisma | 6.x |
| 认证 | NextAuth.js (Auth.js v5) | beta |
| 密码哈希 | bcryptjs | 2.x |
| 表单校验 | Zod | 3.x |
| 图表 | Recharts | 2.x |
| 图标 | lucide-react | latest |
| 容器化 | Docker + Docker Compose | — |

**架构特点**

- **Next.js 16 App Router**：服务器组件 + 客户端组件混合，SEO 友好，首屏快
- **Prisma + SQLite**：零运维成本部署；schema 设计兼容 Postgres，可一键切换
- **NextAuth.js (JWT session)**：邮箱+密码认证，无外部依赖
- **Tailwind CSS 4 自定义主题**：基于 WoW 设计 Token（金色/橙色/职业色），统一视觉
- **Canvas 粒子背景**：火焰余烬动画，营造艾泽拉斯氛围

---

## 📦 项目结构

```
flamekeeper/
├── prisma/
│   ├── schema.prisma            # 数据库 schema（参考 PLAN.md 数据模型）
│   ├── seed.mjs                 # 初始化 admin 账号 + 邮件配置 + 默认数据
│   ├── init-db.mjs              # 容器启动时建表（无需 Prisma CLI）
│   ├── init.sql                 # 由 schema 生成的 SQLite DDL
│   └── dev.db                   # SQLite 数据库（开发环境）
├── public/                      # 静态资源
├── src/
│   ├── app/
│   │   ├── api/                 # API 路由（auth/register, posts, addons 等）
│   │   ├── auth/                # 登录、注册、忘记密码
│   │   ├── admin/               # 管理后台（官员/管理员）
│   │   ├── news/[slug]/         # 文章详情
│   │   ├── guide/               # 入会指南
│   │   ├── about/               # 公会介绍
│   │   ├── roster/              # 成员名册
│   │   ├── analytics/           # 数据分析
│   │   ├── addons/              # 插件库
│   │   ├── events/              # 活动日历
│   │   ├── gallery/             # 媒体画廊
│   │   ├── contact/             # 联系我们
│   │   ├── profile/             # 个人中心
│   │   ├── layout.tsx           # 全局布局（含 Header/Footer/粒子背景）
│   │   ├── page.tsx             # 首页
│   │   ├── globals.css          # Tailwind 全局样式与 WoW 主题
│   │   └── not-found.tsx        # 404 页面
│   ├── components/
│   │   ├── layout/              # Header、Footer、SceneBackground
│   │   ├── providers.tsx        # SessionProvider + Toaster
│   │   └── admin/               # 管理后台占位组件
│   ├── lib/
│   │   ├── prisma.ts            # Prisma 单例
│   │   ├── auth.ts              # NextAuth 配置
│   │   ├── utils.ts             # cn()、日期格式化、WoW 职业色映射
│   │   ├── validations.ts       # Zod schema
│   │   └── auth-utils.ts        # 角色权限工具函数
│   ├── styles/
│   │   └── globals.css          # WoW 设计 Token + Tailwind
│   └── types/                   # TypeScript 类型
├── Dockerfile                   # 多阶段构建（builder + runner）
├── docker-compose.yml           # 一键启动 + 数据卷持久化
├── .dockerignore
├── .env.example
├── package.json
├── next.config.ts               # standalone output
├── tailwind.config / postcss.config
├── PLAN.md                      # 项目定案（来自原始需求）
└── README.md                    # 本文件
```

---

## 🎨 设计语言

**WoW 暗黑公会风**：参考魔兽世界的 UI 配色与美术风格，营造「公会大厅」的庄严感。

### 视觉系统

- **主色调**：`#F0B823`（金色）作为品牌色与 CTA 按钮色
- **辅色**：`#FF7D0A`（火焰橙）作为强调色，`#C41E3A`（部落红）/`#0070DE`（联盟蓝）作为阵营色
- **背景**：深黑 `#0A0A0A` → `#1A1A1E`，叠加 canvas 粒子余烬动画
- **字体**：[Cinzel](https://fonts.google.com/specimen/Cinzel)（展示字体，西方古典风）+ Noto Sans SC（正文，中文优化）
- **职业配色**：13 个职业各对应一个高识别度颜色（参考 WoW 职业色板）

### 主题 Token

所有颜色/字体/阴影定义在 `src/styles/globals.css` 的 `@theme` 中，方便二次定制。

---

## 🛠️ 快速开始

### 方式一：本地开发（Node 24）

需要本机 Node.js 24.x 与 npm 11+。

```bash
# 1. 克隆项目
git clone <repo-url> flamekeeper
cd flamekeeper

# 2. 安装依赖
npm install

# 3. 初始化环境变量
cp .env.example .env
# 默认 SQLite 文件位于 prisma/dev.db

# 4. 初始化数据库 + 种子数据
npm run db:push       # 创建表
npm run db:seed       # 创建初始 admin 账号 + 邮件配置

# 5. 启动开发服务器
npm run dev
```

打开浏览器访问 http://localhost:3000

> **初始管理员账号**：`flamekeeper_admin@163.com` / `flamekeeper#110`
> 该 163 邮箱同时作为系统发信账号（SMTP）。**首次登录后请立即修改密码，并到邮件服务商申请「授权码」替换 SMTP 密码**。

### 方式二：Docker 部署（推荐生产）

适用于 Linux 服务器、NAS、群晖、Portainer 等环境。

```bash
# 1. 构建并启动
docker compose up -d --build

# 2. 查看日志
docker compose logs -f flamekeeper

# 3. 访问
# http://<server-ip>:3000
```

Docker 自动完成以下操作：
- 多阶段构建，镜像体积小（约 200MB）
- 启动时自动执行 `prisma db push`（首次启动会建表）
- 数据库文件通过 named volume `flamekeeper-data` 持久化
- 健康检查 + 自动重启

#### 自定义环境变量

在 `docker-compose.yml` 同目录创建 `.env` 文件（或修改 `docker-compose.yml`）：

```env
AUTH_SECRET=<随机生成的 32 位字符串>
AUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

**生成 AUTH_SECRET**：
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> ⚠️ **生产环境务必修改初始 admin 密码！** 推荐直接在网页「个人中心 → 修改密码」操作；
> 也可进入容器执行（无需 tsx）：
> ```bash
> docker compose exec flamekeeper node --input-type=module -e "
>   import { PrismaClient } from '@prisma/client';
>   import bcrypt from 'bcryptjs';
>   const p = new PrismaClient();
>   const h = await bcrypt.hash('新密码', 12);
>   await p.user.update({ where: { email: 'flamekeeper_admin@163.com' }, data: { passwordHash: h } });
>   console.log('密码已更新');
>   await p.\$disconnect();
> "
> ```

### 邮件服务（SMTP 发信）

系统通过 **SMTP** 发信，用于两件事：

1. **注册邮箱验证** —— 用户注册后必须点击邮件中的链接完成确认，才能登录并进入审批流程；
2. **会员群发** —— 管理员在「管理后台 → 邮件群发」按角色给成员群发通知。

**配置入口**：`管理后台 → 系统设置 → 邮件服务`

| 字段 | 说明 | 163 示例 |
| --- | --- | --- |
| SMTP 主机 | 发信服务器 | `smtp.163.com` |
| 端口 | 465=SSL，587=STARTTLS | `465` |
| 发信账号 | 完整邮箱地址 | `flamekeeper_admin@163.com` |
| 密码 / 授权码 | **163 必须填「授权码」**，不是登录密码 | 在网易邮箱设置中开启 SMTP 后获取 |
| 加密方式 | SSL/TLS 或 STARTTLS | SSL/TLS |
| 发件人显示名 | 邮件里显示的名字 | `Eternal Flame 守焰者` |

> 💡 163/126 邮箱需要在网页版「设置 → POP3/SMTP/IMAP」中**开启 SMTP 服务并生成授权码**，
> 然后把授权码填入「密码 / 授权码」字段。直接用登录密码会认证失败。

保存后可用「测试连接」和「发送测试邮件」验证；配置也可通过环境变量注入（`SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM_NAME`），
环境变量在数据库中无对应设置时生效。

**群发**：`管理后台 → 邮件群发` —— 选择收件人群组（注册用户 / 公会成员 / 官员 / 管理员），
可勾选「仅发送给已验证邮箱的账号」，发送结果会列出成功/失败明细（单次上限 300 人）。

### 方式三：Portainer / 容器面板部署

1. 在 Portainer 中选择 `Stacks` → `Add stack`
2. 将 `docker-compose.yml` 内容粘贴进去
3. 设置环境变量
4. 部署即可

### 方式四：CI/CD 自动构建（GitHub Actions → 阿里云 ACR）

工作流：`.github/workflows/docker-publish.yml`

**触发条件**：推送到 `main`、推送 `v*` tag、或在 Actions 页面手动触发。

**推送目标**：
```
crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com/thisnew/flamekeeper:latest
crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com/thisnew/flamekeeper:git-<commit-sha>
crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com/thisnew/flamekeeper:<分支名|tag>
```

**启用前置步骤**：在 GitHub 仓库 `Settings → Secrets and variables → Actions` 添加两个 Secret：

| Secret | 说明 |
| --- | --- |
| `ALIYUN_ACR_USERNAME` | 阿里云容器镜像服务的登录用户名（阿里云账号名或 ACR 访问凭证用户名） |
| `ALIYUN_ACR_PASSWORD` | 对应密码（ACR 控制台设置的固定密码，**不是**登录阿里云的密码） |

**要点说明**（与 cms-light 保持一致）：

- 使用 `docker/build-push-action@v6` + `buildx`（`driver: docker-container`）
- **`provenance: false` / `sbom: false`** —— 阿里云 ACR 个人版不支持 OCI attestation 媒体类型，开启会导致推送失败
- 构建缓存用 GitHub Actions cache（`type=gha,mode=max`），因此 workflow 需要 `actions: write` 权限
- 镜像为 `linux/amd64`；若要跑在 ARM 设备上，需自行加 `platforms:` 并改用多架构构建

**服务器拉取运行**：
```bash
docker login crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com -u <用户名>
docker pull crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com/thisnew/flamekeeper:latest
```

### 切换到 PostgreSQL（可选）

如需多人协作或更高并发，可在 `prisma/schema.prisma` 修改 `datasource`：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

并修改 `.env`：
```env
DATABASE_URL="postgresql://user:pass@host:5432/flamekeeper?schema=public"
```

---

## 📋 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（端口 3000） |
| `npm run build` | 生产构建（standalone output） |
| `npm start` | 启动生产服务器 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 推送 schema 到数据库 |
| `npm run db:studio` | 打开 Prisma Studio（GUI 数据查看） |
| `npm run db:seed` | 填充种子数据（初始 admin + 邮件配置） |

---

## 🗺️ 路线图

依据 [PLAN.md](./PLAN.md) 的功能优先级：

### ✅ 已完成（P0 — MVP）

- [x] 项目脚手架（Next.js 16 + TS + Tailwind 4）
- [x] WoW 主题系统（金色/职业色/火焰粒子）
- [x] 数据库 schema（15 个模型，参考 PLAN 数据模型）
- [x] 账号系统：邮箱+密码、bcrypt 哈希
- [x] 入会注册流程（含角色资料、自动生成申请编号）
- [x] 首页（Hero、统计、新闻预览、公会介绍 CTA）
- [x] 入会指南（流程、招募要求、FAQ）
- [x] 公会介绍（故事、管理层、规则）
- [x] 信息发布列表 + 详情
- [x] 成员名册（13 职业着色）
- [x] 插件库、活动日历、数据分析、画廊、联系页（基础版）
- [x] 管理后台骨架（官员/管理员角色控制）
- [x] Docker 多阶段构建 + 健康检查 + 数据卷
- [x] README + LICENSE

### ✅ 已完成（P1 — 重要增强）

- [x] **申请审批完整流程**：通过/拒绝/需补充信息（官员操作、自动升级用户角色、写入审计日志）
- [x] **文章编辑器**：Markdown 编辑 + 封面图 + 分类 + 置顶 + 标签 + 发布/下线切换
- [x] **Recharts 真实数据图表**：职能饼图、职业饼图、装等柱状图（自动从成员数据生成）
- [x] **工具分享专栏**：`/tools` 双标签（插件分享 + 成员发布的「其他分享」）
- [x] **入会审批**：任何已入会成员均可审批（通过/拒绝/需补充信息），审批人自动成为新成员的**引荐人**
- [x] **引荐结构树**：成员名册新增「结构图」标签，自上而下展示引荐关系，节点可折叠（魔兽风格）
- [x] **成员发布分享**：审批通过的成员可发布 Markdown 分享并上传 ≤10MB 附件
- [x] **插件详情页**：`/tools/addon/[slug]` 含一键复制 WA 字符串
- [x] **活动管理**：创建/删除活动（带起止时间、名额、地点、类型）
- [x] **媒体画廊管理**：图床 URL 上传、相册分类、缩略图预览
- [x] **成员名册 CRUD**：添加/编辑/删除角色（管理员可批量录入）
- [x] **系统设置**：KOOK 邀请链接、微信二维码、招募状态、官员邮箱、SMTP 等
- [x] **修改密码**：个人中心可改密（bcrypt 加固）
- [x] **个人申请查询**：用户登录后可查看自己的入会申请状态
- [x] **审计日志**：审批、修改密码、群发邮件等关键操作留痕
- [x] **邮件服务**：SMTP 发信配置后台 + 注册邮箱验证（未验证不可登录）+ 会员群发
- [x] **入会申请删除**：官员可删除申请记录（带审计日志）

### 🚧 待办（P2 — 进阶）

- [ ] 密码重置邮件（忘记密码流程）
- [ ] 活动报名（带替补机制）
- [ ] 附件可选 S3 / 对象存储适配器
- [ ] WCL / Raider.IO 数据同步
- [ ] KOOK 机器人通知
- [ ] 多语言（i18n）
- [ ] 评论/反馈
- [ ] 直播聚合

---

## 🔐 安全建议

部署到生产环境前，请务必完成以下检查：

- [ ] 修改 `AUTH_SECRET` 为随机 32+ 位字符串
- [ ] 修改初始 admin 账号密码（`flamekeeper_admin@163.com` 的默认密码）
- [ ] 更换 SMTP 密码为邮箱服务商提供的**授权码**，不要使用邮箱登录密码
- [ ] 如启用 HTTPS，配置反向代理（Nginx / Caddy）
- [ ] 定期备份数据卷：`flamekeeper-data`（数据库）与 `flamekeeper-uploads`（成员附件）
- [ ] 配置防火墙，仅暴露 80/443 端口
- [ ] （可选）启用 Cloudflare 等 CDN 防 DDoS

---

## 🌐 部署场景参考

| 场景 | 推荐方式 |
| --- | --- |
| 本地开发 | `npm run dev` |
| NAS（群晖/威联通） | Docker Compose + Portainer |
| 自建服务器 | Docker Compose + Nginx 反向代理 |
| 家用路由器 + 小主机 | Docker Compose + 内网穿透（frp） |
| 云服务器（VPS） | Docker Compose + Caddy/Nginx + Let's Encrypt |
| Serverless | 暂不支持（需改为 Vercel/Cloudflare Pages 适配方案） |

---

## 📝 数据模型一览

参考 PLAN.md 第九节，主要模型：

- `User` —— 账号、邮箱、密码、角色、状态
- `Profile` —— 用户档案
- `Application` —— 入会申请（含申请编号、审核状态）
- `Post` —— 信息发布（分类/置顶/标签）
- `Page` —— 静态页面（公会介绍等）
- `Character` —— 魔兽角色（关联用户）
- `RaidProgress` —— 团本进度
- `AnalyticsSnapshot` —— 分析快照
- `Addon` —— 插件（分类/WA 字符串）
- `Event` + `EventSignup` —— 活动与报名
- `Media` —— 图片与视频
- `Setting` —— 系统设置（KOOK 链接、微信二维码等）
- `AuditLog` —— 管理操作日志

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m 'feat: add something'`
4. 推送分支：`git push origin feat/your-feature`
5. 提交 Pull Request

### 开发约定

- TypeScript strict 模式
- 优先使用 Server Components，必要时使用 `"use client"`
- 不使用 Lombok（这是 Java 约定，但 TS 项目中请用 TypeScript 原生类型）
- 业务异常抛 `Error`，在 API 路由统一处理
- API 返回统一 JSON 格式：`{ success: boolean, data?: T, error?: string }`

---

## 📜 版权声明

- **本项目代码**：MIT 许可证
- **魔兽世界（World of Warcraft）**：暴雪娱乐（Blizzard Entertainment）注册商标
- **本项目与暴雪娱乐、网易公司无任何关联**，仅为公会社区工具

---

## 🔥 守焰者的誓言

```
薪火不灭，荣耀永燃。
我们是火焰的守护者，
也是彼此的战友。

在艾泽拉斯的每一个日夜里，
我们并肩作战，守护彼此。

For the Eternal Flame!
```

---

**For the Eternal Flame!** 🔥