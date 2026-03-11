
import { WeeklyPlan, Subject, DayName, GlobalSettings } from '../types';
import { DAYS, EMPTY_DAY_ENTRY, DEFAULT_SUBJECTS, DEFAULT_GRADES } from '../constants';

const STORAGE_KEY = 'al_muallim_plans_v5';
const SETTINGS_KEY = 'al_muallim_settings';

export const getPlans = (): WeeklyPlan[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading from local storage", e);
    return [];
  }
};

export const savePlan = (plan: WeeklyPlan): void => {
  const plans = getPlans();
  const index = plans.findIndex(p => p.id === plan.id);
  
  if (index >= 0) {
    plans[index] = plan;
  } else {
    plans.push(plan);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
};

export const getSettings = (): GlobalSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    const parsed = data ? JSON.parse(data) : {};
    return {
      announcement: parsed.announcement || '',
      schoolName: parsed.schoolName || '',
      schoolLogo: parsed.schoolLogo || '',
      customSubjects: parsed.customSubjects,
      customGrades: parsed.customGrades
    };
  } catch {
    return { announcement: '', schoolName: '', schoolLogo: '' };
  }
};

export const getSubjects = (): string[] => {
  const settings = getSettings();
  return settings.customSubjects && settings.customSubjects.length > 0 
    ? settings.customSubjects 
    : DEFAULT_SUBJECTS;
};

export const getGrades = (): string[] => {
  const settings = getSettings();
  return settings.customGrades && settings.customGrades.length > 0
    ? settings.customGrades
    : DEFAULT_GRADES;
};

export const saveSettings = (settings: GlobalSettings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Dispatch custom event to notify components (like Layout) to update
  window.dispatchEvent(new Event('settingsUpdated'));
};

export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  window.location.reload();
};

export const createBackup = (): void => {
  const data = {
    plans: getPlans(),
    settings: getSettings(),
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `al_muallim_backup_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const restoreBackup = (file: File, callback: (success: boolean) => void): void => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = JSON.parse(e.target?.result as string);
      if (json.plans) localStorage.setItem(STORAGE_KEY, JSON.stringify(json.plans));
      if (json.settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(json.settings));
        window.dispatchEvent(new Event('settingsUpdated'));
      }
      callback(true);
    } catch (err) {
      console.error(err);
      callback(false);
    }
  };
  reader.readAsText(file);
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNextSunday = (): Date => {
  const date = new Date();
  const day = date.getDay(); // 0 is Sunday
  // Calculate days until next Sunday.
  // If today is Sunday (0), we want next Sunday (7 days away).
  // If today is Saturday (6), we want tomorrow (1 day away).
  let diff = 7 - day;
  
  date.setDate(date.getDate() + diff);
  return date;
};

export const getPlanById = (subject: Subject, grade: string, week: number): WeeklyPlan => {
  const plans = getPlans();
  const id = `${subject}-${grade}-${week}`;
  const existing = plans.find(p => p.id === id);

  if (existing) return existing;

  const nextSunday = getNextSunday();
  const nextThursday = new Date(nextSunday);
  nextThursday.setDate(nextSunday.getDate() + 4); // Assuming 5 day work week (Sun-Thu)

  const startDate = formatDate(nextSunday);
  const endDate = formatDate(nextThursday);

  // Return a fresh empty plan if not found
  return {
    id,
    subject,
    grade,
    weekNum: week,
    startDate,
    endDate,
    days: DAYS.reduce((acc, day) => ({ ...acc, [day]: { ...EMPTY_DAY_ENTRY } }), {} as Record<DayName, any>),
    footer: {
      quranSurah: '',
      valueOfWeek: '',
      notes: ''
    },
    lastUpdated: Date.now()
  };
};

export const getFullGradeWeekData = (grade: string, week: number): WeeklyPlan[] => {
  const subjects = getSubjects();
  return subjects.map(subject => getPlanById(subject, grade, week));
};

export const getAnalyticsForSubject = (subject: Subject) => {
  const plans = getPlans().filter(p => p.subject === subject);
  
  let totalTests = 0;
  let totalHomework = 0;
  let filledFields = 0;
  const totalFields = plans.length * 5 * 5; // 5 days * 5 distinct fields (excluding period)

  plans.forEach(plan => {
    Object.values(plan.days).forEach(day => {
      if (day.tests) totalTests++;
      if (day.homework) totalHomework++;
      if (day.classwork) filledFields++;
      if (day.homework) filledFields++;
      if (day.items) filledFields++;
      if (day.tests) filledFields++;
      if (day.events) filledFields++;
    });
  });

  const completionRate = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return {
    completionRate,
    totalTests,
    totalHomework,
    classesPlanned: plans.length
  };
};
