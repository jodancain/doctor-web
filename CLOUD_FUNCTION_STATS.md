# 云端统计能力说明

`healthDataService` 云函数在服务端完成所有健康指标的聚合统计，前端仅负责渲染结果。该方案示范了以下能力：

1. **服务端计算**：在云函数中执行聚合与时间窗口计算，避免前端拉取大量原始数据。
2. **云数据库查询**：按 `_openid`、时间区间等条件检索 `uaRecords`、`attackRecords`、`waterRecords` 等集合。
3. **统一响应**：所有统计接口返回 `{ code, msg, data }`，方便前端复用错误处理。
4. **安全控制**：敏感逻辑全部在云函数端执行，前端看不到数据库读写细节。

## 统计指标

### `getHomeSummary`
- **latestUaValue / latestUaTimestamp**：最近一次尿酸记录。
- **attackCount7d**：近 7 天发作次数。
- **waterTotal7d**：近 7 天饮水总量（毫升）。
- **exerciseMinutes7d**：近 7 天运动总时长（分钟）。
- **medicationCount**：用药提醒数量，用于提示是否需要补充提醒。

### `getDashboardData`
- **summary**：包含 `attackCount`、`waterTotal`、`exerciseTotal`、`latestUa` 及时间戳。
- **dietBreakdown**：近 7 天饮食记录按颜色（绿/黄/红）汇总后的数量。
- **timeline**：7 天时间线，每天的发作次数、饮水量、运动时长，方便折线/柱状图展示。

## 代码结构
```
cloudfunctions/healthDataService/
├── index.js              # 入口，转发至 handler
└── src/
    ├── handler.js        # 根据 type 调度
    ├── services/
    │   ├── record-service.js      # CRUD 校验与写入
    │   ├── statistics-service.js  # 聚合逻辑（getHomeSummary/getDashboardData）
    │   └── storage-service.js     # 二维码 & 云存储示例
    ├── models/record-model.js     # 数据库封装、查询条件
    └── utils/                    # cloud/logger/response/time/context
```

## 使用步骤

1. **部署云函数**：在微信开发者工具右键 `cloudfunctions/healthDataService` →「上传并部署：云端安装依赖」。
2. **创建集合**：在云开发控制台创建 `uaRecords`、`attackRecords`、`waterRecords`、`exerciseRecords`、`medicationReminders`、`dietRecords`。
3. **前端调用**：
   ```js
   const { fetchDashboardData } = require('../../services/statistics');
   const data = await fetchDashboardData();
   this.setData({ summary: data.summary });
   ```
4. **验证数据**：在对应记录页面写入数据后，返回首页/数据看板即可看到 7 日统计。

## 云函数优势
- **性能优化**：复杂聚合发生在服务端，前端只渲染小体量结果。
- **一致性**：所有页面调用同一云函数，避免重复实现。
- **安全**：数据库查询条件和校验逻辑封装在云端，前端只传递必要参数。
- **可扩展**：可在 `statistics-service.js` 新增更多指标（例如 30 日趋势、达标率）。

## 注意事项
1. 云函数改动后务必重新部署并确认环境 ID 正确。
2. 若统计结果长期为 0，请检查近 7 天是否存在记录，并确认用户账号（`_openid`）一致。
3. 高并发场景建议为 `timestamp` 字段添加索引，提升查询性能。
4. 如需接入图表库，可直接使用 `timeline` 数据，避免在前端重新聚合。
