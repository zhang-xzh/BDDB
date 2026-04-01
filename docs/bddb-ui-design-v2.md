# BDDB UI/UX 设计规范

> **技术栈**: Tauri + React
> **组件库**: `src/styles/` (55 个组件, 基于 react-spectrum starters)
> **设计目标**: 高信息密度、精致细节、非扁平化质感
> **设计原则**: Interactions（交互一致性）、可维护性、可读性优先

---

## 组件库结构

```
src/styles/
├── theme.css          # CSS 变量、oklch 颜色系统、深色模式
├── utilities.css      # 工具类
├── {Component}.tsx    # 组件封装 (自动导入同名 .css)
└── {Component}.css    # 组件样式
```

**导入方式**: `import { Button } from '../styles/Button'` — 每个 `.tsx` 文件自包含同名 CSS，无需单独导入样式文件。

**参考**: `C:/Users/zhang/CODE/react-spectrum/starters/docs/stories/` — 每个 `.stories.tsx` 展示了组件的正确用法。

---

## 核心设计原则

### 字体系统（等宽优先）

针对阅读障碍优化，使用等宽字体提高可读性。

### Interactions（交互一致性）

- 使用 `onPress` 而非 `onClick`（React Aria 标准化）
- 悬停状态不应用于触摸设备（`data-hovered` 自动处理）
- 焦点只在键盘导航时显示（`data-focus-visible`）

### 状态驱动的样式

- 优先使用 `data-*` 属性: `data-pressed`, `data-hovered`, `data-focus-visible`, `data-selected`
- 也支持 render props: `className={({ isFocusVisible }) => ...}`
- 进入/退出动画: `data-entering`/`data-exiting`
- 过渡时间 150-300ms

---

## 可用组件清单

### 基础交互

| 组件                | 导入                         | 关键 Props                             |
|-------------------|----------------------------|--------------------------------------|
| Button            | `styles/Button`            | `onPress`, `isDisabled`              |
| ToggleButton      | `styles/ToggleButton`      | `onPress`, `isSelected`              |
| ToggleButtonGroup | `styles/ToggleButtonGroup` | `selectionMode`, `onSelectionChange` |
| Switch            | `styles/Switch`            | `isSelected`, `onChange`             |
| Checkbox          | `styles/Checkbox`          | `isSelected`, `onChange`             |
| CheckboxGroup     | `styles/CheckboxGroup`     | `value`, `onChange`                  |
| RadioGroup        | `styles/RadioGroup`        | `value`, `onChange`                  |

### 表单输入

| 组件          | 导入                   | 关键 Props                                                            |
|-------------|----------------------|---------------------------------------------------------------------|
| TextField   | `styles/TextField`   | `value`, `onChange`, `label`                                        |
| NumberField | `styles/NumberField` | `value`, `onChange`                                                 |
| SearchField | `styles/SearchField` | `value`, `onChange`, `label`, `placeholder`                         |
| DateField   | `styles/DateField`   | `value`, `onChange`                                                 |
| TimeField   | `styles/TimeField`   | `value`, `onChange`                                                 |
| ColorField  | `styles/ColorField`  | `value`, `onChange`                                                 |
| Select      | `styles/Select`      | `selectedKey`, `onSelectionChange`, 子项: `DropdownItem`              |
| ComboBox    | `styles/ComboBox`    | `selectedKey`, `onSelectionChange`, `defaultItems`, `onInputChange` |
| Slider      | `styles/Slider`      | `value`, `onChange`                                                 |
| Form        | `styles/Form`        | `onSubmit`                                                          |

### 列表与数据

| 组件       | 导入                | 关键 Props                                     |
|----------|-------------------|----------------------------------------------|
| ListBox  | `styles/ListBox`  | `items`, `selectionMode`, 子项: `DropdownItem` |
| GridList | `styles/GridList` | `items`, `selectionMode`, 子项: `GridListItem` |
| Table    | `styles/Table`    | `columns`, `rows`                            |
| Tree     | `styles/Tree`     | `items`, 子项: `TreeItem`                      |

### 布局与容器

| 组件              | 导入                       | 关键 Props                                      |
|-----------------|--------------------------|-----------------------------------------------|
| Toolbar         | `styles/Toolbar`         | `orientation`, `aria-label`                   |
| Tabs            | `styles/Tabs`            | `tab`, 子项: `TabList`, `Tab`, `TabPanel`       |
| Dialog          | `styles/Dialog`          | `trigger`, 子项: `DialogTrigger`, `DialogPanel` |
| Modal           | `styles/Modal`           | 继承 `ModalOverlayProps`                        |
| Sheet           | `styles/Sheet`           | `sheetSide` (left/right/top/bottom)           |
| Popover         | `styles/Popover`         | 作为其他组件的弹出层                                    |
| Menu            | `styles/Menu`            | `trigger`, 子项: `MenuItem`                     |
| Disclosure      | `styles/Disclosure`      | 子项: `DisclosureTrigger`, `DisclosurePanel`    |
| DisclosureGroup | `styles/DisclosureGroup` | 多个 Disclosure 的组合                             |
| Separator       | `styles/Separator`       | `orientation`                                 |

