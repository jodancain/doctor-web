<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GoutCare Doctor Portal 痛风医生端管理系统

痛风医生端管理系统（Web端）是一个用于医生管理痛风患者、科研项目、随访问卷、系统权限以及医院宣教知识库的综合平台。

## 核心功能更新

*   **用户管理 (User Management)**：支持对系统内多角色账号的增删改查、状态启停、机构筛选等操作，详见 [USER_MANAGEMENT_DESIGN.md](./USER_MANAGEMENT_DESIGN.md)。
*   **医院宣教 (Hospital Education)**：支持 Web 端发布、管理患者端的健康科普文章知识库，实现多分类（饮食、药物、基础、生活）、多状态发布管理，详见 [HOSPITAL_EDUCATION_DESIGN.md](./HOSPITAL_EDUCATION_DESIGN.md)。
*   **文章编辑器 (Article Editor)**：针对医院宣教功能，设计了一套富文本整页编辑、右侧实时手机模拟预览的优化方案，详见 [ARTICLE_EDITOR_DESIGN.md](./ARTICLE_EDITOR_DESIGN.md)。

## 数据库/存储相关配置

如果您需要配置系统相关的数据，可以参考以下教程：
*   [知识库数据库配置教程 (DATABASE_EDUCATION_SETUP.md)](./DATABASE_EDUCATION_SETUP.md)
*   [知识库Debug日志 (DEBUG_HOSPITAL_EDUCATION.md)](./DEBUG_HOSPITAL_EDUCATION.md)
*   [文章编辑器白屏Debug日志 (DEBUG_ARTICLE_EDITOR.md)](./DEBUG_ARTICLE_EDITOR.md)
*   [部署指南 (DEPLOY_GUIDE.md)](./DEPLOY_GUIDE.md)

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
