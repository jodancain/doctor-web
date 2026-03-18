import { Patient, FoodItem, Task, ResearchProject, Questionnaire, QuestionnaireRecord } from './types';

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'P001',
    name: '张伟',
    age: 45,
    gender: 'Male',
    lastVisit: '2024-03-10',
    lastUricAcid: 520,
    targetUricAcid: 360,
    diagnosis: '痛风性关节炎 (间歇期)',
    status: 'Risk',
    medication: '非布司他 40mg qd',
    history: [
      { date: '2023-10-01', value: 580 },
      { date: '2023-11-15', value: 550 },
      { date: '2024-01-01', value: 500 },
      { date: '2024-03-10', value: 520 },
    ]
  },
  {
    id: 'P002',
    name: '李建国',
    age: 58,
    gender: 'Male',
    lastVisit: '2024-03-12',
    lastUricAcid: 340,
    targetUricAcid: 360,
    diagnosis: '高尿酸血症',
    status: 'Stable',
    medication: '苯溴马隆 50mg qd',
    history: [
      { date: '2023-09-01', value: 480 },
      { date: '2023-12-01', value: 400 },
      { date: '2024-03-12', value: 340 },
    ]
  },
  {
    id: 'P003',
    name: '王芳',
    age: 62,
    gender: 'Female',
    lastVisit: '2024-02-28',
    lastUricAcid: 410,
    targetUricAcid: 300, // Tophi present
    diagnosis: '痛风石性痛风',
    status: 'Risk',
    medication: '非布司他 40mg qd + 碳酸氢钠',
    history: [
      { date: '2023-08-01', value: 520 },
      { date: '2023-11-01', value: 460 },
      { date: '2024-02-28', value: 410 },
    ]
  },
  {
    id: 'P004',
    name: '陈志强',
    age: 35,
    gender: 'Male',
    lastVisit: '2024-03-14',
    lastUricAcid: 680,
    targetUricAcid: 360,
    diagnosis: '急性痛风发作',
    status: 'Critical',
    medication: '依托考昔 120mg qd',
    history: [
      { date: '2024-03-14', value: 680 },
    ]
  },
  {
    id: 'P005',
    name: '赵强',
    age: 41,
    gender: 'Male',
    lastVisit: '2024-01-15',
    lastUricAcid: 310,
    targetUricAcid: 360,
    diagnosis: '高尿酸血症',
    status: 'Stable',
    medication: '饮食控制',
    history: [
      { date: '2023-06-01', value: 450 },
      { date: '2023-09-01', value: 380 },
      { date: '2024-01-15', value: 310 },
    ]
  }
];

export const MOCK_URIC_DATA = [
  { date: '2023-10', value: 480 },
  { date: '2023-11', value: 460 },
  { date: '2023-12', value: 430 },
  { date: '2024-01', value: 400 },
  { date: '2024-02', value: 380 },
  { date: '2024-03', value: 360 },
];

export const INITIAL_TASKS: Task[] = [
  { id: '1', title: '饮水 2000ml', target: '已完成 1500ml', completed: false, icon: 'water' },
  { id: '2', title: '服用非布司他', target: '40mg / 1次', completed: true, icon: 'pill' },
  { id: '3', title: '低嘌呤午餐', completed: true, icon: 'food' },
  { id: '4', title: '记录今日尿酸', completed: false, icon: 'pill' },
];

export const FOOD_DATABASE: FoodItem[] = [
  { id: '1', name: '鸡胸肉', purineValue: 137, purineLevel: 'medium' },
  { id: '2', name: '西兰花', purineValue: 81, purineLevel: 'low' },
  { id: '3', name: '猪肝', purineValue: 275, purineLevel: 'high' },
  { id: '4', name: '沙丁鱼', purineValue: 480, purineLevel: 'high' },
  { id: '5', name: '牛奶', purineValue: 1.4, purineLevel: 'low' },
  { id: '6', name: '豆腐', purineValue: 55, purineLevel: 'low' },
  { id: '7', name: '基围虾', purineValue: 180, purineLevel: 'high' },
  { id: '8', name: '米饭', purineValue: 18, purineLevel: 'low' },
  { id: '9', name: '生蚝', purineValue: 239, purineLevel: 'high' },
  { id: '10', name: '黄瓜', purineValue: 11, purineLevel: 'low' },
];

