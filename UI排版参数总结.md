# 痛风管家 Pro UI排版参数总结 (iOS风格)

基于最新的 iOS Human Interface Guidelines 风格优化，以下是项目的核心 UI 设计参数。

## 1. 色彩系统 (Color System)

### 主色调 (Primary)
*   **Primary Base**: `#059669` (Emerald-600) - 用于主要按钮、选中状态。
*   **Primary Light**: `bg-emerald-50` - 用于浅色背景。
*   **Primary Text**: `text-emerald-700` - 用于文字。

### 状态色 (Status Colors)
*   **Critical / Danger (高危/删除)**: `#FF3B30` (iOS Red)
*   **High / Warning (偏高/中风险)**: `#FF9500` (iOS Orange)
*   **Normal / Safe (正常/安全)**: `#34C759` (iOS Green)
*   **Info (信息/检查)**: `#007AFF` (iOS Blue)
*   **Purple (影像/其他)**: `#5856D6` (iOS Purple)

### 中性色 (Neutral / Slate)
*   **Background (Page)**: `#F2F2F7` (iOS System Background) - 页面背景色。
*   **Surface (Card)**: `#FFFFFF` - 卡片背景。
*   **Text Main**: `#000000` - 主要标题、正文。
*   **Text Secondary**: `#8E8E93` (iOS System Gray) - 次级标题、内容。
*   **Text Tertiary**: `#C7C7CC` - 辅助信息、占位符。
*   **Border**: `rgba(0, 0, 0, 0.05)` - 分割线、边框。

---

## 2. 排版系统 (Typography)

### 字体大小 (Font Size)
*   **Display (数值)**: `60rpx` - 核心指标数值。
*   **Title 1 (大标题)**: `40rpx` - 页面标题、姓名。
*   **Title 2 (标题)**: `34rpx` - 卡片标题。
*   **Body (正文)**: `30rpx` - 标准正文。
*   **Callout (标注)**: `26rpx` - 次级描述。
*   **Caption (辅助)**: `22rpx` - 标签、时间。

### 字重 (Font Weight)
*   **Bold**: `700` - 标题、数值。
*   **SemiBold**: `600` - 按钮、强调。
*   **Medium**: `500` - 标签。
*   **Regular**: `400` - 正文。

---

## 3. 布局与间距 (Layout & Spacing)

### 容器 (Container)
*   **Page Padding**: `24rpx 32rpx`。

### 间距 (Gap & Margin)
*   **Grid Gap**: `24rpx`。
*   **Section Spacing**: `32rpx`。

### 圆角 (Border Radius)
*   **Large**: `28rpx` - 卡片。
*   **Medium**: `20rpx` - 输入框、按钮。
*   **Small**: `12rpx` - 标签。

### 阴影 (Shadow)
*   **Card Shadow**: `0 4rpx 16rpx rgba(0, 0, 0, 0.04)` - 柔和阴影。
*   **Nav Shadow**: `0 -2rpx 10rpx rgba(0, 0, 0, 0.02)` - 底部导航阴影。

---

## 4. 组件样式规范 (Component Specs)

### 按钮 (Button)
*   **Primary**: 圆角 `24rpx`，背景 `#059669`，白色文字。
*   **Secondary**: 浅色背景 `rgba(0, 122, 255, 0.1)`，主色文字。

### 卡片 (Card)
*   **Standard**: 白底，圆角 `28rpx`，微阴影。

### 标签 (Chip)
*   **Style**: 字号 `20rpx`，圆角 `12rpx`，加粗。

### 底部导航 (Bottom Nav / Dock)
*   **Height**: `140rpx` (包含安全区域适配)。
*   **Icon Size**: `64rpx × 64rpx`。
*   **Text Size**: `26rpx`。
*   **Icon-Text Gap**: `8rpx`。
*   **Active State**: 
    *   文字颜色 `#059669`，字重 `600`。
    *   圆形高亮背景 `rgba(5, 150, 105, 0.08)`，直径 `100rpx`。
*   **Inactive State**: 文字颜色 `#9CA3AF`，字重 `400`。
*   **Page Bottom Padding**: `200rpx` (避免内容被dock遮挡)。
