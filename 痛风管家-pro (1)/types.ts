export type Role = 'patient' | 'doctor';

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: Role;
}

export interface UricAcidRecord {
  id: string;
  value: number; // µmol/L
  date: string;
  status: 'Normal' | 'High' | 'Critical';
}

export interface AttackRecord {
  id: string;
  date: string;
  bodyPart: string;
  painLevel: number; // 0-10
  triggers: string[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  nextDose: string;
  taken: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  purineLevel: 'Low' | 'Medium' | 'High';
  calories: number;
}

export interface WaterLog {
  current: number;
  target: number;
  history: { time: string; amount: number }[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  type: 'log' | 'read' | 'drink' | 'med';
  points: number;
}

export interface Article {
  id: string;
  title: string;
  category: string;
  readTime: string;
  imageUrl: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface PatientProfile extends User {
  age: number;
  gender: 'Male' | 'Female';
  diagnosisDate: string;
  currentUricAcid: number;
  targetUricAcid: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastAttack?: string;
}

export interface DoctorStats {
  totalPatients: number;
  activePatients: number;
  controlRate: number;
  highRiskCount: number;
}