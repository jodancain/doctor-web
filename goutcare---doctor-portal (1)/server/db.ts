/**
 * 数据库抽象层 — MySQL 实现
 *
 * 保持与原 MongoDB/CloudBase 完全相同的链式 API：
 *   db.collection('users').where({...}).orderBy('f','desc').limit(10).get()
 *
 * 迁移仅替换此文件 + 导入 mysql2，其余路由/服务零改动。
 *
 * 环境变量：
 *   MYSQL_URI  mysql://user:pass@host:3306/goutcare
 */

import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

// ─── 连接池 ───

const uri = process.env.MYSQL_URI;
if (!uri) {
  logger.error('MYSQL_URI environment variable is required');
  process.exit(1);
}

const pool: Pool = mysql.createPool(uri);

pool.getConnection().then(conn => {
  logger.info('Connected to MySQL');
  conn.release();
}).catch(err => {
  logger.error({ err }, 'MySQL connection error');
  process.exit(1);
});

// ─── 列缓存（按需加载，避免查不存在的列） ───

const columnCache = new Map<string, Set<string>>();

async function getColumns(table: string): Promise<Set<string>> {
  let cols = columnCache.get(table);
  if (cols) return cols;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  cols = new Set(rows.map(r => r.COLUMN_NAME as string));
  columnCache.set(table, cols);
  return cols;
}

// ─── 查询操作符（兼容 CloudBase _.gt / _.and 等） ───

class DBCommand {
  and(arr: any[]) { return { $and: arr }; }
  or(arr: any[]) { return { $or: arr }; }
  in(arr: any[]) { return { $in: arr }; }
  nin(arr: any[]) { return { $nin: arr }; }
  gt(val: any) { return { $gt: val }; }
  gte(val: any) { return { $gte: val }; }
  lt(val: any) { return { $lt: val }; }
  lte(val: any) { return { $lte: val }; }
  eq(val: any) { return { $eq: val }; }
  neq(val: any) { return { $ne: val }; }
}

export const _ = new DBCommand();

// ─── WHERE 构建器（MongoDB 风格 → SQL） ───

function buildWhere(query: any): { sql: string; params: any[] } {
  if (!query || Object.keys(query).length === 0) return { sql: '1=1', params: [] };

  const parts: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(query)) {
    // $and / $or
    if (key === '$and' || key === '$or') {
      const joiner = key === '$and' ? ' AND ' : ' OR ';
      const subs = (value as any[]).map(sub => buildWhere(sub));
      parts.push(`(${subs.map(s => s.sql).join(joiner)})`);
      for (const s of subs) params.push(...s.params);
      continue;
    }

    const col = `\`${key}\``;

    // null
    if (value === null || value === undefined) {
      parts.push(`${col} IS NULL`);
      continue;
    }

    // RegExp → REGEXP
    if (value instanceof RegExp) {
      parts.push(`${col} REGEXP ?`);
      params.push(value.source);
      continue;
    }

    // 操作符对象: { $gt: v, $lte: v, ... }
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const ops = Object.entries(value);
      // 检测是否是操作符对象（第一个 key 以 $ 开头）
      if (ops.length > 0 && ops[0][0].startsWith('$')) {
        for (const [op, opVal] of ops) {
          switch (op) {
            case '$gt':  parts.push(`${col} > ?`);  params.push(opVal); break;
            case '$gte': parts.push(`${col} >= ?`);  params.push(opVal); break;
            case '$lt':  parts.push(`${col} < ?`);   params.push(opVal); break;
            case '$lte': parts.push(`${col} <= ?`);   params.push(opVal); break;
            case '$eq':  parts.push(`${col} = ?`);   params.push(opVal); break;
            case '$ne':  parts.push(`${col} != ?`);  params.push(opVal); break;
            case '$in': {
              const arr = opVal as any[];
              if (arr.length === 0) { parts.push('0'); break; }
              parts.push(`${col} IN (${arr.map(() => '?').join(',')})`);
              params.push(...arr);
              break;
            }
            case '$nin': {
              const arr = opVal as any[];
              if (arr.length === 0) break; // 无排除 → 无条件
              parts.push(`${col} NOT IN (${arr.map(() => '?').join(',')})`);
              params.push(...arr);
              break;
            }
          }
        }
        continue;
      }
    }

    // boolean → 0/1
    if (typeof value === 'boolean') {
      parts.push(`${col} = ?`);
      params.push(value ? 1 : 0);
      continue;
    }

    // 简单相等
    parts.push(`${col} = ?`);
    params.push(value);
  }

  if (parts.length === 0) return { sql: '1=1', params: [] };
  return { sql: parts.join(' AND '), params };
}