### 展示与反馈

| 组件             | 导入                      | 关键 Props                                          |
|----------------|-------------------------|---------------------------------------------------|
| TagGroup       | `styles/TagGroup`       | `items`, 子项: `Tag`                                |
| Breadcrumbs    | `styles/Breadcrumbs`    | 子项: `BreadcrumbItem`                              |
| ProgressBar    | `styles/ProgressBar`    | `value`, `min`, `max`                             |
| ProgressCircle | `styles/ProgressCircle` | `value`                                           |
| Meter          | `styles/Meter`          | `value`, `min`, `max`                             |
| Toast          | `styles/Toast`          | 子项: `ToastContent`, `ToastQueue`                  |
| Tooltip        | `styles/Tooltip`        | `trigger`, 子项: `TooltipTrigger`, `TooltipContent` |
| Link           | `styles/Link`           | `href`, `target`                                  |
| Content        | `styles/Content`        | `Heading`, `Text`                                 |

### 日期与颜色

| 组件                | 导入                         | 关键 Props            |
|-------------------|----------------------------|---------------------|
| Calendar          | `styles/Calendar`          | `value`, `onChange` |
| RangeCalendar     | `styles/RangeCalendar`     | `value`, `onChange` |
| DatePicker        | `styles/DatePicker`        | `value`, `onChange` |
| DateRangePicker   | `styles/DateRangePicker`   | `value`, `onChange` |
| ColorPicker       | `styles/ColorPicker`       | `value`, `onChange` |
| ColorArea         | `styles/ColorArea`         | —                   |
| ColorSlider       | `styles/ColorSlider`       | —                   |
| ColorSwatch       | `styles/ColorSwatch`       | —                   |
| ColorSwatchPicker | `styles/ColorSwatchPicker` | —                   |
| ColorWheel        | `styles/ColorWheel`        | —                   |

### 其他

| 组件               | 导入                        | 说明           |
|------------------|---------------------------|--------------|
| DropZone         | `styles/DropZone`         | 文件拖放区        |
| InputGroup       | `styles/InputGroup`       | 输入框组合        |
| SegmentedControl | `styles/SegmentedControl` | 分段选择器        |
| CommandPalette   | `styles/CommandPalette`   | 命令面板 (Cmd+K) |

---

## 窗口 → 组件映射

### 主窗口 — Ribbon 工具栏

| 功能    | 组件                                 | 说明                                 |
|-------|------------------------------------|------------------------------------|
| 工具栏容器 | `Toolbar`                          | `orientation="horizontal"`, 键盘方向导航 |
| 功能按钮  | `Button`                           | `onPress`, 图标+文字纵向排列               |
| 主题切换  | `SegmentedControl` (3选1: 浅色/深色/系统) | —                                  |
| 设置按钮  | `Button`                           | 右侧角标                               |
| 内容区   | 原生 `<main>`                        | flex-1 填充                          |

### 种子管理 — 高密度列表

| 功能      | 组件                          | 说明                                            |
|---------|-----------------------------|-----------------------------------------------|
| 搜索框     | `SearchField`               | `value`/`onChange`, 无需嵌套 Input                |
| 状态筛选    | `Select` + `DropdownItem`   | `selectedKey`/`onSelectionChange`             |
| 同步/拆卷按钮 | `Button`                    | `isDisabled` 联动选中状态                           |
| 种子列表    | `GridList` + `GridListItem` | `selectionMode="single"`, `items` + render 函数 |
| 虚拟滚动    | `GridList` + `Virtualizer`  | 来自 `react-aria-virtualizer`                   |

**交互流**: 单选种子 → 拆卷按钮激活 → 点击 → 打开分卷编辑器(新建模式)

### 分卷管理 — 高密度列表

| 功能    | 组件                          | 说明                            |
|-------|-----------------------------|-------------------------------|
| 搜索/筛选 | `SearchField` + `Select`    | 同种子管理                         |
| 操作按钮组 | `Button` ×3                 | 编辑/媒介/关联, 各 `isDisabled` 联动选中 |
| 分卷列表  | `GridList` + `GridListItem` | `selectionMode="single"`      |

**交互流**: 单选分卷 → 点击按钮 → 打开对应编辑窗口

### 分卷编辑器 — 文件树选择器

| 功能   | 组件                  | 说明                                                |
|------|---------------------|---------------------------------------------------|
| 文件树  | `Tree` + `TreeItem` | 展开收起, 键盘导航                                        |
| 共享开关 | `Switch`            | `isSelected`/`onChange`                           |
| 单选卷号 | `ComboBox`          | `selectedKey`/`onSelectionChange`, `defaultItems` |
| 多选卷号 | `Select`            | `selectedKeys`(多选)                                |
| 表单   | `Form`              | 包裹提交逻辑                                            |