export const MOCK_PROJECTS: ResearchProject[] = [
  {
    id: 'RP001',
    name: 'PAID-001 SLE穿戴研究',
    periodValue: '2',
    periodUnit: '年',
    targetCount: 30,
    enrolledCount: 11,
    description: '旨在评估低嘌呤饮食结合运动对早期高尿酸血症患者的长期影响。',
    status: 'Recruiting',
    createDate: '2025-03-25 10:03:58'
  },
  {
    id: 'RP002',
    name: '111',
    periodValue: '3',
    periodUnit: '月',
    targetCount: 1,
    enrolledCount: 0,
    description: '多中心、回顾性队列研究，分析不同药物在亚裔人群中的安全性。',
    status: 'Pending',
    createDate: '2025-10-14 15:26:50'
  }
];

export const MOCK_QUESTIONNAIRES: Questionnaire[] = [
  {
    id: 'Q001',
    title: 'SF-36 生活质量量表',
    type: 'Scale',
    questionCount: 2,
    status: 'Published',
    updateDate: '2024-01-15',
    usageCount: 128,
    questions: [
      {
        id: 'q1',
        type: 'single_choice',
        title: '总体来说，您认为您目前的健康状况是：',
        required: true,
        options: [
          { id: 'o1', label: '极好' },
          { id: 'o2', label: '很好' },
          { id: 'o3', label: '好' },
          { id: 'o4', label: '一般' },
          { id: 'o5', label: '差' }
        ]
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: '和一年前相比，您认为您目前的健康状况如何？',
        required: true,
        options: [
          { id: 'o1', label: '比一年前好多了' },
          { id: 'o2', label: '比一年前好一些' },
          { id: 'o3', label: '和一年前差不多' },
          { id: 'o4', label: '比一年前差一些' },
          { id: 'o5', label: '比一年前差多了' }
        ]
      }
    ]
  },
  {
    id: 'Q002',
    title: '痛风患者饮食习惯调查',
    type: 'Survey',
    questionCount: 2,
    status: 'Published',
    updateDate: '2024-03-01',
    usageCount: 45,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        title: '您平时经常食用的肉类有哪些？（多选）',
        required: true,
        options: [
          { id: 'o1', label: '猪肉' },
          { id: 'o2', label: '牛肉' },
          { id: 'o3', label: '鸡肉' },
          { id: 'o4', label: '海鲜' },
          { id: 'o5', label: '动物内脏' }
        ]
      },
      {
        id: 'q2',
        type: 'text',
        title: '请简述您近期的饮食调整情况：',
        required: false
      }
    ]
  },
  {
    id: 'Q003',
    title: 'VAS 疼痛评分表',
    type: 'Scale',
    questionCount: 1,
    status: 'Draft',
    updateDate: '2024-03-20',
    usageCount: 0,
    questions: [
      {
        id: 'q1',
        type: 'rating',
        title: '请对您目前的关节疼痛程度进行评分（1-5分）：',
        required: true
      }
    ]
  }
];

export const MOCK_QUESTIONNAIRE_RECORDS: QuestionnaireRecord[] = [
  {
    id: 'R001',
    questionnaireName: 'SF-36 生活质量量表',
    patientName: '张伟',
    patientId: 'P001',
    submitDate: '2024-03-10 14:30',
    score: 85,
    result: '生活质量良好',
    status: 'Completed',
    answers: [
      { questionId: 'q1', questionTitle: '总体来说，您认为您目前的健康状况是：', type: 'single_choice', value: '很好' },
      { questionId: 'q2', questionTitle: '和一年前相比，您认为您目前的健康状况如何？', type: 'single_choice', value: '和一年前差不多' }
    ]
  },
  {
    id: 'R002',
    questionnaireName: '痛风患者饮食习惯调查',
    patientName: '李建国',
    patientId: 'P002',
    submitDate: '2024-03-12 09:15',
    result: '高嘌呤饮食摄入频繁',
    status: 'Completed',
    answers: [
      { questionId: 'q1', questionTitle: '您平时经常食用的肉类有哪些？（多选）', type: 'multiple_choice', value: ['猪肉', '海鲜', '动物内脏'] },
      { questionId: 'q2', questionTitle: '请简述您近期的饮食调整情况：', type: 'text', value: '最近应酬比较多，没怎么控制。' }
    ]
  },
  {
    id: 'R003',
    questionnaireName: 'SF-36 生活质量量表',
    patientName: '陈志强',
    patientId: 'P004',
    submitDate: '2024-03-14 10:00',
    score: 42,
    result: '急性发作期，生活受限',
    status: 'Completed',
    answers: [
      { questionId: 'q1', questionTitle: '总体来说，您认为您目前的健康状况是：', type: 'single_choice', value: '差' },
      { questionId: 'q2', questionTitle: '和一年前相比，您认为您目前的健康状况如何？', type: 'single_choice', value: '比一年前差多了' }
    ]
  }
];