// ─── 序列化值（JS → MySQL） ───

function serializeValue(val: any): any {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (Array.isArray(val) || (typeof val === 'object' && val.constructor === Object)) {
    return JSON.stringify(val);
  }
  return val;
}

// ─── Collection 链式查询 ───

class Collection {
  constructor(
    private tableName: string,
    private _query: any = {},
    private _limitVal?: number,
    private _skipVal?: number,
    private _orderByArr: Array<{ field: string; dir: number }> = [],
    private _fieldSpec?: any,
  ) {}

  where(q: any): Collection {
    return new Collection(this.tableName, { ...this._query, ...q }, this._limitVal, this._skipVal, [...this._orderByArr], this._fieldSpec);
  }

  doc(id: any): Collection {
    const idStr = Array.isArray(id) ? id[0] : String(id);
    return new Collection(this.tableName, { _id: idStr }, this._limitVal, this._skipVal, [...this._orderByArr], this._fieldSpec);
  }

  limit(n: number): Collection {
    return new Collection(this.tableName, this._query, n, this._skipVal, [...this._orderByArr], this._fieldSpec);
  }

  skip(n: number): Collection {
    return new Collection(this.tableName, this._query, this._limitVal, n, [...this._orderByArr], this._fieldSpec);
  }

  orderBy(field: string, direction: 'asc' | 'desc'): Collection {
    const arr = [...this._orderByArr, { field, dir: direction === 'asc' ? 1 : -1 }];
    return new Collection(this.tableName, this._query, this._limitVal, this._skipVal, arr, this._fieldSpec);
  }

  field(projection: any): Collection {
    return new Collection(this.tableName, this._query, this._limitVal, this._skipVal, [...this._orderByArr], projection);
  }

  // ─── READ ───

  async get(): Promise<{ data: any[] }> {
    const { sql: where, params } = buildWhere(this._query);
    let query = `SELECT * FROM \`${this.tableName}\` WHERE ${where}`;

    if (this._orderByArr.length > 0) {
      query += ' ORDER BY ' + this._orderByArr.map(o => `\`${o.field}\` ${o.dir === 1 ? 'ASC' : 'DESC'}`).join(', ');
    }

    if (this._limitVal !== undefined) {
      query += ` LIMIT ${this._limitVal}`;
    }
    if (this._skipVal) {
      if (this._limitVal === undefined) query += ' LIMIT 18446744073709551615';
      query += ` OFFSET ${this._skipVal}`;
    }

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    let data = rows.map(row => ({ ...row }));

    // 应用字段排除（如 { password: 0 }）
    if (this._fieldSpec) {
      data = data.map(row => {
        const r = { ...row };
        for (const [key, include] of Object.entries(this._fieldSpec)) {
          if (!include) delete r[key];
        }
        return r;
      });
    }

    return { data };
  }

  // ─── COUNT ───

