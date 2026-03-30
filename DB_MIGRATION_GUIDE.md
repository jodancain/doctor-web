# 数据库迁移指南 (WeChat CloudBase to MongoDB)

## 1. 从微信云开发导出数据

1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb) 或 微信开发者工具中的“云开发”面板。
2. 进入 **数据库** 页面。
3. 依次选中以下 8 个集合，点击右上角的 **导出** 按钮：
   - `users`
   - `messages`
   - `uaRecords`
   - `attackRecords`
   - `waterRecords`
   - `exerciseRecords`
   - `medicationReminders`
   - `dietRecords`
4. 导出格式选择 **JSON** 格式，并将导出的文件统一放入服务器的某个目录（如 `./db_exports/`）下，重命名为与集合同名的文件，例如 `users.json`, `uaRecords.json`。

## 2. 准备 Docker 环境

确保您的服务器已经安装了 `docker` 和 `docker-compose`。

在项目根目录下，我们会提供一个 `docker-compose.yml` 文件。首先启动 MongoDB 服务：

```bash
docker-compose up -d mongodb
```

## 3. 将数据导入自建 MongoDB

将步骤 1 导出的 JSON 文件放在项目根目录下的 `db_exports` 文件夹内。
然后执行以下命令，将数据导入 MongoDB 的 `goutcare` 数据库中：

```bash
docker-compose exec mongodb mongoimport --db goutcare --collection users --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/users.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection messages --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/messages.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection uaRecords --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/uaRecords.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection attackRecords --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/attackRecords.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection waterRecords --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/waterRecords.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection exerciseRecords --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/exerciseRecords.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection medicationReminders --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/medicationReminders.json --jsonArray
docker-compose exec mongodb mongoimport --db goutcare --collection dietRecords --authenticationDatabase admin --username admin --password your_secure_password --file /db_exports/dietRecords.json --jsonArray
```

**注意**:
- 云开发导出的 JSON 如果是 NDJSON (每一行一个 JSON 对象)，不要使用 `--jsonArray` 参数。如果导出的整个文件是一个 JSON 数组，请保留 `--jsonArray` 参数。
- 请将 `your_secure_password` 替换为 `docker-compose.yml` 中设置的实际密码。

## 4. 业务兼容性说明

导入后，原有文档的 `_id` 可能会保留其字符串格式（MongoDB 默认 `_id` 是 `ObjectId`，但如果导入文件中显式提供了 `_id` 字符串，MongoDB 会保留）。
同时，微信云数据库原有的 `_openid` 字段也会保留在集合中，后端重构时将依赖这些字段来做用户数据隔离。