**两种模式**: 拆卷模式(传入种子) / 编辑模式(传入分卷)

### 作品关联 — Bangumi 展示

| 功能   | 组件                         | 说明                            |
|------|----------------------------|-------------------------------|
| 作品卡片 | `Dialog` 或原生 div           | 含图片、元信息网格                     |
| 收藏统计 | `TagGroup` + `Tag`         | 想看/看过/在看/搁置/抛弃                |
| 搜索作品 | `ComboBox`                 | `onInputChange` 触发 Bangumi 搜索 |
| 搜索结果 | `ListBox` + `DropdownItem` | `onPress` 添加关联                |

**交互流**: 搜索 → 选择 → 添加关联, 已关联的显示卡片(可移除)

### 媒介编辑器

| 功能   | 组件                  | 说明             |
|------|---------------------|----------------|
| 文件树  | `Tree` + `TreeItem` | 同分卷编辑器         |
| 媒介类型 | `SegmentedControl`  | BD/DVD/CD/Scan |

### 产品搜索 — 可多开

| 功能    | 组件                                                     | 说明          |
|-------|--------------------------------------------------------|-------------|
| 搜索框   | `SearchField`                                          | 搜索 Surugaya |
| 搜索结果  | `GridList` + `GridListItem`                            | 每项可展开       |
| 展开/收起 | `Disclosure` + `DisclosureTrigger` + `DisclosurePanel` | 查看产品详情      |

### 作品搜索 — 可多开

| 功能   | 组件                         | 说明             |
|------|----------------------------|----------------|
| 搜索框  | `SearchField`              | 搜索 Bangumi     |
| 搜索结果 | `ListBox` + `DropdownItem` | `onPress` 查看详情 |

---

## 常见模式速查

### Select 下拉选择

```
Select (selectedKey, onSelectionChange)
  └── DropdownItem (id, children)     ← 注意: 不是 ListBoxItem
```

### ComboBox 组合输入

```
ComboBox (defaultItems, selectedKey, onSelectionChange, onInputChange)
  └── DropdownItem (id, textValue)    ← 自动过滤
```

### GridList 列表

```
GridList (items, selectionMode, onSelectionChange)
  └── render: (item) => <GridListItem id={item.id} textValue={item.name}>
```

### Tree 树形

```
Tree (items)
  └── render: (item) => <TreeItem key={item.key} textValue={item.title}>
       └── TreeItem (children, 递归)
```

### Dialog 对话框

```
DialogTrigger>
  <Button> 打开 </Button>
  <DialogPanel>
    <Heading slot="title"> 标题 </Heading>
    <p> 内容 </p>
    <Button slot="close"> 关闭 </Button>
  </DialogPanel>
</DialogTrigger>
```

### Sheet 侧边面板

```
Sheet (sheetSide="left"|"right"|"top"|"bottom")
```

### Disclosure 折叠

```
Disclosure>
  <DisclosureTrigger> 标题 </DisclosureTrigger>
  <DisclosurePanel> 内容 </DisclosurePanel>
</Disclosure>
```

---

## 样式系统

### 颜色系统

- 基于 **oklch** 色彩空间, 支持透明度和亮度调整
- 深色模式: `@media (prefers-color-scheme: dark)` 自动适配
- 强制颜色: 支持 Windows High Contrast Mode (`forced-colors: active`)

### 视觉质感

- 按钮: 内阴影、高光、渐变的立体效果
- 表单字段: inset 效果（凹陷感）
- 整体: 非扁平化, 桌面软件质感

---

## 窗口尺寸规范

| 窗口    | 最小尺寸    | 默认尺寸     | 说明                 |
|-------|---------|----------|--------------------|
| 主窗口   | 600×400 | 800×500  | Ribbon 只有几个按钮，窄而紧凑 |
| 种子管理  | 500×600 | 600×900  | 长列表为主，细高形          |
| 分卷管理  | 500×600 | 600×900  | 长列表为主，细高形          |
| 分卷编辑器 | 800×500 | 1000×700 | 文件树 + 表单，常规编辑窗口    |
| 媒介编辑器 | 800×500 | 1000×700 | 常规编辑窗口             |
| 作品关联  | 800×500 | 1000×700 | 常规编辑窗口             |
| 产品搜索  | 600×500 | 900×700  | 丰富内容的长列表，较宽较高      |
| 作品搜索  | 600×500 | 900×700  | 丰富内容的长列表，较宽较高      |

---

## 参考资料

- [React Aria Quality Guide](https://react-spectrum.adobe.com/react-aria/Quality.html)
- [React Aria Styling Guide](https://react-spectrum.adobe.com/react-aria/Styling.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG22/Understanding/)
- **Stories 参考**: `C:/Users/zhang/CODE/react-spectrum/starters/docs/stories/`

---

**设计文档版本**: v3
**更新日期**: 2026-04-01
**技术栈**: Tauri + React
