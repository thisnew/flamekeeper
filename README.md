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
| 信息发布 | 公告、新闻、战报、活动、招募、维护通知 + 成员评论（可配置先审后发） |
| 入会指南 | 完整入会流程说明、招募要求、常见问题 |
| 公会介绍 | 公会故事、管理层、规则、荣誉墙 |
| 成员名册 | 成员列表（按职业着色）+ 引荐结构树形图 |
| 数据分析 | 职业分布、装等分布、团本进度可视化 |
| 工具分享 | 插件库（含 WeakAuras 字符串一键复制）+ 成员发布的攻略分享（可传附件） |
| 活动日历 | 团本、大秘境、PVP 活动的报名、替补队列、出勤标记、名单导出（CSV）与 `.ics` 日历订阅 |
| 媒体画廊 | 击杀截图、活动合照、视频集锦 |
| 账号系统 | 邮箱注册 + 邮箱验证、密码登录、找回密码（邮件一次性链接）、入会审批 |
| 角色管理 | 个人中心**上传游戏 WTF 配置**并保存为个人档案；自动识别 账号/服务器/角色，最多 5 个账号 / 20 个角色，可排序、可打包导出 zip |
| 管理后台 | 官员专属的内容审核、数据维护、设置中心 |
| 公会数据更新 | 管理员手动抓取**国服服务器字典**（中文名 ↔ 英文 slug）存本地，供其它功能查表 |

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

### 会阶（公会内部身份）

与上面的系统权限是**两个独立维度**：

| | 取值 | 作用 |
| --- | --- | --- |
| `role` | VISITOR / USER / MEMBER / OFFICER / ADMIN | **能不能**进后台、改设置 |
| `guildRank` | 会长 / 团长 / 核心 / 成员 | 在公会里**是什么身份**（展示） |

> ⚠️ **管理员 ≠ 会长**。管理员是站点超级管理员，会长是一个会阶 ——
> 一个人可以同时是两者，也可以只是其中之一。
> （早期代码把 `ADMIN` 直接显示成「会长」，那是错的，已修正。）
>
> 会阶与引荐关系由**管理员**在 `后台 → 成员与会阶` 调整；官员可查看但不能改。
> 调整引荐人时会做**防环校验** —— 否则「结构图」的递归渲染会无限循环。

### 入会流程与三种审批结果

```
注册（只填 邮箱 + 昵称 + 密码）
  └─ 发验证邮件 → 未验证不能登录
       └─ 验证后进入待审批（任何成员都可审批）
            ├─ 通过   → role 升为 MEMBER，审批人自动成为引荐人
            ├─ 需补充 → 状态 NEEDS_INFO，账号保留，等对方重新提交
            └─ 驳回   → **等同注册失败**：账号注销、邮箱释放，
                        并邮件通知对方「可重新注册」
```

> **注册不再收集游戏信息**（角色名/服务器/阵营/职业/专精等）—— 只填昵称。
> 玩家角色改由「个人中心 → 角色管理 → 从 WTF 导入」产生，入会时无需先有角色。
> 因此审批通过时**也不再自动创建角色**。
>
> ⚠️ 驳回会**删除账号**（`Application` 随外键级联清除），所以：
> - 审计日志挂在**审批人**身上，对方邮箱写在 `detail` 里 —— 目标账号已不存在，
>   不能再作为外键引用；
> - 同一个邮箱之后可以**重新注册**。
>
> ⚠️ 权限变更（通过/驳回/改会阶）**下次请求即生效**，无需退出重登 ——
> `jwt` 回调每次都会从数据库刷新 `role`/`status`。

---

## 🚀 技术栈

