# UI 重新设计

> Issue: [#10 重新设计 UI](https://github.com/billyct/calendar-message/issues/10)
> 日期：2026-05-10

## 1. 背景与目标

当前 App 是一个单页面布局：顶部 `AppHeader` + 全屏 `MessageCalendar` + 多个 `*FormDialog`。Issue #10 提供了一张三栏式 Dashboard 的设计参考图（左侧导航 + 中间内容 + 右侧辅助面板）。本次重构目标：

- 将单页面布局改造为三栏 Shell + 多路由结构
- 把所有表单类弹窗（消息、群组、模板）改造为路由页面
- 保留所有现有功能（增删改查、立即发送、调度、桌面通知）
- 新增『消息列表』『模板管理（独立页）』『群组管理（独立页）』『设置』四个一级页面
- 引入参考图中的『统计概览』『今日消息』『快速创建』辅助面板
- 优先复用 shadcn/ui 组件
- 不引入账户系统（issue 明确要求忽略）

## 2. 范围

**纳入**
- 三栏 Shell + 左侧 `Sidebar` + 路由系统（react-router-dom）
- 5 个一级页面 + 各自的"新建/编辑"子路由
- 设置页：主题切换 + 关于
- 统计 / 今日消息 / 快速创建辅助面板
- 删除二次确认保留为 `AlertDialog`（不走路由）
- 现有 `useScheduledMessages` 等 hook 拆分（list 数据 vs 单条 editor）
- 后端按需新增 `get_message` / `get_group` / `get_template` 单条查询命令

**不纳入**
- 账户系统（用户、登录、Pro 版）
- 模板/群组数据模型本身的变更
- 后端调度器逻辑变更
- 国际化（保留现有中文）

## 3. 路由表

| 路径 | 页面组件 | 主区域 | 右栏 | 说明 |
|---|---|---|---|---|
| `/` | — | 重定向到 `/calendar` | — | |
| `/calendar` | `CalendarPage` | 月/周/日历 + PageHeader | ✅ | 当前 `MessageCalendar` 的家 |
| `/messages` | `MessageListPage` | 表格 + 筛选 | ❌ | 跨月查询，新增 atom |
| `/messages/new` | `MessageEditorPage` | 表单 | ❌ | 替代 `MessageFormDialog` 创建模式 |
| `/messages/:id` | `MessageEditorPage` | 表单 | ❌ | 替代 `MessageFormDialog` 编辑模式 |
| `/groups` | `GroupListPage` | 卡片网格 | ❌ | 新增独立页面 |
| `/groups/new` | `GroupEditorPage` | 表单 | ❌ | 替代 `GroupFormDialog` |
| `/groups/:id` | `GroupEditorPage` | 表单 | ❌ | |
| `/templates` | `TemplateListPage` | 卡片网格 | ❌ | 新增独立页面 |
| `/templates/new` | `TemplateEditorPage` | 表单 | ❌ | 替代 `TemplateFormDialog` |
| `/templates/:id` | `TemplateEditorPage` | 表单 | ❌ | |
| `/settings` | `SettingsPage` | 主题 + 关于 | ❌ | 新增 |

**导航高亮**：编辑页（`/messages/:id` 等）应高亮其父级（`/messages`）。

## 4. 应用 Shell

```
<BrowserRouter>
  <SidebarProvider>
    <AppShell>                   // grid 布局
      <AppSidebar />             // shadcn Sidebar
      <SidebarInset>             // 主内容区
        <Outlet />               // 路由切换
      </SidebarInset>
      <RightRail />              // 仅在 /calendar 渲染
    </AppShell>
    <Toaster />
  </SidebarProvider>
</BrowserRouter>
```

### 4.1 `AppSidebar`

基于 shadcn `Sidebar` 组件：

```
SidebarHeader
  Logo + 副标题「企业微信定时消息 / Webhook 定时发送」
SidebarContent
  SidebarGroup「导航」
    SidebarMenu
      📅 日历视图    NavLink to=/calendar
      📋 消息列表    NavLink to=/messages
      👥 群组管理    NavLink to=/groups
      📄 模板管理    NavLink to=/templates
      ⚙  设置        NavLink to=/settings
  SidebarSeparator
  SidebarGroup「本月概览」
    StatsOverview                 // 4 张迷你 Card
SidebarFooter
  Item「本地应用 v0.1.0」 + GitHub 链接
```

**激活态**：使用 react-router-dom 的 `useLocation()` 与 `pathname.startsWith(item.path)` 判断。

### 4.2 `RightRail`

仅当路由匹配 `/calendar` 时渲染（`useMatch("/calendar")`）：

```
<aside className="w-80 ...">
  <TodayMessagesPanel />        // Card 包裹一个 Item 列表
  <QuickCreatePanel />          // Card 包裹三个 Button/Item
</aside>
```

- `TodayMessagesPanel`：从 `messagesAtom` 派生今天的消息（衍生 atom `todayMessagesAtom`），用 `Item` 渲染（左侧色条 = 群组颜色，标题 = 内容预览，右侧 = `Badge` 状态）。点击跳 `/messages/:id`。空态用 `Empty` 组件。
- `QuickCreatePanel`：三个动作
  - 「立即发送消息」→ 跳 `/messages/new?mode=instant`（编辑页根据 query 隐藏「计划时间」改为发送按钮）
  - 「创建定时消息」→ 跳 `/messages/new`
  - 「从模板创建」→ 跳 `/messages/new?templateId=...`（需在编辑页处理 query 预填充）

## 5. 各页面详细设计

### 5.1 `CalendarPage`

```
<PageHeader
  title="日历视图"
  subtitle="管理你的定时消息"
  actions={
    <>
      <Button variant="outline" onClick={() => navigate('/groups/new')}>
        <Plus/> 新建群聊
      </Button>
      <Button onClick={() => navigate('/messages/new')}>
        <Plus/> 新建消息
      </Button>
    </>
  }
/>
<MessageCalendar ... />
```

- `MessageCalendar` 内部不变，仍 react-big-calendar
- toolbar 中的视图切换器替换为 shadcn `ToggleGroup`（月/周/日）
- 顶部「今天 / 上月 / 下月」用 `Button` + `ButtonGroup`
- 点击空白格 / 点击事件 → `navigate('/messages/new?...')` / `navigate('/messages/:id')`（不再开 dialog）

### 5.2 `MessageListPage`

```
<PageHeader title="消息列表" subtitle="所有定时消息" actions={<NewMessageButton/>} />
<Card>
  <FiltersToolbar>     // 状态多选 + 群组多选 + 日期区间 (DatePicker)
  <Table>
    Columns: 计划时间 | 群组 | 类型 | 内容预览 | 状态(Badge) | 操作
  </Table>
</Card>
```

- 数据：新增 `messagesRangeAtom` 与 `useMessagesList()` hook，独立于按月加载，默认范围 = 最近 30 天 + 未来 30 天，筛选条件改变时调 `list_messages` 重查
- 行操作：编辑（跳路由）/ 立即发送 / 删除（AlertDialog）
- 加载：`Skeleton` 行
- 空态：`Empty` + 引导按钮

### 5.3 `GroupListPage`

```
<PageHeader title="群组管理" subtitle="维护 webhook 群组" actions={<NewGroupButton/>} />
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
  {groups.map(g => (
    <Card>
      <CardHeader>
        <ColorDot color={g.color}/> <CardTitle>{g.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <code>{g.webhookUrl}</code>
      </CardContent>
      <CardFooter>
        <Button onClick={() => navigate(`/groups/${g.id}`)}>编辑</Button>
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleting(g)}>删除</Button>
      </CardFooter>
    </Card>
  ))}
</div>
```

### 5.4 `TemplateListPage`

同 `GroupListPage`，卡片显示模板名 + 类型 `Badge` + 内容预览（首 2 行 + 渐隐）。

### 5.5 `SettingsPage`

堆叠两个 `Card`（不用 Tabs，避免两屏切换）：

```
<PageHeader title="设置" />

<Card>
  <CardHeader><CardTitle>外观</CardTitle></CardHeader>
  <CardContent>
    <Field label="主题" description="选择浅色、深色或跟随系统">
      <RadioGroup value={theme} onValueChange={setTheme}>
        <Item> Sun  浅色 </Item>
        <Item> Moon 深色 </Item>
        <Item> Monitor 跟随系统 </Item>
      </RadioGroup>
    </Field>
  </CardContent>
</Card>

<Card>
  <CardHeader><CardTitle>关于</CardTitle></CardHeader>
  <CardContent>
    版本 0.1.0
    <a> 项目主页 (GitHub) </a>
  </CardContent>
</Card>
```

- 主题集成：复用 `next-themes`，删除原 `ThemeMenu` 在 header 的引用
- header 中的 `ThemeMenu` 组件本身可以删除或仅在 sidebar footer 保留一个图标按钮跳设置

### 5.6 编辑页（消息 / 群组 / 模板）

统一壳：

```
<PageHeader
  title={id ? '编辑消息' : '新建消息'}
  subtitle={...}
  back={() => navigate(-1)}
  actions={
    <>
      {id && <Button variant="outline" onClick={sendNow}>立即发送</Button>}
      <Button variant="outline" onClick={sendTest}>测试发送</Button>
      <Button onClick={save}>保存</Button>
      {id && <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={openDelete}>删除</Button>}
    </>
  }
/>

<Card className="max-w-2xl">
  <CardContent className="space-y-6">
    <Field>...每个表单字段...</Field>
  </CardContent>
</Card>
```

- 现有 `MessageFormDialog` 内部表单结构整体迁移到 `MessageEditorForm`（纯展示 + props）
- 编辑页负责：根据 `params.id` 加载（mount 时调 `get_message`）、提交、导航
- 删除：AlertDialog；确认后 `navigate(-1)` 或 `navigate('/messages')`
- `get_message`：后端新增（`get_group` / `get_template` 类似）；先尝试从已加载列表 atom 取，命中则不调 invoke——简化首次加载

## 6. 数据层调整

### 6.1 Hook 拆分

| 现有 | 拆分后 |
|---|---|
| `useScheduledMessages` | `useScheduledMessagesData()`（list/load/订阅 messages-changed/导航日历）+ `useMessageEditor(id?)`（单条表单 state + save/delete/sendTest/sendNow） |
| `useWebhookGroups` | `useWebhookGroupsData()` + `useGroupEditor(id?)` |
| `useMessageTemplates` | `useMessageTemplatesData()` + `useTemplateEditor(id?)` |

`*Editor` hook 用本地 `useState` 管理表单，不再动 jotai 全局 atom（移除 `webhookUrlAtom` / `contentAtom` / 等表单字段 atom，留下数据态 atom）。

### 6.2 新增 Atom

- `todayMessagesAtom`（衍生：从 messagesAtom 过滤 today）
- `monthStatsAtom`（衍生：从 messagesAtom 计算 4 个数）
- `messagesRangeAtom` + 对应 atom 用于消息列表页

### 6.3 后端命令（按需新增）

- `get_message(id) -> Option<ScheduledMessage>`
- `get_webhook_group(id) -> Option<WebhookGroup>`
- `get_message_template(id) -> Option<MessageTemplate>`

逻辑都是单 `SELECT WHERE id = ?` + `Option`。注册到 `invoke_handler!`。

## 7. shadcn/ui 组件清单

**已安装**：alert-dialog, button, calendar, dialog, dropdown-menu, input, label, popover, select, sonner, textarea

**需新增**：
- `sidebar` — 左侧导航
- `table` — 消息列表
- `card` — 各类内容容器
- `badge` — 状态徽章
- `separator` — Sidebar 分隔
- `switch`, `radio-group` — 设置项
- `scroll-area` — 长列表滚动

- `skeleton` — 加载占位
- `empty` — 空状态
- `tooltip` — 图标按钮提示
- `field` — 表单字段组合
- `item` — Today 消息行 / 设置项
- `toggle-group` — 日历视图切换
- `button-group` — 日历翻页
- `breadcrumb` — 编辑页导航（可选）

`Dialog` 组件文件可删除（不再使用）；`MessageFormDialog` / `GroupFormDialog` / `TemplateFormDialog` 文件删除。

## 8. 视觉与样式

- 沿用现有 shadcn token（不改 `src/index.css` 主题色）
- Sidebar 使用 `bg-sidebar`（shadcn Sidebar 自带变量），主区 `bg-background`
- 状态色：pending=secondary / processing=info / sent=success / failed=destructive。新建一个 `<StatusBadge status>` 组件统一映射
- 群组色条：复用现有 `g.color` hex
- 字号 / 间距：尽量贴 shadcn 默认；不引入新字体

## 9. 测试策略

- 现有 `useScheduledMessages` 的测试拆成 data hook + editor hook
- 新增路由集成测试：用 `MemoryRouter` 渲染 `<App/>`，断言导航后正确页面渲染
- 表单组件测试改为渲染纯 `MessageEditorForm` 等，不再 mock dialog
- `mock-tauri-invoke.ts` 需新增对 `get_message` / `get_webhook_group` / `get_message_template` 的桩

## 10. 删除清单

- `src/components/app-header.tsx`（拆分到 Sidebar 与 PageHeader）
- `src/components/message-form-dialog.tsx`、`group-form-dialog.tsx`、`template-form-dialog.tsx`、`delete-message-dialog.tsx`（替换为编辑页 + AlertDialog）
- `src/components/theme-menu.tsx`（合并入 SettingsPage）
- `src/components/ui/dialog.tsx`（如不再使用）
- `webhookUrlAtom` / `contentAtom` / `msgtypeAtom` / `scheduledAtDateAtom` / `selectedGroupIdAtom` / `editingIdAtom` / `modalOpenAtom` / `deleteOpenAtom` / `scheduleDateOpenAtom`（表单 state 不再 atom）

## 11. 实现里程碑（粗粒度）

1. 安装 shadcn 组件 + 引入 `react-router-dom`，搭建 `AppShell` + 空白路由 + Sidebar
2. 迁移现有日历到 `/calendar`（功能不变），删除原 header
3. 重构 `useScheduledMessages` → 拆 data/editor，迁出表单 atom
4. `MessageEditorPage` + 后端 `get_message`，删除 `MessageFormDialog`
5. `GroupListPage` + `GroupEditorPage` + 后端 `get_webhook_group`，删除 `GroupFormDialog`
6. `TemplateListPage` + `TemplateEditorPage` + 后端 `get_message_template`，删除 `TemplateFormDialog`
7. `MessageListPage` + `messagesRangeAtom`
8. `RightRail`（TodayMessages + QuickCreate）
9. `StatsOverview`
10. `SettingsPage` + 主题切换迁入
11. 测试调整 + 修复

## 12. 风险与注意

- **react-big-calendar 主题**：当前样式可能与新 Sidebar 布局冲突，需要在容器尺寸（高度）上做调整（之前是全屏，现在是主区填充）
- **iframe-like 的右栏宽度**：在窄屏下应当折叠，使用 `Sheet` 抽屉显示
- **路由刷新数据**：`messages-changed` 事件触发后只刷新 calendar 月份；列表页应独立监听并刷新自己的范围
- **数据库迁移**：本次不涉及 schema 变化，无需迁移
