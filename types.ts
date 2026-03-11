
export enum UserRole {
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

export type Subject = string;

export type DayName = 'Day 1' | 'Day 2' | 'Day 3' | 'Day 4' | 'Day 5';

export interface DayEntry {
  period: number; 
  classwork: string;
  homework: string;
  items: string;
  tests: string;
  events: string;
}

export interface WeeklyPlanFooter {
  quranSurah: string;
  valueOfWeek: string;
  notes: string;
}

export interface WeeklyPlan {
  id: string; // Composite key: subject-grade-week
  subject: Subject;
  grade: string;
  weekNum: number;
  startDate: string; // ISO Date string
  endDate: string; // ISO Date string
  days: Record<DayName, DayEntry>;
  footer: WeeklyPlanFooter;
  lastUpdated: number;
}

export interface AnalyticsData {
  completionRate: number;
  totalTests: number;
  totalHomework: number;
  classesPlanned: number;
}

export interface GlobalSettings {
  announcement: string;
  schoolName?: string;
  schoolLogo?: string; // Base64 string
  customSubjects?: string[];
  customGrades?: string[];
}