| 类别 | 选型 | 版本 |
| --- | --- | --- |
| 框架 | [Next.js](https://nextjs.org/) (App Router, Turbopack) | 16.3 |
| 语言 | TypeScript | 7.x |
| UI 库 | React | 19.3 |
| 样式 | Tailwind CSS（CSS-first `@theme`） | 4.3 |
| 数据库 | PostgreSQL | 16 |
| ORM | Prisma | 6.19 |
| 认证 | NextAuth.js (Auth.js v5) — JWT session | 5.0.0-beta |
| 密码哈希 | bcryptjs | 2.x |
| 表单校验 | Zod | 3.x |
| 图表 | Recharts | 3.x |
| 发信 | Nodemailer（SMTP） | 7.x |
| 轻提示 | react-hot-toast | 2.x |
| 轮播 | Swiper | 12.x |
| 图标 | lucide-react | 0.562 |
| 容器化 | Docker + Docker Compose | — |

> Recharts 需为 **3.x**：2.x 在 React 19 下会抛
> `Super expression must either be null or a function`（详见 `components/analytics/`）。

**架构特点**

- **Next.js 16 App Router**：服务器组件 + 客户端组件混合，SEO 友好，首屏快
- **Prisma + PostgreSQL**：并发/一致性有保障，dev 与 prod 使用同一套 schema，行为一致
- **NextAuth.js（JWT session）**：邮箱 + 密码认证，**未接线 Prisma adapter**，会话不落库
- **Tailwind CSS 4 自定义主题**：基于 WoW 设计 Token（金色/橙色/职业色），统一视觉
- **Canvas 粒子背景**：火焰余烬动画，营造艾泽拉斯氛围

---

## 📦 项目结构

```
flamekeeper/
├── prisma/
│   ├── schema.prisma            # 数据库 schema（17 个模型）
│   ├── seed.mjs                 # 初始 admin + 系统设置 + 欢迎公告（幂等、只补缺失值）
│   ├── demo-data.mjs            # 演示成员 + 3 层引荐树（npm run db:demo）
│   ├── init-db.mjs              # 容器启动时建表（镜像内无 Prisma CLI）
│   ├── init.sql                 # 由 schema 生成（构建期产物，不入库）
│   ├── secrets.mjs              # AES-256-GCM 加解密（seed 与 web 共用一份实现）
│   ├── db-url.mjs               # DATABASE_URL 生成 / 百分号编码
│   ├── db-sync.mjs              # 从 POSTGRES_* 重新派生 DATABASE_URL
│   └── predev.mjs               # `npm run dev` 前置：建表 + 补初始数据
├── public/
│   └── uploads/                 # 成员附件（<=10MB，运行期写入）
├── src/
│   ├── app/
│   │   ├── api/                 # API 路由（auth / posts / events / upload / health ...）
│   │   │                        #   auth 下含 forgot-password、reset-password
│   │   │                        #   events 下含 signup（报名/替补/出勤）、export（CSV）、
│   │   │                        #     ics（日历订阅）、ics-key（查看/轮换订阅密钥）
│   │   │                        #   comments（发表 / 审核 / 删除）
│   │   │                        #   admin/members（会阶与引荐关系，仅管理员可改）
│   │   ├── admin/               # 管理后台（posts, applications, roster, members, addons,
│   │   │                        #   events, gallery, comments, settings, mail）
│   │   ├── auth/                # login, register, verify-email,
│   │   │                        #   forgot-password, reset-password
│   │   ├── apply/               # 入会申请表单
│   │   ├── pending/             # 待审批成员落地页
│   │   ├── news/[slug]/         # 信息发布列表 + 详情
│   │   ├── tools/               # 工具分享（插件库 + 成员分享）
│   │   ├── roster/              # 成员名册 + 引荐结构树
│   │   ├── analytics/           # 数据分析（Recharts）
│   │   ├── events/              # 活动日历
│   │   ├── gallery/             # 媒体画廊
│   │   ├── guide/  about/  contact/  profile/
│   │   ├── layout.tsx           # 全局布局（Header/Footer/粒子背景，服务端取 session）
│   │   ├── page.tsx             # 首页
│   │   └── not-found.tsx        # 404
│   ├── components/
│   │   ├── admin/               # 后台各模块的客户端组件
│   │   ├── analytics/           # 图表（"use client"，隔离 recharts）
│   │   ├── auth/                # 重置密码表单等
│   │   ├── comments/            # 文章评论区
│   │   ├── profile/             # 角色管理（WTF 导入 / 排序）
│   │   ├── events/              # 活动卡片（报名 / 替补 / 出勤 / 导出）+ 日历订阅面板
│   │   ├── guild/  home/  news/  tools/  ui/
│   │   ├── layout/              # Header、Footer、UserMenu、SceneBackground
│   │   └── providers.tsx        # SessionProvider + Toaster
│   ├── lib/
│   │   ├── prisma.ts            # Prisma 单例
│   │   ├── auth.ts              # NextAuth 配置
│   │   ├── roles.ts             # 角色判定纯函数（服务端安全）
│   │   ├── page-guard.ts        # requireMember / requireOfficer / requireAdmin
│   │   ├── mailer.ts            # SMTP 发信（含 smtp_pass 解密）+ 邮件模板
│   │   ├── password-reset.ts    # 重置令牌的生成/摘要/校验/限流
│   │   ├── event-signup.ts      # 报名/替补/出勤 的状态机与补位逻辑
│   │   ├── wtf.ts               # WTF 目录解析（账号/服务器/角色名）+ 过滤与配额常量
│   │   ├── wtf-storage.ts       # WTF 文件的私有存储（路径穿越防护 / 读写 / 打包）
│   │   ├── realms.ts            # 国服服务器字典：抓取/解析/落库/查表（中文名 ↔ 英文 slug）
│   │   ├── ics.ts               # iCalendar 生成（按字节折行 + RFC 5545 转义）
│   │   ├── calendar-feed.ts     # 日历订阅密钥的生成/校验/轮换
│   │   ├── datetime.ts          # 统一时间格式化（显式时区，避免 hydration mismatch）
│   │   ├── secrets.ts           # 加解密的类型化再导出（实现见 prisma/secrets.mjs）
│   │   ├── comments.ts          # 评论的审核开关与内容规范化
│   │   ├── guild-rank.ts        # 会阶常量/标签/排序（与系统权限解耦）
│   │   ├── app-url.ts           # 站点对外地址（拼邮件绝对链接）
│   │   ├── auth-utils.ts        # 客户端角色判断（useIsAdmin 等）
│   │   ├── validations.ts       # Zod schema
│   │   └── utils.ts             # cn()、日期格式化、WoW 职业色映射
│   └── styles/
│       └── globals.css          # WoW 设计 Token（Tailwind 4 @theme）+ 全局样式
├── .github/workflows/
│   └── docker-publish.yml       # CI：构建镜像 → 推送阿里云 ACR
├── Dockerfile                   # 多阶段构建（builder + runner）
├── docker-compose.yml           # 部署：拉取 ACR 镜像 + 数据卷持久化
├── docker-compose.build.yml     # 可选 override：在部署机上本地构建
├── .dockerignore  .env.example  package.json
├── next.config.ts               # standalone output
├── postcss.config.mjs           # Tailwind 4（无需 tailwind.config）
├── PLAN.md                      # 项目定案（来自原始需求）
└── README.md                    # 本文件
```

> 注：Tailwind 4 采用 CSS-first 配置，主题 Token 全部写在
> `src/styles/globals.css` 的 `@theme` 中，**没有** `tailwind.config.*` 文件。

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

# 4. 启动 PostgreSQL（compose 里的 db 服务，宿主机 5432 端口）
docker compose up -d db

# 5. 启动开发服务器（自动建表 + 写入初始数据）
npm run dev
```

打开浏览器访问 http://localhost:3000

首次启动时终端会依次输出：

```
> flamekeeper@0.1.0 predev
> node prisma/predev.mjs
🔎 检查数据库表结构（prisma db push）...
🚀  Your database is now in sync with your Prisma schema.
🌱 补齐初始数据（admin 账号 / 系统设置 / 欢迎公告）...
✅ Database seeded successfully!
   Admin email:    flamekeeper_admin@163.com
> flamekeeper@0.1.0 dev
> next dev -H 0.0.0.0 -p 3000
```

**默认账号**（首次启动自动创建，登录后请立即改密码）：

| 项 | 值 |
| --- | --- |
| 管理员邮箱 | `flamekeeper_admin@163.com`（可用 `ADMIN_EMAIL` 覆盖） |
| 密码 | `flamekeeper#110`（可用 `ADMIN_PASSWORD` 覆盖） |
| 权限 | `ADMIN` / 邮箱已验证 / 已通过审批 |

> 💡 **初始化是自动且幂等的**：`npm run dev` 会先执行 `predev`，依次跑
> `prisma db push`（建表/同步表结构）和 `prisma/seed.mjs`（补齐缺失的
> 初始数据）。所以新克隆的仓库**不需要**手动跑 `db:push` / `db:seed`。
>
> 两者都不会破坏既有数据：`db push` 只做增量变更；`seed` **只填缺失值，
> 不会覆盖你在后台改过的设置**，也不会重复创建账号。因此每次启动都跑是安全的。
>
> 建表失败会**中止启动**并给出排查清单（数据库不可达 / URL 编码错误）。
> 只想起前端预览：`SKIP_DB_PUSH=1 npm run dev`
> （Windows PowerShell：`$env:SKIP_DB_PUSH=1; npm run dev`）
>
> 注意：只有 Docker 与本地 `npm run dev/start` 会自动初始化；
> 单独执行 `next dev` 或 `node server.js` 不会。

> **初始管理员账号**：`flamekeeper_admin@163.com` / `flamekeeper#110`
> 该 163 邮箱同时作为系统发信账号（SMTP）。**首次登录后请立即修改密码，并到邮件服务商申请「授权码」替换 SMTP 密码**。

> 💡 想快速看到「成员名册 → 结构图」的引荐树效果，可执行 `npm run db:demo`
> （创建 9 个演示成员，密码统一 `demo12345`；清理用 `npm run db:demo:clean`）

### 方式二：Docker 部署（推荐生产）

适用于 Linux 服务器、NAS、群晖、Portainer 等环境。

> **默认是「拉镜像」模式，不是「本地构建」模式。**
>
> 镜像由 GitHub Actions 构建好推到阿里云 ACR（见方式四），
> `docker-compose.yml` 里写的是 `image:` 而非 `build:`，所以部署只做
> `docker pull`。这样部署机上**不跑 npm ci / prisma generate / next build**，
> 速度从「5–15 分钟」降到「几秒到几十秒」。
>
> 为什么不在部署机上构建：`Dockerfile` 的 `npm ci --ignore-scripts` 会跳过
> `@prisma/engines` 的 postinstall（引擎下载），于是 `npx prisma generate`
> 必须在**构建期**从 `binaries.prisma.sh` 现下载约 40MB 引擎二进制。
> 国内网络上这一步极易超时 / `ECONNRESET`，症状是构建**长时间卡在
> `npx prisma generate`**。CI 的 runner 网络正常，把这活儿放那边做更稳。

```bash
# 1. 拉取镜像并启动
docker compose up -d

# 2. 查看日志
docker compose logs -f flamekeeper

# 3. 访问
# http://<server-ip>:3000
```

**需要本地构建时**（例如 ACR 里还没有镜像）：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

> 若构建卡在 `prisma generate`，用国内镜像源：
> ```bash
> docker compose -f docker-compose.yml -f docker-compose.build.yml \
>   build --build-arg PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
> ```

固定到某个具体版本（便于回滚）：

```bash
FLAMEKEEPER_IMAGE=crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com/thisnew/flamekeeper:git-<sha> \
  docker compose up -d
```

Docker 自动完成以下操作：
- **PostgreSQL 16** 作为独立 `db` 容器，数据存于 named volume `flamekeeper-pgdata`
- 应用等待 `db` 健康检查通过后才启动（`depends_on: condition: service_healthy`）
- 启动时由 `prisma/init-db.mjs` 建表（DDL 在构建阶段由 schema 生成）、`prisma/seed.mjs` 写入初始数据
- 成员附件存于 `flamekeeper-uploads` 卷
- **WTF 上传文件存于 `flamekeeper-storage` 卷**（挂到 `/app/storage`）。
  刻意**不放在 `public/` 下** —— `public` 里的文件可被 URL 直接访问，
  而 SavedVariables 常含插件 token、好友/公会名单，只有本人能经鉴权路由下载。
- 应用健康检查：`GET /api/health`（200 = 存活；`?deep=1` 加跑 `SELECT 1` 检查 DB），失败 503
- 自动重启

#### 自定义环境变量

最终访问地址：**`https://www.h83c4578f.nyat.app:22247`** —— **注意带端口 `:22247`**。
已写入 `docker-compose.yml`、`.env.example`、`Dockerfile` 与 CI 的默认值。

> ⚠️ **换域名 / 换端口时，必须区分两种变量**：
>
> | 变量 | 何时生效 | 作用 |
> | --- | --- | --- |
> | **`AUTH_URL`** | ✅ **运行时** | NextAuth 登录跳转、邮件里的验证/重置链接、日历订阅地址 |
> | `NEXT_PUBLIC_APP_URL` | ❌ **只能构建期** | `metadataBase`、OpenGraph 绝对 URL |
>
> `NEXT_PUBLIC_*` 会被 Next.js 在**构建期**替换成字面量（服务端产物也一样 ——
> 实测 243 个 server chunk 里搜不到这个变量名）。所以**部署时改它没有任何效果，
> 必须重新构建镜像**。真正能在运行时改的是 `AUTH_URL`。

在 `docker-compose.yml` 同目录创建 `.env`：

```env
# 鉴权 + 对外地址（必须与反向代理 / NAT 映射一致，含端口）
AUTH_SECRET=<随机生成的 32 位字符串>
AUTH_URL=https://www.h83c4578f.nyat.app:22247
NEXT_PUBLIC_APP_URL=https://www.h83c4578f.nyat.app:22247

# ⚠ 容器用的是 compose 里的 PUBLIC_ORIGIN（默认即上面的地址）。
#   刻意不复用 AUTH_URL：compose 会自动读取本文件做 ${} 插值，
#   若 compose 写 ${AUTH_URL:-…}，本地开发的 localhost:3000 就会被注进容器。
# 要让容器指向别处：PUBLIC_ORIGIN=https://other.example.com

# PostgreSQL（容器内）
POSTGRES_USER=flamekeeper
POSTGRES_PASSWORD=<强密码>
POSTGRES_DB=flamekeeper

# LAN 数据库（本例 192.168.3.80）—— 覆盖 DATABASE_URL，跳过容器内 db 服务
DATABASE_URL=postgresql://flamekeeper:<DB_PW>@192.168.3.80:5432/flamekeeper?schema=public
# → 启动前禁用 compose 里的 db 服务（注释或注释掉），
#   否则 app 仍会被 depends_on: db 健康检查阻塞

# 初始 admin 账号
ADMIN_EMAIL=flamekeeper_admin@163.com
ADMIN_PASSWORD=<change-this-strong-password>

# SMTP（163 使用授权码，不是登录密码）
SMTP_HOST=smtp.163.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=flamekeeper_admin@163.com
SMTP_PASS=<授权码>
SMTP_FROM_NAME=Eternal Flame 守焰者
```

**数据库目标服务器**：`192.168.3.80`（如上覆盖 `DATABASE_URL` 指向该 LAN 主机）。
本机开发时默认连 compose 内的 `db` 服务（`127.0.0.1:5432`）。

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

> 🔐 **授权码加密存储**：`smtp_pass` 写入数据库时用 `AUTH_SECRET` 派生的密钥做
> **AES-256-GCM** 加密（格式 `v1:<iv>:<tag>:<ciphertext>`）。拿到数据库文件也看不到明文。
> 旧版本遗留的明文记录会在首次读取时自动升级为密文。
> 注意：**更换 `AUTH_SECRET` 会导致已存密文无法解密**，需在后台重新填写一次授权码。

**群发**：`管理后台 → 邮件群发` —— 选择收件人群组（注册用户 / 公会成员 / 官员 / 管理员），
可勾选「仅发送给已验证邮箱的账号」，发送结果会列出成功/失败明细（单次上限 300 人，可用 `MAIL_BULK_MAX_RECIPIENTS` 调整）。

### 方式三：Portainer / 容器面板部署

1. 在 Portainer 中选择 `Stacks` → `Add stack`
2. 将 `docker-compose.yml` 内容粘贴进去
3. 设置环境变量
4. 部署即可

> ⚠ **ACR 是私有仓库，Portainer 必须先登录**，否则拉取会报
> `unauthorized: authentication required`。
>
> `Registries` → `Add registry` → 选 `Custom registry`：
>
> | 字段 | 值 |
> | --- | --- |
> | Registry URL | `crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com` |
> | Username | 阿里云 ACR 凭证用户名（与 GitHub Secret `ALIYUN_ACR_USERNAME` 同一个） |
> | Password | 对应密码 |
>
> 保存后建议用 `Registries` 列表里的 **Test / Browse** 验证是否生效
> —— 能列出 `thisnew/flamekeeper` 才算配置成功。
>
> 因为 compose 是 `image:` 模式（无 `build:`），Portainer 这里**只会拉取，
> 不会再触发构建**。若仍看到 "Building…"，说明 stack 用的还是旧版 compose。
>
> 日志里出现 `Warning: buildx isn't installed` 已经**无关紧要**了 ——
> 那只在需要 build 时才有影响，拉镜像模式不碰 buildx。

### 方式四：CI/CD 自动构建（GitHub Actions → 阿里云 ACR）

> **这两个环节是串起来的**：方式四负责**构建**并推送到 ACR，
> 方式二/三负责**拉取**并运行。部署机上不重复构建。
>
> —— 但在本次修复之前，`docker-compose.yml` 用的是 `build:`，
> 等于把 ACR 里构建好的镜像**完全忽略**，Portainer 每次部署都从源码
> 重新构建一遍。这正是「部署很慢」的根因。

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

### 数据库运维（PostgreSQL）

**备份 / 恢复**
```bash
# 备份
docker compose exec -T db pg_dump -U flamekeeper flamekeeper > backup_$(date +%F).sql

# 恢复
docker compose exec -T db psql -U flamekeeper -d flamekeeper < backup_2026-01-01.sql
```

**连接数据库排查**
```bash
docker compose exec db psql -U flamekeeper -d flamekeeper -c "\dt"
```

**使用外部 PostgreSQL**

默认 `DATABASE_URL` 指向 compose 内的 `db` 服务。若要连自建/云数据库（例如 LAN 上的 `192.168.3.80`），
直接覆盖该变量即可（`schema.prisma` 已是 `provider = "postgresql"`，无需改 schema）：

```env
DATABASE_URL="postgresql://user:pass@your-db-host:5432/flamekeeper?schema=public"
```

> ⚠️ **密码含特殊字符必须 URL 编码**，否则会报
> `invalid port number in database URL`（因为 `#` 是 URL 的 fragment 分隔符，会把后面整段截断）。
>
> 用内置生成器避免手算：
> ```bash
> npm run db:url -- --host 192.168.3.80 --user flamekeeper --pass 'flamekeeper#2026!' --show
> ```
> 输出可直接粘贴进 `.env`：
> ```
> DATABASE_URL="postgresql://flamekeeper:flamekeeper%232026%21@192.168.3.80:5432/flamekeeper?schema=public"
> ```
> 常用编码：`#`→`%23`　`@`→`%40`　`:`→`%3A`　`/`→`%2F`　`?`→`%3F`　`!`→`%21`
>
> **更省事的做法**：密码只在 `.env` 的 `POSTGRES_PASSWORD` 维护一处，
> 改完执行 `npm run db:sync` —— 脚本会重新百分号编码、写回 `DATABASE_URL`、
> 校验可解析性，并把原 `.env` 备份为 `.env.bak`。

**注意**：`db` 服务默认把 5432 绑定在 `127.0.0.1`，仅本机可连（避免数据库暴露公网）。
本地开发连它用 `localhost:5432`；若需从局域网其他机器连接开发库，把 `docker-compose.yml` 里的
端口映射改为 `"5432:5432"` 并自行加防火墙规则。

---

## 🔧 常见部署问题

按症状查。每一条都对应本项目实际踩过的坑，带根因解释。

### 部署很慢 / 一直卡在 "Building…"

**症状**：Portainer 日志反复出现 `Building`、`npm ci`、`npx prisma generate`，
一轮要 5–15 分钟，还可能失败重试。

**根因**：`docker-compose.yml` 用的是 `build:` 而非 `image:`，
Portainer 于是在部署机上从源码重新构建，把 ACR 里已构建好的镜像完全忽略了。

**修复**：确认 compose 是 `image:` 模式（本项目默认已是）。核对方法：

```bash
grep -n "image:\|build:" docker-compose.yml
# 期望只看到 image:（build: 应只出现在 docker-compose.build.yml 里）
```

### 构建卡在 `npx prisma generate`（超时 / ECONNRESET）

**根因**：`Dockerfile` 的 `npm ci --ignore-scripts` 跳过了 `@prisma/engines`
的 postinstall（引擎下载），于是 `npx prisma generate` 必须在**构建期**
从 `binaries.prisma.sh` 现下载约 40MB 引擎二进制。该域名在部分网络下很慢或不可达。

**修复**（择一）：
- **推荐**：不要在部署机上构建 —— 交给 CI（`Actions` 的网络正常），部署机只拉镜像
- 必须本地构建时，用国内镜像源：
  ```bash
  docker compose -f docker-compose.yml -f docker-compose.build.yml \
    build --build-arg PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
  ```

### `Warning: buildx isn't installed`

**无害**。这只在「需要 build」时才有影响。当前是拉镜像模式，不碰 buildx。
若你看到它**并且**在 build，说明 stack 用的还是旧版 compose。

### 拉取报 `manifest unknown`

**根因**：ACR 里还没有这个 tag —— 通常是 GitHub Actions 没跑成功。

**排查**：仓库 `Actions` 页看最近一次 run 是否绿色。若失败，多半是这两个 Secret 没配：

| Secret | 说明 |
| --- | --- |
| `ALIYUN_ACR_USERNAME` | ACR 凭证用户名 |
| `ALIYUN_ACR_PASSWORD` | **ACR 控制台设置的固定密码**，不是阿里云登录密码 |

### 拉取报 `unauthorized: authentication required`

**根因**：ACR 个人版是**私有**仓库，Portainer 未登录。

**修复**：`Registries` → `Add registry` → `Custom registry`：

| 字段 | 值 |
| --- | --- |
| Registry URL | `crpi-bisd6rcwol3ac2v6.cn-hangzhou.personal.cr.aliyuncs.com` |
| Username / Password | 同上面的 GitHub Secrets |

保存后点 **Test / Browse** 验证 —— 能列出 `thisnew/flamekeeper` 才算生效。

### 容器一直 unhealthy，日志报 `Connecting to localhost:3000 ([::1]:3000) Connection refused`

**症状**：健康检查一直失败，但浏览器访问完全正常。

**根因**：Alpine 的 musl 解析器按 RFC 6724 会优先把 `localhost` 解析成 IPv6 的
`::1`，而 Next.js 绑定的是 `HOSTNAME=0.0.0.0`（**仅 IPv4**），`::1` 上无人监听。

**修复**：健康检查必须写 `127.0.0.1`，不能写 `localhost`（本项目已修正）。
在容器内可自行验证：

```bash
docker exec flamekeeper-web cat /etc/hosts
docker exec flamekeeper-web wget -qO- --spider "http://[::1]:3000/api/health"      # 应失败
docker exec flamekeeper-web wget -qO- "http://127.0.0.1:3000/api/health"           # 应返回 200
```

### 登录报错 / 页面打开但没有任何数据

**根因**：数据库表不存在，或表存在但没有初始数据（没有 admin 账号、没有设置项）。

**修复**：本地 `npm run dev` 会自动 `db push` + `seed`；若手工部署，执行：

```bash
npm run db:push && npm run db:seed
# 或直接重跑初始化
npm run db:seed
```

验证：

```bash
npx prisma studio        # 应看到 17 张表 + 1 个 ADMIN 账号
```

### 数据库连接失败：`invalid port number in database URL`

**根因**：`DATABASE_URL` 里的密码含 `# @ : / ?` 等 URL 保留字符却**没做百分号编码**，
`#` 会被当成 fragment 分隔符，把后面的 `@host:port` 一起截断。

**修复**：

```bash
npm run db:sync    # 从 POSTGRES_PASSWORD 重新派生并写回 DATABASE_URL
```

常用编码：`#`→`%23`　`@`→`%40`　`:`→`%3A`　`/`→`%2F`　`!`→`%21`

### 邮件发送失败：`535 authentication failed`

**根因**：163/126 用的是**授权码**，不是登录密码；且授权码**区分大小写**。

**修复**：到「后台 → 系统设置 → 邮件服务」重填授权码，再点「测试连接」。
注意 `smtp_pass` 是加密存储的，**更换 `AUTH_SECRET` 会导致旧密文无法解密**，
必须重新填一次。

### 忘记密码点了「发送重置链接」但没收到邮件

接口对「邮箱是否存在」刻意返回**完全一致**的提示（防账号枚举），所以
「提示已发送」不等于「真的发了」。按下面顺序排查：

1. **邮件服务没配** —— 这种情况接口会直接返回 503「邮件服务尚未配置」。
   到「后台 → 系统设置 → 邮件服务」点「测试连接」确认。
2. **触发了频率限制** —— 同一账号 15 分钟内最多 3 次。超限时**故意返回
   和成功一样的文案**（否则 429 会暴露账号存在），但不会发信。服务端日志会打
   `[forgot-password] 触发频率限制，已静默丢弃`。等 15 分钟再试。
3. **邮箱没注册** —— 未注册的邮箱同样返回「已发送」文案，但不会发信。
   确认用的是注册时那个邮箱。
4. **链接域名不对** —— 邮件里的链接由 `NEXT_PUBLIC_APP_URL` / `AUTH_URL`
   拼出。这两个没配成对外域名的话，链接会指向 `localhost:3000`。

**链接提示「无效或已过期」的常见原因**：超过 1 小时、已经用过一次、
或者之后又申请了一次（新申请会作废旧的）。

### 重置密码后，攻击者已登录的会话还能继续用吗

**能。** 这是当前架构的已知限制：会话是 **JWT**（`strategy: "jwt"`）且未接线
`PrismaAdapter`，服务端没有可作废的会话记录，所以重置密码**不会**踢掉已有会话。
`change-password` 同样有这个限制。

需要「改密即踢下线」的话，得给 `User` 加一个 `passwordChangedAt`（或
`sessionVersion`）字段，并在 NextAuth 的 `jwt` 回调里比对签发时间 —— 目前未实现。

### 页面上的活动时间不对（差 8 小时）

**根因**：容器默认时区是 **UTC**，而服务端渲染时如果用 `getHours()` /
`toLocaleDateString()` 这类依赖本地时区的 API，就会按 UTC 显示 ——
中国用户看到的活动时间会**早 8 小时**。

**本项目怎么处理**：活动日历走 `src/lib/datetime.ts`，用 `Intl` +
**显式时区**格式化，并在**服务端**算好后把字符串传给客户端组件
（客户端再格式化会因两边时区不同触发 hydration mismatch）。

**时区配置**：`NEXT_PUBLIC_TIMEZONE` → `TZ` → 默认 `Asia/Shanghai`。
要换成别的时区，在 `.env` 里设置：

```env
NEXT_PUBLIC_TIMEZONE=Asia/Shanghai
```

> ⚠️ 已知遗留：应用里**其它页面**（新闻、名册等）仍在用 `lib/utils.ts` 的
> `formatDate()`，它依赖容器时区。如果发现那些页面的日期偏移，把容器 `TZ`
> 设为 `Asia/Shanghai` 即可（在 `docker-compose.yml` 的 `environment` 里加
> 一行 `- TZ=Asia/Shanghai`）。逐个页面替换成 `lib/datetime.ts` 的彻底改造
> 尚未进行。

### 日历订阅拉不到 / 报 404

`/api/events/ics` 需要公会级密钥，**验证失败一律返回 404**（而不是
401/403）—— 不告诉扫描者「端点存在、只是密钥不对」，减少被试探的动机。
所以看到 404 通常是密钥问题，不是端点不存在。

排查：

1. **地址是否完整** —— 必须带 `?key=<64 位十六进制>`。在
   `/events` 页面（官员）展开「订阅日历到手机」即可复制完整地址。
2. **密钥是否被轮换过** —— 管理员点过「轮换密钥」会让所有旧链接立即失效，
   需要在日历 App 里重新订阅。
3. **不要在浏览器里直接判断** —— 这个端点返回 `text/calendar`，
   浏览器可能直接下载文件。请把地址粘到日历 App 的「通过网址添加订阅」。

> 该地址含公会级密钥（`Setting` 表的 `calendar_feed_key`）。它**刻意不在**
> `/api/settings` 的公开白名单里，否则等于把密钥公开。请勿把订阅地址发到公开渠道。

### 换了域名或端口后「改了但没生效」

要分清两类变量，改错了就会出现「明明改了却没反应」：

| 变量 | 生效时机 | 怎么改 |
| --- | --- | --- |
| **`AUTH_URL`** | ✅ **运行时** | 改 compose 的 `PUBLIC_ORIGIN`（或 `.env`）后**重启容器** |
| `NEXT_PUBLIC_APP_URL` | ❌ **构建期**（被内联成字面量） | 必须**重新构建镜像**，改运行时不生效 |

排查顺序：

1. **登录跳转 / 邮件链接指向错域名、或丢了端口** → 查 `AUTH_URL`：
   ```bash
   docker exec flamekeeper-web printenv AUTH_URL
   # 期望：https://www.h83c4578f.nyat.app:22247
   ```
   若输出是 `http://localhost:3000`，说明 compose 从本地 `.env` 插值把它带进容器了
   —— 本项目已改用 `PUBLIC_ORIGIN` 规避（见 `docker-compose.yml` 注释）。
2. **社交分享卡片 / OpenGraph 的绝对 URL 不对** → 那是 `NEXT_PUBLIC_APP_URL`，
   构建期烘焙，**只能重建镜像**（CI 的 `PUBLIC_URL` / Dockerfile 的 ARG）。
3. **端口必须写全** —— 本项目对外地址是 `https://<域名>:22247`，漏了 `:22247`
   会让回调地址与浏览器地址不同源，登录直接失败。
4. **反向代理要透传端口** —— Host 头需保留 `:22247`。否则 NextAuth 靠
   `trustHost` 从 Host 头推断 origin 时会丢掉端口。最稳的做法是**显式设置
   `AUTH_URL`**，让 NextAuth 不依赖 Host 头。

> **Cookie 不受端口影响**：Cookie 是按域名隔离的，不是按端口。
> 所以换端口不会导致「登录状态丢失」；`Secure` 标记只取决于协议是不是 https。

> 本项目刻意让 `AUTH_URL` **优先于** `NEXT_PUBLIC_APP_URL`（见 `src/lib/app-url.ts`）
> —— 否则那个构建期内联的值会永远胜出，「运行时改地址」就彻底失效了。

---

## 📋 脚本命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器（先自动建表 + 写入初始数据） |
| `npm run build` | 生产构建（standalone output） |
| `npm start` | 启动生产服务器（同样先自动初始化） |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:push` | 推送 schema 到数据库 |
| `npm run db:studio` | 打开 Prisma Studio（GUI 数据查看） |
| `npm run db:seed` | 填充种子数据（初始 admin + 邮件配置） |
| `npm run db:url` | 生成 URL 编码正确的 `DATABASE_URL`（密码含特殊字符时用） |
| `npm run db:sync` | 从 `POSTGRES_*` 重新派生并写回 `DATABASE_URL`（改密码后跑一次） |
| `npm run db:demo` | 创建演示成员（引荐树可见） |
| `npm run db:demo:clean` | 清理演示成员 |

---

## 🗺️ 路线图

依据 [PLAN.md](./PLAN.md) 的功能优先级：

### ✅ 已完成（P0 — MVP）

- [x] 项目脚手架（Next.js 16 + TS + Tailwind 4）
- [x] WoW 主题系统（金色/职业色/火焰粒子）
- [x] 数据库 schema（17 个模型，参考 PLAN 数据模型）
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
- [x] **密码重置邮件流程**：`/auth/forgot-password` 申请 → 邮件里的一次性链接 →
  `/auth/reset-password` 设置新密码。令牌只以 SHA-256 摘要落库、1 小时过期、
  用后即焚；改密后同用户其余令牌一并作废；同账号 15 分钟内限 3 次；
  接口对「邮箱是否存在」返回完全一致的响应（防账号枚举）。
- [x] **活动报名 / 替补 / 出勤 / 导出 / .ics 订阅**：成员在 `/events` 一键报名；
  名额满自动进入替补队列，有人退出时**按报名先后自动补位**；官员可调整报名状态
  与标记出勤（出席/缺席/请假），并可导出带 UTF-8 BOM 的 CSV 名单（Excel 中文不乱码）。
  名额判定用 `SELECT … FOR UPDATE` 锁活动行，并发报名不会超员。
  另有 `.ics` 订阅：`/api/events/ics?key=…`，密钥为公会级、官员可见、管理员可轮换。
- [x] **文章评论**：成员可在新闻/公告下评论，**默认先审后发**（`comment_moderation`
  开关，官员在 `后台 → 评论审核` 处理，入口带待审数角标）。官员与管理员自己发的
  评论直接通过；未审评论对游客与其他成员不可见，但作者能看到自己的待审状态；
  可删除自己的评论，官员可删任意一条（留审计日志）。

### 🚧 待办（P2 — 进阶）

- [ ] 附件可选 S3 / 对象存储适配器（当前为本地磁盘 `public/uploads`）
- [ ] WCL / Raider.IO 数据同步
- [ ] KOOK 机器人通知
- [ ] 多语言（i18n）
- [ ] 意见反馈（独立表单 + 处理流转）
  —— 现状：**文章评论已完成**（见下方 P1），此处剩「反馈」部分未做。
- [ ] 直播聚合

---

## 🔐 安全建议

部署到生产环境前，请务必完成以下检查：

- [ ] 修改 `AUTH_SECRET` 为随机 32+ 位字符串
- [ ] 修改初始 admin 账号密码（`flamekeeper_admin@163.com` 的默认密码）
- [ ] 更换 SMTP 密码为邮箱服务商提供的**授权码**，不要使用邮箱登录密码
- [ ] 如启用 HTTPS，配置反向代理（Nginx / Caddy）
- [ ] 定期备份：PostgreSQL（`docker compose exec db pg_dump ...`）、`flamekeeper-uploads`（成员附件）与 `flamekeeper-storage`（WTF 上传文件）
- [ ] 升级到含 WTF 上传的版本后，**首次部署需让 compose 创建新卷** `flamekeeper-storage`（`docker compose up -d` 会自动创建）
- [ ] 修改 `POSTGRES_PASSWORD` 为强密码，并确认 5432 未暴露公网
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

共 **21 个模型**（`prisma/schema.prisma`），参考 PLAN.md 第九节：

**账号与鉴权（NextAuth 所需）**

- `User` —— 账号、邮箱、密码哈希、系统权限 `role`、**会阶 `guildRank`**（两者独立）、
  状态、邮箱验证时间、引荐人 `referredById`
- `Account` / `Session` / `VerificationToken` —— NextAuth 标准适配器表。
  **当前未被使用**：会话走 JWT（`strategy: "jwt"`），未接线 `PrismaAdapter`，
  保留在 schema 中是为了将来接入 OAuth / 数据库会话时无需迁移。
- `PasswordResetToken` —— 密码重置令牌。**只存 token 的 SHA-256 摘要**（不存原文），
  一次性使用（`usedAt`）、默认 1 小时过期；重置成功后同用户的其余令牌一并作废。

**资料与入会**

- `Profile` —— 用户档案
- `Application` —— 入会申请（申请编号、审核状态）。**游戏信息字段已改为可空**：
  注册只填昵称，这些字段不再收集，保留是为了兼容历史数据。
- `Character` —— 魔兽角色。`faction` / `class` / `spec` / `role` **可空** ——
  WTF 导入只能拿到「账号/服务器/角色名」，职业专精拿不到，缺省显示「未设置」。
  另有 `accountName`（来自哪个 WTF 账号）与 `sortOrder`（个人中心排序，最多 20 个）。
- `WtfAccount` —— 成员上传过的 WTF 账号（**每位最多 5 个**）。
  文件本身存在**私有目录**（`storage/wtf/<userId>/`，见部署说明），
  数据库只记录账号名与服务器数。路径里 `Account/<账号>/SavedVariables/`
  属**账号级**插件数据，不会被误当成服务器。
- `GameRealm` —— **国服服务器字典**（实测 360 条）。`name`（中文，如「燃烧之刃」）
  与 `slug`（短写英文，如 `burning-blade`）**各自唯一**；`groupId` 是暴雪的
  **服务器组** id（多个服务器共享，**不能当唯一键**）。由管理员在
  `后台 → 公会数据更新` 手动抓取更新，供其它功能做中英名换算。

**内容**

- `Post` —— 信息发布（分类 / 置顶 / 标签 / 附件）
- `Comment` —— 文章评论。`status` 为 `PENDING | APPROVED | REJECTED`，
  默认**先审后发**（`comment_moderation` 开关）；官员与管理员自己发的
  始终直接通过。可见性：已通过的公开可见，作者能额外看到自己待审/被拒的。
- `Page` —— 静态页面（公会介绍等）
- `Addon` —— 插件与成员分享（分类 / WA 字符串 / 附件）
- `Media` —— 图片与视频

**活动与分析**

- `Event` + `EventSignup` —— 活动与报名。`EventSignup.status` 为
  `CONFIRMED | BENCH | CANCELLED`，另有独立的 `attendance`
  （`null` 未标记 / `ATTENDED` / `ABSENT` / `LEAVE`）与 `note` 备注。
- `RaidProgress` —— 团本进度
- `AnalyticsSnapshot` —— 分析快照

**系统**

- `Setting` —— 系统设置（KOOK 链接、微信二维码、SMTP 等；`smtp_pass` 加密存储）
- `AuditLog` —— 管理操作日志（审批、改密、群发邮件等留痕）

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feat/your-feature`
3. 提交改动：`git commit -m 'feat: add something'`
4. 推送分支：`git push origin feat/your-feature`
5. 提交 Pull Request

### 开发约定

- **TypeScript strict 模式**：提交前跑 `npx tsc --noEmit`（本仓库要求 0 错误）
- **优先 Server Components**：仅在需要交互 / 浏览器 API 时加 `"use client"`。
  图表（Recharts）与轮播（Swiper）已隔离到独立客户端组件，避免污染服务端树。
- **角色判断用纯函数**：`lib/roles.ts` 不引 `next-auth/react`，保证服务端可直接调用；
  页面级门禁统一走 `lib/page-guard.ts` 的 `requireMember()` / `requireOfficer()` /
  `requireAdmin()`（未登录 → `/auth/login`，非成员 → `/pending`）。
- **API 响应**：成功 `NextResponse.json({ success: true })`，失败
  `NextResponse.json({ error: "…" }, { status })`。
  注意：目前**没有**统一的响应包装函数，各路由手写，形状靠约定而非类型强制。
- **需要落库的密钥必须加密**：走 `lib/secrets.ts`（实现在 `prisma/secrets.mjs`），
  不要明文写进 `Setting` 表。
- **schema 变更流程**：改 `prisma/schema.prisma` → `npm run db:generate`。
  建表/同步由 `predev` 与容器 `CMD` 自动完成，**不要手写 DDL**
  （`prisma/init.sql` 是构建期生成物，不入库）。

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