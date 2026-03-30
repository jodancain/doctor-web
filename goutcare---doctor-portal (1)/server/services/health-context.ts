/**
 * 健康上下文聚合服务 — 插件式采集器架构
 *
 * 按角色过滤数据范围：
 *   patient  → 仅自己的基础数据
 *   doctor   → 患者详细档案（含问卷、依从性）
 *   admin    → 全部 + 系统统计
 *   external → 最全（含对话摘要、AI 指标等）
 */

import { db, _ } from '../db';
import { logger } from '../logger';

// ─── 角色枚举 ───

export enum Role {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
  EXTERNAL = 'external',
}

// ─── 采集器接口 ───

export interface CollectorResult {
  text: string;   // 自然语言摘要（注入 AI system message）
  json: Record<string, any>;  // 结构化数据（Open API 返回）
}

export interface HealthDataCollector {
  name: string;
  priority: number;        // 越小越靠前
  accessLevel: Role[];     // 哪些角色可见
  collect(patientOpenid: string): Promise<CollectorResult>;
}

// ─── 工具函数 ───

function daysAgo(n: number): number {
  return Date.now() - n * 24 * 60 * 60 * 1000;
}

function calcAge(birthDate: string | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function calcBMI(height: number | undefined, weight: number | undefined): string | null {
  if (!height || !weight || height <= 0) return null;
  const h = height / 100; // cm → m
  const bmi = weight / (h * h);
  const val = bmi.toFixed(1);
  if (bmi < 18.5) return `${val}（偏瘦）`;
  if (bmi < 24) return `${val}（正常）`;
  if (bmi < 28) return `${val}（超重）`;
  return `${val}（肥胖）`;
}

function trendText(values: number[]): string {
  if (values.length < 2) return '数据不足';
  const diffs = values.slice(0, -1).map((v, i) => v - values[i + 1]);
  const allUp = diffs.every(d => d > 0);
  const allDown = diffs.every(d => d < 0);
  if (allUp) return '上升';
  if (allDown) return '下降';
  return '波动';
}

function fmtDate(ts: any): string {
  if (!ts) return '未知';
  const d = new Date(typeof ts === 'number' ? ts : ts);
  if (isNaN(d.getTime())) return '未知';
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── 采集器实现 ───

class ProfileCollector implements HealthDataCollector {
  name = 'profile';
  priority = 1;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const { data } = await db.collection('users').where({ _openid: openid }).limit(1).get();
    const u = data[0];
    if (!u) return { text: '', json: {} };

    const age = calcAge(u.birthDate);
    const bmi = calcBMI(u.height, u.weight);
    const gender = u.gender || '未知';
    const diagYears = u.diagnosisYear ? (new Date().getFullYear() - Number(u.diagnosisYear)) : null;

    const parts = [`${gender}`];
    if (age) parts.push(`${age}岁`);
    if (bmi) parts.push(`BMI ${bmi}`);
    if (diagYears !== null && diagYears >= 0) parts.push(`确诊${diagYears}年`);

    return {
      text: `基本信息：${parts.join('，')}`,
      json: {
        gender,
        age,
        bmi: u.height && u.weight ? +(u.weight / ((u.height / 100) ** 2)).toFixed(1) : null,
        diagnosisYears: diagYears,
        height: u.height || null,
        weight: u.weight || null,
        nickName: u.nickName || u.name || null,
      }
    };
  }
}

class UricAcidCollector implements HealthDataCollector {
  name = 'uricAcid';
  priority = 2;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const { data } = await db.collection('uaRecords')
      .where({ _openid: openid })
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    if (data.length === 0) return { text: '最近尿酸：暂无记录', json: { latest: null, history: [], trend: null } };

    const values = data.map((r: any) => r.value);
    const trend = trendText(values);
    const historyStr = data.map((r: any) => `${r.value}（${fmtDate(r.timestamp)}）`).join(' → ');

    return {
      text: `最近尿酸：${historyStr}，趋势：${trend}`,
      json: {
        latest: { value: data[0].value, date: fmtDate(data[0].timestamp), unit: 'μmol/L' },
        history: data.map((r: any) => ({ value: r.value, date: fmtDate(r.timestamp) })),
        trend,
      }
    };
  }
}

class AttackCollector implements HealthDataCollector {
  name = 'attacks';
  priority = 3;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const cutoff = daysAgo(90);
    const { data } = await db.collection('attackRecords')
      .where(_.and([{ _openid: openid }, { timestamp: _.gte(cutoff) }]))
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    if (data.length === 0) return { text: '近90天发作：0次', json: { last90Days: [], count: 0 } };

