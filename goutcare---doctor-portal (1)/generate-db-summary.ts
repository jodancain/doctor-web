import 'dotenv/config';
import { db } from './server/db';
import fs from 'fs';
import path from 'path';

async function generateSummary() {
  const collections = [
    'users',
    'uaRecords',
    'attackRecords',
    'waterRecords',
    'exerciseRecords',
    'medicationReminders',
    'dietRecords'
  ];

  let markdown = '# 数据库汇总 (Database Summary)\n\n';
  markdown += `生成时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
  markdown += `本文档汇总了当前腾讯云 CloudBase 数据库中各个集合（Collection）的记录总数、字段结构推断以及样本数据。\n\n---\n\n`;

  for (const colName of collections) {
    console.log(`Reading collection: ${colName}...`);
    try {
      const countRes = await db.collection(colName).count();
      const total = countRes.total;

      markdown += `## 集合: \`${colName}\`\n`;
      markdown += `- **总记录数**: ${total}\n`;

      if (total > 0) {
        const sampleRes = await db.collection(colName).limit(1).get();
        const sample = sampleRes.data[0];
        
        markdown += `- **字段结构推断**:\n`;
        markdown += '  ```json\n';
        const schema: Record<string, string> = {};
        for (const [key, value] of Object.entries(sample)) {
          if (value === null) {
            schema[key] = 'null';
          } else if (Array.isArray(value)) {
            schema[key] = 'Array';
          } else if (value instanceof Date) {
            schema[key] = 'Date';
          } else if (typeof value === 'object') {
            schema[key] = 'Object';
          } else {
            schema[key] = typeof value;
          }
        }
        markdown += `  ${JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')}\n`;
        markdown += '  ```\n\n';
        
        markdown += `- **数据样本 (1条)**:\n`;
        markdown += '  ```json\n';
        // Hide sensitive password hashes in sample
        if (sample.password) sample.password = '***HIDDEN***';
        if (sample.passwordHash) sample.passwordHash = '***HIDDEN***';
        markdown += `  ${JSON.stringify(sample, null, 2).replace(/\n/g, '\n  ')}\n`;
        markdown += '  ```\n';
      } else {
        markdown += `- **状态**: 当前为空集合\n`;
      }
      markdown += '\n---\n\n';
    } catch (error: any) {
      markdown += `## 集合: \`${colName}\`\n`;
      markdown += `- **状态**: 读取失败 (${error.message})\n\n---\n\n`;
      console.error(`Error reading ${colName}:`, error.message);
    }
  }

  const outputPath = path.join(process.cwd(), 'DATABASE_SUMMARY.md');
  fs.writeFileSync(outputPath, markdown);
  console.log(`\nSuccessfully generated summary at: ${outputPath}`);
  process.exit(0);
}

generateSummary();
