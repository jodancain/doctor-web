export interface UricAcidRecord {
  date: string;
  value: number; // μmol/L
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  lastVisit: string;
  lastUricAcid: number; // μmol/L
  targetUricAcid: number;
  diagnosis: string;
  status: 'Stable' | 'Risk' | 'Critical';
  medication: string;
  history: UricAcidRecord[];
}

export type PageView = 'dashboard' | 'patients' | 'ai-consult' | 'settings';

export interface FoodItem {
  id: string;
  name: string;
  purineValue: number; // mg/100g
  purineLevel: 'low' | 'medium' | 'high';
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  target?: string;
  icon?: 'water' | 'pill' | 'food';
}

export interface ResearchProject {
  id: string;
  name: string;
  periodValue: string;
  periodUnit: string;
  targetCount: number;
  enrolledCount: number;
  description: string;
  status: 'Recruiting' | 'Pending' | 'Completed';
  createDate: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  type: 'Scale' | 'Survey'; // 量表 or 调查问卷
  questionCount: number;
  status: 'Published' | 'Draft';
  updateDate: string;
  usageCount: number;
}

export interface QuestionnaireRecord {
  id: string;
  questionnaireName: string;
  patientName: string;
  patientId: string;
  submitDate: string;
  score?: number; // 如果是量表
  result: string; // 结论简述
  status: 'Completed' | 'Incomplete';
}