    // 统计诱因频率
    const triggerMap: Record<string, number> = {};
    const jointMap: Record<string, number> = {};
    for (const r of data) {
      for (const t of (r.triggers || [])) { triggerMap[t] = (triggerMap[t] || 0) + 1; }
      for (const j of (r.joints || r.originalJoints || [])) { jointMap[j] = (jointMap[j] || 0) + 1; }
    }
    const topTriggers = Object.entries(triggerMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);

    const detailStr = data.slice(0, 3).map((r: any) => {
      const joints = (r.joints || r.originalJoints || []).join('/') || '未记录';
      const pain = r.painLevel ? ` 疼痛${r.painLevel}/10` : '';
      return `${joints}${pain}（${fmtDate(r.timestamp)}）`;
    }).join('，');

    const triggerStr = topTriggers.length > 0 ? `\n常见诱因：${topTriggers.join('、')}` : '';

    return {
      text: `近90天发作：${data.length}次（${detailStr}）${triggerStr}`,
      json: {
        count: data.length,
        last90Days: data.map((r: any) => ({
          date: fmtDate(r.timestamp),
          joints: r.joints || r.originalJoints || [],
          painLevel: r.painLevel || null,
          triggers: r.triggers || [],
          duration: r.duration || null,
        })),
        topTriggers,
      }
    };
  }
}

class MedicationCollector implements HealthDataCollector {
  name = 'medications';
  priority = 4;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    // 获取近30天的用药记录
    const cutoff = daysAgo(30);
    const { data } = await db.collection('medicationReminders')
      .where(_.and([{ _openid: openid }, { timestamp: _.gte(cutoff) }]))
      .orderBy('timestamp', 'desc')
      .limit(50)
      .get();

    if (data.length === 0) return { text: '当前用药：暂无记录', json: { active: [], compliance7d: null } };

    // 按药名分组，取最近的
    const medMap: Record<string, any> = {};
    for (const r of data) {
      const name = r.name || '未知药物';
      if (!medMap[name]) medMap[name] = r;
    }

    const meds = Object.values(medMap);
    const medStr = meds.map((m: any) => {
      const parts = [m.name || '未知'];
      if (m.dosage) parts.push(m.dosage);
      if (m.frequency) parts.push(m.frequency);
      return parts.join(' ');
    }).join('；');

    // 近7天依从性
    const cutoff7 = daysAgo(7);
    const recent7 = data.filter((r: any) => (r.timestamp || r.createdAt) >= cutoff7);
    const taken = recent7.filter((r: any) => r.status === 'taken').length;

    return {
      text: `当前用药：${medStr}` + (recent7.length > 0 ? `\n依从性：近7天用药记录${taken}/${recent7.length}` : ''),
      json: {
        active: meds.map((m: any) => ({
          name: m.name, dosage: m.dosage || null, frequency: m.frequency || null,
        })),
        compliance7d: recent7.length > 0 ? { taken, total: recent7.length, rate: +(taken / recent7.length).toFixed(2) } : null,
      }
    };
  }
}

class WaterCollector implements HealthDataCollector {
  name = 'water';
  priority = 5;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const cutoff = daysAgo(7);
    const { data } = await db.collection('waterRecords')
      .where(_.and([{ _openid: openid }, { timestamp: _.gte(cutoff) }]))
      .get();

    const total = data.reduce((s: number, r: any) => s + (r.amount || r.volume || 0), 0);
    const days = Math.max(1, Math.min(7, new Set(data.map((r: any) => fmtDate(r.timestamp))).size));
    const avg = Math.round(total / days);

    return {
      text: `近7天饮水：日均${avg}ml（目标2000ml）`,
      json: { dailyAvgMl: avg, totalMl: total, days, targetMl: 2000 },
    };
  }
}

class ExerciseCollector implements HealthDataCollector {
  name = 'exercise';
  priority = 6;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const cutoff = daysAgo(7);
    const { data } = await db.collection('exerciseRecords')
      .where(_.and([{ _openid: openid }, { timestamp: _.gte(cutoff) }]))
      .get();

    const total = data.reduce((s: number, r: any) => s + (r.duration || 0), 0);
    const days = Math.max(1, Math.min(7, new Set(data.map((r: any) => fmtDate(r.timestamp))).size));
    const avg = Math.round(total / days);

    return {
      text: `近7天运动：日均${avg}分钟`,
      json: { dailyAvgMin: avg, totalMin: total, days },
    };
  }
}

class DietCollector implements HealthDataCollector {
  name = 'diet';
  priority = 7;
  accessLevel = [Role.PATIENT, Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];

