

export interface MedicalRecord {
  id: string;
  date: string;
  type: '初诊' | '复诊' | '急诊' | '住院';
  title: string;
  desc: string;
  doctor: string;
  tag?: string;
}

export interface AttackRecord {
  id: string;
  date: string;
  bodyPart: string;
  painLevel: number; // 0-10
  triggers: string[];
}

// --- Medical Folder Types ---
export interface MedicalFolderProfile {
  isInitialized: boolean;
  basicInfo: {
    name: string;
    gender: string;
    birthDate: string;
    height: string; // cm
    weight: string; // kg
    bloodType: string;
  };
  history: string; // 病史记录
  pastHistory: string; // 既往史
  lifestyle: string; // 生活史
  allergies: string[]; // 过敏史 (标签数组)
  familyHistory: string; // 家族史
  medicationHistory: string; // 用药记录
  physicalExam: string; // 体格检查
  labTests: string; // 化验检查
  assessment: string; // 病情评估
  followup: string; // 复诊随访
  healthReport: string; // 健康报告
}

// --- Uric Acid Log Types ---
export interface UricAcidLog {
  id: string;
  value: number;
  date: string;
  time: string;
  status: 'Normal' | 'High' | 'Critical';
}

// --- Water Tracker Types ---
export interface WaterRecord {
  id: string;
  time: string;
  amount: number;
  type: 'cup' | 'bottle' | 'coffee' | 'drink';
}

export interface WaterDaily {
  current: number;
  goal: number;
  records: WaterRecord[];
}

// --- Diet Record Types ---
export interface FoodDatabaseItem {
  id: string;
  name: string;
  calories: number; // kcal per 100g/serving
  purine: 'Low' | 'Medium' | 'High'; // Low < 50, Medium 50-150, High > 150
  type: 'Staple' | 'Meat' | 'Veggie' | 'Fruit' | 'Seafood' | 'Snack';
}

export interface DietLogEntry {
  id: string;
  date: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string;
  foodName: string;
  amount: number; // g or serving
  calories: number;
  purine: 'Low' | 'Medium' | 'High';
}

// --- Article Types ---
export interface Article {
  id: string;
  title: string;
  category: '饮食' | '药物' | '基础' | '生活';
  readTime: string;
  imageUrl: string;
  views: number;
  isNew?: boolean;
}

// Initial Mock Data for Records
let records: MedicalRecord[] = [
    { id: '101', date: '2024-05-15', type: '复诊', title: '病情稳定复查', desc: '尿酸控制达标，无新发关节肿痛。建议继续当前药物维持。', doctor: '李医生' },
    { id: '102', date: '2024-04-02', type: '急诊', title: '急性发作处理', desc: '左足第一跖趾关节红肿热痛2天。主诉疼痛评分8分。', doctor: '王主任', tag: '急性期' },
    { id: '103', date: '2024-01-10', type: '初诊', title: '初次确诊', desc: '发现高尿酸血症1年，首次出现关节疼痛。UA 580umol/L。', doctor: '李医生' }
];

// Initial Mock Data for UA Logs
let uaLogs: UricAcidLog[] = [
  { id: '1', value: 520, date: '2024-01-01', time: '08:00', status: 'Critical' },
  { id: '2', value: 480, date: '2024-02-01', time: '08:30', status: 'High' },
  { id: '3', value: 420, date: '2024-03-01', time: '09:00', status: 'High' },
  { id: '4', value: 390, date: '2024-04-01', time: '08:15', status: 'Normal' },
  { id: '5', value: 375, date: '2024-05-01', time: '08:45', status: 'Normal' },
];

// Initial Mock Data for Attack Records
let attackRecords: AttackRecord[] = [
  { id: '1', date: '2023-11-15', bodyPart: '左第一跖趾', painLevel: 8, triggers: ['饮酒', '海鲜'] },
  { id: '2', date: '2024-02-10', bodyPart: '右膝', painLevel: 6, triggers: ['受凉'] },
  { id: '3', date: '2024-04-02', bodyPart: '左第一跖趾', painLevel: 9, triggers: ['高嘌呤饮食', '熬夜劳累'] }
];

// Initial Mock Data for Water
let todayWater: WaterDaily = {
  current: 800,
  goal: 2000,
  records: [
    { id: '1', time: '08:30', amount: 300, type: 'cup' },
    { id: '2', time: '10:15', amount: 500, type: 'bottle' }
  ]
};

// Mock Food Database
const MOCK_FOOD_DB: FoodDatabaseItem[] = [
  { id: 'f1', name: '米饭', calories: 116, purine: 'Low', type: 'Staple' },
  { id: 'f2', name: '燕麦', calories: 389, purine: 'Medium', type: 'Staple' },
  { id: 'f3', name: '鸡胸肉', calories: 165, purine: 'Medium', type: 'Meat' },
  { id: 'f4', name: '猪肝', calories: 129, purine: 'High', type: 'Meat' },
  { id: 'f5', name: '基围虾', calories: 93, purine: 'High', type: 'Seafood' },
  { id: 'f6', name: '海带', calories: 13, purine: 'High', type: 'Seafood' },
  { id: 'f7', name: '西兰花', calories: 34, purine: 'Low', type: 'Veggie' },
  { id: 'f8', name: '菠菜', calories: 23, purine: 'Medium', type: 'Veggie' },
  { id: 'f9', name: '苹果', calories: 52, purine: 'Low', type: 'Fruit' },
  { id: 'f10', name: '牛奶', calories: 54, purine: 'Low', type: 'Snack' },
  { id: 'f11', name: '啤酒', calories: 43, purine: 'High', type: 'Snack' },
  { id: 'f12', name: '鸡蛋', calories: 143, purine: 'Low', type: 'Meat' },
];

