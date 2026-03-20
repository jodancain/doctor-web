# 问题记录：文章管理/编辑页面白屏分析与解决

## 1. 问题描述
用户反馈在点击“医院宣教”菜单或“发布新文章”时，页面出现完全空白（White Screen of Death），且没有任何界面元素渲染。

## 2. 第一次排查（React-Quill 兼容性问题）
在之前的代码编写中，为了实现富文本编辑功能，引入了 `react-quill` 库：
然而，`react-quill@2.0.0` 及更早版本底层高度依赖 React 的旧版 API（特别是 `findDOMNode` 方法）。在当前项目中，使用的是最新的 **React 19**。这导致它在被 React 渲染时，会抛出严重的运行时异常（Runtime Exception），破坏了 React 的整个组件树（因为没有配置全局 Error Boundary），进而导致整个单页应用崩溃、页面变白。
**修复方案**：卸载 `react-quill`，换用 `@wangeditor/editor`。

## 3. 第二次排查（WangEditor 兼容性问题与繁琐需求）
在替换为 `@wangeditor/editor-for-react` 后，用户反馈白屏问题**依然存在**。
进一步分析：
1. **React 19 严格模式冲突**：`@wangeditor/editor-for-react` 这个包近一年更新较慢，其内部对于 React Ref 的挂载机制在 React 19（甚至 React 18 的 StrictMode 下）存在生命周期卸载/重新挂载引发的 `DOMException`，导致整个 React 应用树直接崩溃（由于在 `App.tsx` 顶层同步导入，只要进入相关路由模块就会挂掉全站）。
2. **多余功能带来的复杂度**：为了做“手机实时预览”和“复杂工具栏”，我们引入了不兼容的大型富文本框架以及厚重的界面，导致页面极易渲染失败，也使得最终打包体积臃肿（超过 500kb）。

## 4. 最终解决步骤 (云文档极简方案)
根据用户的最新要求：“不用手机实时预览，患者端可以自动适配就行，尽可能简单好用像一般的云文档功能一样就行”。

1. **彻底卸载旧版庞然大物：** 清理掉一切对 React 19 有兼容隐患的库。
   ```bash
   npm uninstall @wangeditor/editor @wangeditor/editor-for-react
   ```
2. **引入极简纯净的 React 现代富文本库：** 替换为 `react-simple-wysiwyg`。这个库：
   - 0 依赖，体积极小。
   - 完全基于原生浏览器 API，100% 兼容 React 19。
   ```bash
   npm install react-simple-wysiwyg
   ```
3. **彻底重构 `ArticleEditor.tsx`：**
   - 移除厚重的左右分栏和“手机模拟器”。
   - 采用类似飞书/Notion/语雀的**云文档（Cloud Document）**一页纸居中排版。
   - 顶部悬浮工具栏、极大的标题输入框、隐藏边框的沉浸式正文编辑区。
4. **清理并重启服务：** 清理被占用的 Node 进程并重新执行 `npm run dev`。
5. **滚动体验深度优化：**
   - 如果编辑器所在的卡片容器存在 `overflow-hidden`，会导致页面变成难以使用的局部滚动，且工具栏（Toolbar）由于 `position: sticky` 失效而随内容滚走。
   - 解决方案：将其强制改为 `overflow-visible` 且高度自适应，去除了富文本框局部的固定高度，改用网页原生滚动（Window Scroll）。
   - 为工具栏添加漂亮的毛玻璃背景（`backdrop-filter: blur(8px)`），调整其到页面中央吸顶（`top: 80px; z-index: 40; margin: 0 auto; max-width: max-content`），并在顶部全局动作栏增加了微小的底边框，让上下层次更分明。

## 5. 总结
在使用最新的前端框架版本（React 19）时，使用年代久远、包含遗留 DOM 操作的第三方富文本组件（如 react-quill、wangeditor for react）极其容易引发致命白屏。当面临这类问题且用户本身更偏好“简单好用的云文档”体验时，退回最简单、最原生兼容的解决方案（极简轻量级编辑器）是破局的关键。目前白屏问题已彻底解决，且使用体验得到了升华。