  async collect(openid: string): Promise<CollectorResult> {
    const cutoff = daysAgo(7);
    const { data } = await db.collection('dietRecords')
      .where(_.and([{ _openid: openid }, { timestamp: _.gte(cutoff) }]))
      .get();

    if (data.length === 0) return { text: '近7天饮食：暂无记录', json: { low: 0, medium: 0, high: 0 } };

    // 按嘌呤等级分类（字段可能叫 purineLevel / level / category）
    let low = 0, medium = 0, high = 0;
    for (const r of data) {
      const level = r.purineLevel || r.level || r.category || '';
      if (/高|high|red/.test(String(level))) high++;
      else if (/中|medium|yellow/.test(String(level))) medium++;
      else low++;
    }

    return {
      text: `近7天饮食：低嘌呤${low}次 中嘌呤${medium}次 高嘌呤${high}次`,
      json: { low, medium, high, total: data.length },
    };
  }
}

class QuestionnaireCollector implements HealthDataCollector {
  name = 'questionnaire';
  priority = 8;
  accessLevel = [Role.DOCTOR, Role.ADMIN, Role.EXTERNAL];  // 患者端不显示

  async collect(openid: string): Promise<CollectorResult> {
    const { data } = await db.collection('questionnaireRecords')
      .where({ _openid: openid })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (data.length === 0) return { text: '', json: { recent: [] } };

    const q = data[0];
    const name = q.questionnaireName || '问卷';
    const date = fmtDate(q.submittedAt || q.createdAt);

    return {
      text: `问卷：最近一次「${name}」（${date}）`,
      json: {
        recent: [{
          name,
          date,
          answers: q.answers || [],
        }]
      },
    };
  }
}

class ServerStatsCollector implements HealthDataCollector {
  name = 'serverStats';
  priority = 100;
  accessLevel = [Role.ADMIN, Role.EXTERNAL];

  async collect(_openid: string): Promise<CollectorResult> {
    const [usersCount, patientsCount, doctorsCount] = await Promise.all([
      db.collection('users').count(),
      db.collection('users').where({ role: 'user' }).count(),
      db.collection('users').where({ role: 'doctor' }).count(),
    ]);

    const cutoff7 = daysAgo(7);
    const activeResult = await db.collection('users')
      .where({ lastLoginAt: _.gte(cutoff7) })
      .count();

    return {
      text: `系统概况：注册${usersCount.total}人（患者${patientsCount.total}，医生${doctorsCount.total}），7天活跃${activeResult.total}人`,
      json: {
        totalUsers: usersCount.total,
        patients: patientsCount.total,
        doctors: doctorsCount.total,
        activeUsers7d: activeResult.total,
      },
    };
  }
}

// ─── 采集器注册表 ───

const collectors: HealthDataCollector[] = [
  new ProfileCollector(),
  new UricAcidCollector(),
  new AttackCollector(),
  new MedicationCollector(),
  new WaterCollector(),
  new ExerciseCollector(),
  new DietCollector(),
  new QuestionnaireCollector(),
  new ServerStatsCollector(),
  // 后续可在此追加新采集器
];

// ─── 核心导出函数 ───

export interface HealthContextOptions {
  format?: 'text' | 'json';
  collectors?: string[];  // 指定只运行某些采集器
}

export async function getHealthContext(
  patientOpenid: string,
  role: Role,
  options: HealthContextOptions = {}
): Promise<string | Record<string, any>> {
  const { format = 'text', collectors: onlyCollectors } = options;

  // 过滤：按角色 + 按指定名称
  const active = collectors
    .filter(c => c.accessLevel.includes(role))
    .filter(c => !onlyCollectors || onlyCollectors.includes(c.name))
    .sort((a, b) => a.priority - b.priority);

  // 并行执行所有采集器
  const results = await Promise.all(
    active.map(async (c) => {
      try {
        return { name: c.name, result: await c.collect(patientOpenid) };
      } catch (err) {
        logger.error({ err, collector: c.name }, 'Health context collector error');
        return { name: c.name, result: { text: '', json: {} } };
      }
    })
  );

  if (format === 'json') {
    const json: Record<string, any> = { version: '1.0', generatedAt: new Date().toISOString() };
    for (const { name, result } of results) {
      json[name] = result.json;
    }
    return json;
  }

  // text 格式 — 生成自然语言摘要
  const header = role === Role.PATIENT ? '【我的健康档案】' : '【患者健康档案】';
  const lines = results.map(r => r.result.text).filter(Boolean);
  return `${header}\n${lines.join('\n')}`;
}

// ─── 导出采集器注册方法（供外部扩展） ───

export function registerCollector(collector: HealthDataCollector): void {
  collectors.push(collector);
  collectors.sort((a, b) => a.priority - b.priority);
}
