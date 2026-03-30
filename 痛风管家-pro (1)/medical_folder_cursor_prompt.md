# 开发任务：构建“病历夹 (Medical Folder)”功能模块

## 1. 任务目标
在现有的 `PatientApp` (患者端) 中增加一个核心功能模块——**病历夹**。
该模块用于模拟真实的电子病历本，允许患者建立档案，并以“九宫格/十二宫格”的形式查看和管理不同维度的健康数据（如病史、过敏史、体检报告等）。

## 2. 数据层设计 (`services/store.ts`)

我们需要扩展全局 Store 来存储病历夹数据。

### 2.1 数据接口定义
请在 `services/store.ts` 中新增以下接口：

```typescript
export interface MedicalFolderProfile {
  isInitialized: boolean; // 标记用户是否已完成首次问卷
  basicInfo: {
    name: string;
    gender: string;
    birthDate: string;
    height: string; // cm
    weight: string; // kg
    bloodType: string;
  };
  // 以下字段为长文本或数组，用于存储详细记录
  history: string;         // 现病史
  pastHistory: string;     // 既往史
  lifestyle: string;       // 生活史
  allergies: string[];     // 过敏史 (标签数组)
  familyHistory: string;   // 家族史
  medicationHistory: string; // 用药记录
  physicalExam: string;    // 体格检查
  labTests: string;        // 化验检查
  assessment: string;      // 病情评估
  followup: string;        // 复诊随访计划
  healthReport: string;    // 健康报告摘要
}
```

### 2.2 Store 方法
实现以下方法：
1.  `getMedicalFolderProfile()`: 获取当前档案。
2.  `initMedicalFolder(data)`: 初始化档案（将 `isInitialized` 设为 true，并填入初始数据）。
3.  `updateMedicalFolderSection(section, value)`: 更新特定板块的数据（支持部分更新）。

---

## 3. 界面交互流程与组件设计 (`components/patient/PatientApp.tsx`)

### 3.1 入口 (Entry Point)
*   **位置**: `PatientHome` 组件的“快速记录” (Quick Actions) 区域。
*   **图标**: 使用 `Folder` 图标，背景色推荐 `bg-cyan-500`。
*   **逻辑**: 点击图标时检查 `store` 中的 `isInitialized` 状态。
    *   `false` -> 跳转至 **初始化问卷页** (`folder-init`)。
    *   `true` -> 跳转至 **病历夹仪表盘** (`folder-dashboard`)。

### 3.2 初始化问卷页 (`PatientFolderInit`)
*   **场景**: 用户首次使用该功能。
*   **UI 风格**: 引导式、简洁、大按钮。
*   **内容**:
    *   标题：“建立健康档案”。
    *   表单字段：姓名、性别（单选按钮）、出生日期、确诊年份。
    *   底部按钮：“立即建立档案”。
*   **交互**: 点击提交后，调用 `initMedicalFolder`，然后自动跳转到仪表盘。

### 3.3 病历夹仪表盘 (`PatientFolderDashboard`)
*   **场景**: 用户的主视图。
*   **顶部区域**: 展示用户画像卡片（姓名、性别、年龄、ID），右上角带一个小锁图标表示隐私保护。
*   **核心区域**: 12宫格菜单 (Grid Layout)。
*   **菜单项配置**:
    1.  基本信息 (User) - Cyan
    2.  病史记录 (FileText) - Orange
    3.  既往史 (FileClock) - Violet
    4.  生活史 (Droplets) - Lime
    5.  过敏史 (Dna) - Sky (显示为红色标签样式)
    6.  家族史 (Users) - Blue
    7.  体格检查 (Accessibility) - Indigo
    8.  化验检查 (FlaskConical) - Teal
    9.  用药记录 (Pill) - Emerald
    10. 病情评估 (ClipboardCheck) - Blue
    11. 复诊随访 (Stethoscope) - Blue
    12. 健康报告 (Activity) - Rose
*   **交互**: 点击任意格子的图标，跳转至详情页 (`folder-detail`) 并传递对应的 `section` 参数。

### 3.4 详情与编辑页 (`PatientFolderDetail`)
*   **场景**: 查看或修改具体内容（如修改过敏史）。
*   **Header**:
    *   左侧：返回按钮。
    *   中间：当前板块标题（如“过敏史”）。
    *   右侧：操作按钮。默认显示“编辑”，点击后变为“保存”。
*   **查看模式 (View Mode)**:
    *   如果是 `basicInfo`：显示 Key-Value 列表。
    *   如果是 `allergies`：显示 Tag 标签云。
    *   其他：显示文本段落，支持换行。
*   **编辑模式 (Edit Mode)**:
    *   显示全屏 `textarea` 或表单输入框。
    *   如果是 `allergies`：可以用逗号分隔的输入框模拟。
*   **交互**: 点击“保存”后，调用 `updateMedicalFolderSection` 更新 Store，并切回查看模式。

---

## 4. UI/UX 细节要求
*   **配色**: 保持 App 原有的 Teal/Slate 风格。病历夹内部图标背景色需丰富多彩（参考 iOS 健康或类似医疗 App 的九宫格配色），增加辨识度。
*   **动画**: 页面切换使用简单的条件渲染即可，但在 Dashboard 点击图标时要有 `active:scale-95` 的按压反馈。
*   **空状态**: 如果某项内容为空，显示“暂无记录”并在编辑时显示 Placeholder。

## 5. 代码实现提示
请在 `PatientApp` 组件内部通过 `currentScreen` 状态管理路由：
```tsx
const [currentScreen, setCurrentScreen] = useState('home'); 
// 路由枚举: 'home' | 'folder-init' | 'folder-dashboard' | 'folder-detail'
const [folderSection, setFolderSection] = useState(null); // 记录当前选中的九宫格模块
```
