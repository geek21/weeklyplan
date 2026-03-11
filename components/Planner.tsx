
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Subject, WeeklyPlan, DayName, UserRole } from '../types';
import { MOCK_WEEKS, DAYS } from '../constants';
import { getPlanById, savePlan, getGrades } from '../services/storage';
import { exportToPDF, exportToExcel, exportGradeMasterPDF, exportGradeMasterExcel } from '../services/export';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ArrowLeft, ArrowRight, Save, Download, FileSpreadsheet, FileText,
  Calculator, FlaskConical, Languages, Globe, Monitor, MoonStar, BookOpen, Type, Lock, Files
} from 'lucide-react';

interface PlannerProps {
  role: UserRole;
  assignedSubject: Subject;
}

const Planner: React.FC<PlannerProps> = ({ role, assignedSubject }) => {
  const { subject } = useParams<{ subject: Subject }>();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();

  const [grades, setGrades] = useState<string[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedWeek, setSelectedWeek] = useState<number>(MOCK_WEEKS[11].weekNum); // Defaulting to week 12 as per prompt hint
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Load Grades dynamically
  useEffect(() => {
    const loadedGrades = getGrades();
    setGrades(loadedGrades);
    if (loadedGrades.length > 0) {
      setSelectedGrade(loadedGrades[0]);
    }
  }, []);

  // Check Permissions
  const isEditable = role === UserRole.ADMIN || (role === UserRole.TEACHER && subject === assignedSubject);

  // Load Plan
  useEffect(() => {
    if (subject && selectedGrade) {
      setLoading(true);
      const data = getPlanById(subject, selectedGrade, selectedWeek);
      setPlan(data);
      setLoading(false);
      setIsSaved(false);
    }
  }, [subject, selectedGrade, selectedWeek]);

  const handleInputChange = (day: DayName, field: string, value: string) => {
    if (!plan || !isEditable) return;
    setPlan({
      ...plan,
      days: {
        ...plan.days,
        [day]: {
          ...plan.days[day],
          [field]: value
        }
      }
    });
    setIsSaved(false);
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (!plan || !isEditable) return;
    setPlan({
      ...plan,
      startDate: type === 'start' ? value : plan.startDate,
      endDate: type === 'end' ? value : plan.endDate
    });
    setIsSaved(false);
  };

  const handleSave = () => {
    if (plan && isEditable) {
      savePlan(plan);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'master-pdf' | 'master-excel') => {
    if (!plan) return;
    setIsExporting(true);
    try {
      if (type === 'pdf') await exportToPDF(plan);
      else if (type === 'excel') exportToExcel(plan);
      else if (type === 'master-pdf') await exportGradeMasterPDF(selectedGrade, selectedWeek);
      else if (type === 'master-excel') exportGradeMasterExcel(selectedGrade, selectedWeek);
    } finally {
      setIsExporting(false);
    }
  };

  const getSubjectIcon = (sub: string) => {
    switch(sub) {
      case 'Math': return <Calculator className="text-violet-600" size={24} />;
      case 'Science': return <FlaskConical className="text-green-600" size={24} />;
      case 'English': return <Type className="text-blue-600" size={24} />;
      case 'Arabic': return <Languages className="text-emerald-600" size={24} />;
      case 'Social Studies': return <Globe className="text-sky-600" size={24} />;
      case 'ICT': return <Monitor className="text-slate-600" size={24} />;
      case 'Religion': return <MoonStar className="text-indigo-600" size={24} />;
      case 'Quran': return <BookOpen className="text-amber-500" size={24} />;
      default: return <BookOpen className="text-gray-500" size={24} />;
    }
  };

  // Helper to get translated subject name or return raw if custom
  const getSubjectLabel = (sub: string) => {
    return (t.subjects && t.subjects[sub]) ? t.subjects[sub] : sub;
  };

  if (loading || !plan) return <div className="p-10 text-center">{t.loading}</div>;
  
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="space-y-6 pb-20">
      {/* Read Only Banner */}
      {!isEditable && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
          <Lock size={20} className="shrink-0" />
          <div>
            <h4 className="font-bold">{t.viewOnlyMode}</h4>
            <p className="text-sm">{t.permissionMessage}</p>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <BackIcon size={24} />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex p-2 bg-white border border-gray-200 rounded-lg shadow-sm shrink-0">
                 {getSubjectIcon(subject as Subject)}
             </div>
             <div>
                <h1 className="text-2xl font-bold text-gray-900">{getSubjectLabel(subject as string)} {t.planning}</h1>
                <p className="text-sm text-gray-500">{t.editExport}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
                {isExporting ? <span className="animate-spin text-gray-400">⏳</span> : <Download size={18} />}
                <span className="hidden sm:inline">{isExporting ? t.loading : t.export}</span>
              </button>
              <div className={`absolute ${dir === 'rtl' ? 'left-0' : 'right-0'} top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden hidden group-hover:block z-50`}>
                <button 
                  onClick={() => handleExport('pdf')}
                  disabled={isExporting}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  <FileText size={16} className="text-red-500" />
                  {t.exportPdf}
                </button>
                <button 
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm disabled:opacity-50"
                >
                  <FileSpreadsheet size={16} className="text-green-600" />
                  {t.exportExcel}
                </button>
                {role === UserRole.ADMIN && (
                  <>
                   <div className="border-t border-gray-100 my-1"></div>
                   <button 
                    onClick={() => handleExport('master-pdf')}
                    disabled={isExporting}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-teal-700 font-medium bg-teal-50/50 disabled:opacity-50"
                  >
                    <Files size={16} className="text-teal-600" />
                    {t.exportMasterPdf}
                  </button>
                   <button 
                    onClick={() => handleExport('master-excel')}
                    disabled={isExporting}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 text-sm text-emerald-700 font-medium bg-emerald-50/50 disabled:opacity-50"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                    {t.exportMasterExcel}
                  </button>
                  </>
                )}
              </div>
           </div>
          
          {isEditable && (
            <button 
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-medium shadow-md transition-all ${isSaved ? 'bg-green-600' : 'bg-primary hover:bg-teal-800'}`}
            >
              <Save size={18} />
              {isSaved ? t.saved : t.save}
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.grade}</label>
            <select 
                value={selectedGrade} 
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="w-full sm:w-32 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            >
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
        </div>

        <div className="w-full sm:w-auto">
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.week}</label>
            <select 
                value={selectedWeek} 
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="w-full sm:w-40 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            >
                {MOCK_WEEKS.map(w => <option key={w.weekNum} value={w.weekNum}>{w.label}</option>)}
            </select>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.from}</label>
                <input 
                    type="date" 
                    value={plan.startDate}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    disabled={!isEditable}
                    className={`p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm ${!isEditable ? 'bg-gray-100' : ''}`} 
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.to}</label>
                <input 
                    type="date" 
                    value={plan.endDate}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    disabled={!isEditable}
                    className={`p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm ${!isEditable ? 'bg-gray-100' : ''}`} 
                />
            </div>
        </div>
      </div>

      {/* Main Planning Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <th className={`p-4 border-b border-gray-200 w-24 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.day}</th>
                <th className={`p-4 border-b border-gray-200 w-64 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.classwork}</th>
                <th className={`p-4 border-b border-gray-200 w-48 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.homework}</th>
                <th className={`p-4 border-b border-gray-200 w-40 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.items}</th>
                <th className={`p-4 border-b border-gray-200 w-40 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.tests}</th>
                <th className={`p-4 border-b border-gray-200 w-40 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.events}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DAYS.map((day) => (
                <tr key={day} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-semibold text-primary whitespace-nowrap">{t.day} {day.replace('Day ', '')}</td>
                  {['classwork', 'homework', 'items', 'tests', 'events'].map((field) => (
                    <td key={field} className="p-2">
                      <textarea
                        value={(plan.days[day] as any)[field]}
                        onChange={(e) => handleInputChange(day, field, e.target.value)}
                        disabled={!isEditable}
                        className={`w-full p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm min-h-[80px] resize-none ${!isEditable ? 'bg-gray-50 text-gray-500' : ''}`}
                        dir="auto"
                        placeholder={isEditable ? t.typeHere : ''}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-4 space-y-6">
          {DAYS.map((day) => (
            <div key={day} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-bold text-primary mb-3">{t.day} {day.replace('Day ', '')}</h3>
              <div className="space-y-3">
                 {[
                   { key: 'classwork', label: t.classwork },
                   { key: 'homework', label: t.homework },
                   { key: 'items', label: t.items },
                   { key: 'tests', label: t.tests },
                   { key: 'events', label: t.events }
                 ].map(({ key, label }) => (
                   <div key={key}>
                     <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{label}</label>
                     <textarea
                        value={(plan.days[day] as any)[key]}
                        onChange={(e) => handleInputChange(day, key, e.target.value)}
                        disabled={!isEditable}
                        className={`w-full p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-sm min-h-[60px] ${!isEditable ? 'bg-gray-100 text-gray-500' : ''}`}
                        dir="auto"
                        placeholder={isEditable ? t.typeHere : ''}
                      />
                   </div>
                 ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Planner;
