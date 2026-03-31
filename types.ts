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

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'rating';
  title: string;
  options?: QuestionOption[];
  required: boolean;
}

export interface Questionnaire {
  id: string;
  title: string;
  type: 'Scale' | 'Survey'; // 量表 or 调查问卷
  questionCount: number;
  status: 'Published' | 'Draft';
  updateDate: string;
  usageCount: number;
  questions?: Question[];
}

export interface QuestionnaireAnswer {
  questionId: string;
  questionTitle: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'rating';
  value: string | string[] | number; // text/single -> string, multiple -> string[], rating -> number
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
  answers?: QuestionnaireAnswer[];
}

export interface PatientTask {
  id: string;
  patientId: string;
  patientName: string;
  taskType: 'questionnaire';
  referenceId: string;
  title: string;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'doctor' | 'patient';
  senderName: string;
  content: string;
  type: 'text' | 'image';
  createdAt: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
}