let dietLogs: DietLogEntry[] = [
    { id: 'd1', date: new Date().toISOString().split('T')[0], meal: 'breakfast', foodId: 'f10', foodName: '牛奶', amount: 1, calories: 108, purine: 'Low' },
    { id: 'd2', date: new Date().toISOString().split('T')[0], meal: 'breakfast', foodId: 'f12', foodName: '鸡蛋', amount: 1, calories: 70, purine: 'Low' },
];

// Initial Mock Data for Folder Profile
let folderProfile: MedicalFolderProfile | null = null;

// Initial Mock Data for Articles
const articles: Article[] = [
  { 
    id: '1', 
    title: '痛风患者到底能不能吃豆制品？最新指南解读', 
    category: '饮食', 
    readTime: '3分钟', 
    imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342d5c71df?auto=format&fit=crop&q=80&w=400',
    views: 1205,
    isNew: true 
  },
  { 
    id: '2', 
    title: '急性发作时的“黄金24小时”处理法则', 
    category: '基础', 
    readTime: '5分钟', 
    imageUrl: 'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=400',
    views: 3420 
  },
  { 
    id: '3', 
    title: '非布司他 vs 别嘌醇：医生教你如何选择降酸药', 
    category: '药物', 
    readTime: '8分钟', 
    imageUrl: 'https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=400',
    views: 890 
  },
  { 
    id: '4', 
    title: '每天喝多少水才能有效排酸？', 
    category: '生活', 
    readTime: '2分钟', 
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&q=80&w=400',
    views: 2100 
  },
  { 
    id: '5', 
    title: '低嘌呤饮食食谱推荐：好吃又不升酸', 
    category: '饮食', 
    readTime: '6分钟', 
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=400',
    views: 1560 
  },
];

// --- Methods ---

export const getRecords = () => [...records];

export const getRecordById = (id: string) => records.find(r => r.id === id);

export const addRecord = (record: MedicalRecord) => {
    records = [record, ...records];
};

export const updateRecord = (record: MedicalRecord) => {
    const idx = records.findIndex(r => r.id === record.id);
    if (idx !== -1) records[idx] = record;
};

export const deleteRecord = (id: string) => {
    records = records.filter(r => r.id !== id);
};

// --- Medical Folder Methods ---

export const getMedicalFolderProfile = (): MedicalFolderProfile | null => {
  return folderProfile;
};

export const initMedicalFolder = (data: Partial<MedicalFolderProfile>) => {
  folderProfile = {
    isInitialized: true,
    basicInfo: {
      name: data.basicInfo?.name || '',
      gender: data.basicInfo?.gender || '男',
      birthDate: data.basicInfo?.birthDate || '',
      height: data.basicInfo?.height || '',
      weight: data.basicInfo?.weight || '',
      bloodType: data.basicInfo?.bloodType || '',
    },
    history: '确诊痛风3年，主要发作部位为左侧第一跖趾关节。',
    pastHistory: '无高血压、糖尿病史。',
    lifestyle: '偶尔饮酒，喜爱海鲜。',
    allergies: ['磺胺类药物'],
    familyHistory: '父亲有痛风病史。',
    medicationHistory: '长期服用非布司他 40mg/日。',
    physicalExam: '暂无记录',
    labTests: '暂无记录',
    assessment: '暂无记录',
    followup: '暂无记录',
    healthReport: '暂无记录',
    ...data
  } as MedicalFolderProfile;
};

export const updateMedicalFolderSection = (section: keyof MedicalFolderProfile, value: any) => {
  if (folderProfile) {
    folderProfile = {
      ...folderProfile,
      [section]: value
    };
  }
};

// --- UA Log Methods ---

export const getUALogs = () => [...uaLogs];

export const addUALog = (value: number, date: string, time: string) => {
  let status: 'Normal' | 'High' | 'Critical' = 'Normal';
  if (value > 420) status = 'High';
  if (value > 540) status = 'Critical';
  
  const newLog: UricAcidLog = {
    id: Date.now().toString(),
    value,
    date,
    time,
    status
  };
  uaLogs = [newLog, ...uaLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return newLog;
};

// --- Attack Record Methods ---
export const getAttackRecords = () => [...attackRecords];

export const addAttackRecord = (record: Omit<AttackRecord, 'id'>) => {
    const newRecord = { ...record, id: Date.now().toString() };
    attackRecords = [newRecord, ...attackRecords];
    return newRecord;
};

// --- Water Tracker Methods ---
export const getTodayWater = () => ({ ...todayWater });

export const addWater = (amount: number, type: WaterRecord['type']) => {
  const newRecord: WaterRecord = {
    id: Date.now().toString(),
    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    amount,
    type
  };
  todayWater = {
    ...todayWater,
    current: todayWater.current + amount,
    records: [newRecord, ...todayWater.records]
  };
  return todayWater;
};

// --- Diet Methods ---
export const getFoodDatabase = () => MOCK_FOOD_DB;

export const getDietLogs = (date: string) => dietLogs.filter(log => log.date === date);

export const addDietLog = (entry: Omit<DietLogEntry, 'id'>) => {
    const newEntry = { ...entry, id: Date.now().toString() };
    dietLogs = [...dietLogs, newEntry];
    return newEntry;
}

// --- Article Methods ---
export const getArticles = () => [...articles];