  async count(): Promise<{ total: number }> {
    const { sql: where, params } = buildWhere(this._query);
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM \`${this.tableName}\` WHERE ${where}`,
      params,
    );
    return { total: rows[0].total };
  }

  // ─── INSERT ───

  async add(doc: any): Promise<{ _id: string; id: string }> {
    const id = doc._id || uuidv4();
    const columns = await getColumns(this.tableName);

    const fullDoc = { ...doc, _id: id };
    const entries = Object.entries(fullDoc)
      .filter(([k, v]) => columns.has(k) && v !== undefined);

    const cols = entries.map(([k]) => `\`${k}\``).join(', ');
    const placeholders = entries.map(() => '?').join(', ');
    const values = entries.map(([, v]) => serializeValue(v));

    await pool.query(`INSERT INTO \`${this.tableName}\` (${cols}) VALUES (${placeholders})`, values);
    return { _id: id, id };
  }

  // ─── UPDATE ───

  async update(updates: any): Promise<{ updated: number }> {
    // 支持显式 $set（兼容 MongoDB 写法）
    let fields: Record<string, any> = updates;
    if (updates.$set) fields = updates.$set;
    fields = Object.fromEntries(Object.entries(fields).filter(([k]) => !k.startsWith('$')));

    const columns = await getColumns(this.tableName);
    const entries = Object.entries(fields).filter(([k, v]) => columns.has(k) && v !== undefined);
    if (entries.length === 0) return { updated: 0 };

    const setClause = entries.map(([k]) => `\`${k}\` = ?`).join(', ');
    const values = entries.map(([, v]) => serializeValue(v));

    const { sql: where, params: whereParams } = buildWhere(this._query);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE \`${this.tableName}\` SET ${setClause} WHERE ${where}`,
      [...values, ...whereParams],
    );
    return { updated: result.affectedRows };
  }

  // ─── DELETE ───

  async remove(): Promise<{ deleted: number }> {
    const { sql: where, params } = buildWhere(this._query);
    const [result] = await pool.query<ResultSetHeader>(
      `DELETE FROM \`${this.tableName}\` WHERE ${where}`,
      params,
    );
    return { deleted: result.affectedRows };
  }

  // ─── AGGREGATE（兼容占位，服务端 .ts 未使用） ───

  aggregate() {
    return new AggregateBuilder(this.tableName);
  }
}

// ─── 聚合管道（保留 API 兼容，仅供小程序侧 context 使用） ───

class AggregateBuilder {
  private pipeline: any[] = [];
  constructor(private collectionName: string) {}
  match(condition: any) { this.pipeline.push({ $match: condition }); return this; }
  sort(order: any) { this.pipeline.push({ $sort: order }); return this; }
  group(spec: any) { this.pipeline.push({ $group: spec }); return this; }
  replaceRoot(spec: any) { this.pipeline.push({ $replaceRoot: spec }); return this; }
  limit(n: number) { this.pipeline.push({ $limit: n }); return this; }
  skip(n: number) { this.pipeline.push({ $skip: n }); return this; }
  async end(): Promise<{ list: any[] }> {
    logger.warn('Aggregate is not fully supported in SQL mode');
    return { list: [] };
  }
}

// ─── 聚合表达式辅助（保留 API 兼容） ───

const aggregateExpressions = {
  cond: (spec: any) => ({ $cond: spec }),
  eq: (arr: any) => ({ $eq: arr }),
  neq: (arr: any) => ({ $ne: arr }),
  first: (field: any) => ({ $first: field }),
  last: (field: any) => ({ $last: field }),
  sum: (field: any) => ({ $sum: field }),
  avg: (field: any) => ({ $avg: field }),
  max: (field: any) => ({ $max: field }),
  min: (field: any) => ({ $min: field }),
};

// ─── 导出（与原 MongoDB 版本签名完全一致） ───

export const db = {
  collection: (name: string) => new Collection(name),
  command: Object.assign(_, { aggregate: aggregateExpressions }),
  serverDate: () => new Date(),
  RegExp: (opts: { regexp: string; options?: string }) => new RegExp(opts.regexp, opts.options),
};
