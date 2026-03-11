
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_WEEKS } from '../constants';
import { Subject, UserRole } from '../types';
import { getAnalyticsForSubject, getSettings, saveSettings, createBackup, restoreBackup, clearAllData, getSubjects, getGrades } from '../services/storage';
import { exportGradeMasterPDF, exportGradeMasterExcel } from '../services/export';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  BookOpen, 
  Calculator, 
  Languages, 
  FlaskConical, 
  Globe, 
  Monitor, 
  MoonStar,
  Type,
  ChevronRight,
  ChevronLeft,
  Lock,
  Link as LinkIcon,
  Check,
  Megaphone,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Settings,
  Users,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Plus,
  X
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DashboardProps {
  role: UserRole;
  assignedSubject: Subject;
}

const Dashboard: React.FC<DashboardProps> = ({ role, assignedSubject }) => {
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const [copiedSubject, setCopiedSubject] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [editingAnnouncement, setEditingAnnouncement] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  
  // Branding State
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState('');

  // Dynamic Lists State
  const [subjects, setSubjects] = useState<string[]>([]);
  const [grades, setGrades] = useState<string[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');
  
  // Master Export State
  const [exportGrade, setExportGrade] = useState('');
  const [exportWeek, setExportWeek] = useState(MOCK_WEEKS[11].weekNum); // Default week 12

  useEffect(() => {
    const fetchData = () => {
      const settings = getSettings();
      setAnnouncement(settings.announcement || '');
      setEditingAnnouncement(settings.announcement || '');
      setSchoolName(settings.schoolName || '');
      setSchoolLogo(settings.schoolLogo || '');
      
      const loadedSubjects = getSubjects();
      const loadedGrades = getGrades();
      setSubjects(loadedSubjects);
      setGrades(loadedGrades);
      
      if (loadedGrades.length > 0) {
        setExportGrade(loadedGrades[0]);
      }
    };

    fetchData();

    const handleSettingsUpdate = () => {
      fetchData();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  const getIcon = (subject: Subject) => {
    switch(subject) {
      case 'Math': return <Calculator className="text-violet-600" size={28} />;
      case 'Science': return <FlaskConical className="text-green-600" size={28} />;
      case 'English': return <Type className="text-blue-600" size={28} />;
      case 'Arabic': return <Languages className="text-emerald-600" size={28} />;
      case 'Social Studies': return <Globe className="text-sky-600" size={28} />;
      case 'ICT': return <Monitor className="text-slate-600" size={28} />;
      case 'Religion': return <MoonStar className="text-indigo-600" size={28} />;
      case 'Quran': return <BookOpen className="text-amber-500" size={28} />;
      default: return <BookOpen className="text-gray-500" size={28} />;
    }
  };

  // Helper to get translated subject name or return raw if custom
  const getSubjectLabel = (sub: string) => {
    return (t.subjects && t.subjects[sub]) ? t.subjects[sub] : sub;
  };

  const handleCopyLink = (e: React.MouseEvent, sub: Subject) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#/?assigned=${encodeURIComponent(sub)}`;
    navigator.clipboard.writeText(url);
    setCopiedSubject(sub);
    setTimeout(() => setCopiedSubject(null), 2000);
  };

  const handlePostAnnouncement = () => {
    saveSettings({ ...getSettings(), announcement: editingAnnouncement });
    setAnnouncement(editingAnnouncement);
    alert(t.saved);
  };

  const handleSaveBranding = () => {
    saveSettings({ ...getSettings(), schoolName, schoolLogo });
    alert(t.saved);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 500 * 1024) { // 500KB limit
        alert("File too large. Max 500KB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setSchoolLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      restoreBackup(e.target.files[0], (success) => {
        if (success) {
          setRestoreStatus(t.restoreSuccess);
          // UI updates via event listener
        } else {
          setRestoreStatus(t.restoreFail);
        }
      });
    }
  };

  const handleReset = () => {
    if (window.confirm(t.confirmReset)) {
      clearAllData();
    }
  };

  const handleAddSubject = () => {
    if (!newSubject.trim()) return;
    const updated = [...subjects, newSubject.trim()];
    saveSettings({ ...getSettings(), customSubjects: updated });
    setNewSubject('');
  };

  const handleDeleteSubject = (sub: string) => {
    if (window.confirm(t.confirmDelete)) {
      const updated = subjects.filter(s => s !== sub);
      saveSettings({ ...getSettings(), customSubjects: updated });
    }
  };

  const handleAddGrade = () => {
    if (!newGrade.trim()) return;
    const updated = [...grades, newGrade.trim()];
    saveSettings({ ...getSettings(), customGrades: updated });
    setNewGrade('');
  };

  const handleDeleteGrade = (g: string) => {
    if (window.confirm(t.confirmDelete)) {
      const updated = grades.filter(gr => gr !== g);
      saveSettings({ ...getSettings(), customGrades: updated });
    }
  };

  const handleMasterExport = async (type: 'pdf' | 'excel') => {
    setIsExporting(true);
    try {
      if (type === 'pdf') {
        await exportGradeMasterPDF(exportGrade, exportWeek);
      } else {
        exportGradeMasterExcel(exportGrade, exportWeek);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const analyticsData = useMemo(() => {
    return subjects.map(sub => {
      const stats = getAnalyticsForSubject(sub);
      return {
        name: getSubjectLabel(sub),
        completion: stats.completionRate,
        plans: stats.classesPlanned
      };
    }).sort((a, b) => b.completion - a.completion);
  }, [subjects, t]);

  const Chevron = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-gray-900">{t.welcome}, {role === UserRole.ADMIN ? 'Admin' : 'Teacher'}</h2>
        <p className="text-gray-500 mt-2">{t.selectSubject}</p>
      </header>

      {/* Global Announcement Banner */}
      {announcement && (
        <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg flex items-start gap-3">
          <Megaphone className="text-indigo-600 shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-bold text-indigo-800 mb-1">{t.announcement}</h4>
            <p className="text-indigo-700 text-sm whitespace-pre-wrap">{announcement}</p>
          </div>
        </div>
      )}

      {/* Subject Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {subjects.map((subject) => {
          const stats = getAnalyticsForSubject(subject);
          const isAssigned = role === UserRole.ADMIN || subject === assignedSubject;
          
          return (
            <div 
              key={subject}
              onClick={() => navigate(`/planner/${subject}`)}
              className={`relative bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer group ${isAssigned ? 'border-gray-200' : 'border-gray-100 bg-gray-50/50'}`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 end-4 flex gap-2">
                {role === UserRole.ADMIN && (
                   <button 
                    onClick={(e) => handleCopyLink(e, subject)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-primary transition-colors"
                    title={t.copyLink}
                   >
                     {copiedSubject === subject ? <Check size={16} className="text-green-600" /> : <LinkIcon size={16} />}
                   </button>
                )}
                {role === UserRole.TEACHER && (
                  isAssigned ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {t.mySubject}
                    </span>
                  ) : (
                     <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-500">
                      <Lock size={10} className="me-1" />
                      {t.readOnly}
                    </span>
                  )
                )}
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <div className={`p-3 rounded-lg transition-colors ${isAssigned ? 'bg-gray-50 group-hover:bg-gray-100' : 'bg-white opacity-60'}`}>
                  {getIcon(subject)}
                </div>
                {isAssigned && <Chevron className="text-gray-300 group-hover:text-primary transition-colors" />}
              </div>
              <h3 className={`text-lg font-bold ${isAssigned ? 'text-gray-900' : 'text-gray-500'}`}>{getSubjectLabel(subject)}</h3>
              
              <div className={`mt-4 space-y-2 ${!isAssigned && 'opacity-50'}`}>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{t.completion}</span>
                  <span className="font-medium text-gray-700">{stats.completionRate}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${stats.completionRate}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-400 mt-2">{stats.classesPlanned} {t.activePlans}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Section */}
      {analyticsData.some(d => d.completion > 0) && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">{t.weeklyOverview}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} unit="%" />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="completion" radius={[4, 4, 0, 0]}>
                  {analyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.completion > 80 ? '#0f766e' : entry.completion > 40 ? '#f59e0b' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ADMIN CONTROLS SECTION */}
      {role === UserRole.ADMIN && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Master Export Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm col-span-1 lg:col-span-3">
             <div className="flex items-center gap-2 mb-4">
               <FileText className="text-teal-600" size={20} />
               <h3 className="text-lg font-bold text-gray-900">{t.masterPlan}</h3>
             </div>
             <p className="text-gray-500 text-sm mb-4">{t.exportMasterPdf}</p>
             
             <div className="flex flex-col md:flex-row gap-4 items-end">
               <div className="w-full md:w-auto">
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.selectGrade}</label>
                 <select 
                   value={exportGrade} 
                   onChange={(e) => setExportGrade(e.target.value)}
                   className="w-full md:w-48 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                 >
                   {grades.map(g => <option key={g} value={g}>{g}</option>)}
                 </select>
               </div>
               <div className="w-full md:w-auto">
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.selectWeek}</label>
                 <select 
                   value={exportWeek} 
                   onChange={(e) => setExportWeek(Number(e.target.value))}
                   className="w-full md:w-48 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                 >
                   {MOCK_WEEKS.map(w => <option key={w.weekNum} value={w.weekNum}>{w.label}</option>)}
                 </select>
               </div>
               <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                  <button 
                    onClick={() => handleMasterExport('pdf')}
                    disabled={isExporting}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <FileText size={18} />
                    {isExporting ? t.loading : t.downloadMasterPdf}
                  </button>
                  <button 
                    onClick={() => handleMasterExport('excel')}
                    disabled={isExporting}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <FileSpreadsheet size={18} />
                    {t.downloadMasterExcel}
                  </button>
               </div>
             </div>
          </div>

          {/* System Configuration */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="text-slate-700" size={20} />
              <h3 className="text-lg font-bold text-gray-900">{t.systemConfig}</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Manage Subjects */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 text-sm">{t.manageSubjects}</h4>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder={t.addSubject}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleAddSubject} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Plus size={18} /></button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                  {subjects.map(s => (
                    <div key={s} className="flex items-center justify-between bg-white p-2 rounded shadow-sm text-sm">
                      <span>{getSubjectLabel(s)}</span>
                      <button onClick={() => handleDeleteSubject(s)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manage Grades */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-3 text-sm">{t.manageGrades}</h4>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text" 
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder={t.addGrade}
                    className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleAddGrade} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><Plus size={18} /></button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-2 border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                  {grades.map(g => (
                    <div key={g} className="flex items-center justify-between bg-white p-2 rounded shadow-sm text-sm">
                      <span>{g}</span>
                      <button onClick={() => handleDeleteGrade(g)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* School Branding Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="text-purple-600" size={20} />
              <h3 className="text-lg font-bold text-gray-900">{t.schoolBranding}</h3>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.schoolName}</label>
                  <input 
                    type="text" 
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                    placeholder="e.g. International Language School"
                  />
               </div>

               <div>
                 <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">{t.uploadLogo}</label>
                 <div className="flex items-center gap-4">
                   {schoolLogo && (
                     <div className="w-12 h-12 border rounded-lg p-1 bg-gray-50 shrink-0">
                       <img src={schoolLogo} alt="Logo" className="w-full h-full object-contain" />
                     </div>
                   )}
                   <label className="flex-1 cursor-pointer">
                      <span className="inline-block w-full text-center px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
                        {schoolLogo ? t.uploadLogo : t.uploadLogo}
                      </span>
                      <input type="file" accept="image/png, image/jpeg" onChange={handleLogoUpload} className="hidden" />
                   </label>
                 </div>
                 <p className="text-[10px] text-gray-400 mt-1">{t.logoSizeLimit}</p>
                 {schoolLogo && (
                   <button 
                     onClick={() => setSchoolLogo('')} 
                     className="text-xs text-red-500 hover:underline mt-1"
                   >
                     {t.removeLogo}
                   </button>
                 )}
               </div>

               <button 
                 onClick={handleSaveBranding}
                 className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
               >
                 {t.save}
               </button>
            </div>
          </div>

          {/* Announcement Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="text-primary" size={20} />
              <h3 className="text-lg font-bold text-gray-900">{t.announcement}</h3>
            </div>
            <textarea 
              value={editingAnnouncement}
              onChange={(e) => setEditingAnnouncement(e.target.value)}
              placeholder={t.announcementPlaceholder}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none mb-4 resize-none text-sm"
            />
            <div className="flex justify-end">
              <button 
                onClick={handlePostAnnouncement}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm font-medium"
              >
                {t.postAnnouncement}
              </button>
            </div>
          </div>

          {/* Data Management Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="text-gray-700" size={20} />
              <h3 className="text-lg font-bold text-gray-900">{t.dataManagement}</h3>
            </div>
            
            <div className="space-y-4 flex-1">
              {/* Backup */}
              <button 
                onClick={createBackup}
                className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100">
                    <Download size={18} />
                  </div>
                  <div className="text-start">
                    <p className="text-sm font-medium text-gray-900">{t.backupData}</p>
                    <p className="text-xs text-gray-500">{t.backupDesc}</p>
                  </div>
                </div>
              </button>

              {/* Restore */}
              <label className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group relative">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100">
                    <Upload size={18} />
                  </div>
                  <div className="text-start">
                    <p className="text-sm font-medium text-gray-900">{t.restoreData}</p>
                    <p className="text-xs text-gray-500">{restoreStatus || t.restoreDesc}</p>
                  </div>
                </div>
                <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
              </label>

              {/* Reset */}
              <button 
                onClick={handleReset}
                className="w-full flex items-center justify-between p-3 border border-red-200 bg-red-50/50 rounded-lg hover:bg-red-50 group mt-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <Trash2 size={18} />
                  </div>
                  <div className="text-start">
                    <p className="text-sm font-medium text-red-700">{t.dangerZone}</p>
                    <p className="text-xs text-red-500">{t.resetDesc}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Teacher Management & Report Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mt-0 col-span-1 lg:col-span-3">
             <div className="flex items-center gap-2 mb-6">
               <Users className="text-primary" size={20} />
               <h3 className="text-lg font-bold text-gray-900">{t.teacherManagement} & {t.weeklyProgressReport}</h3>
             </div>

             <div className="overflow-x-auto rounded-lg border border-gray-200">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
                   <tr>
                     <th className={`p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.subjectColumn}</th>
                     <th className={`p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.activePlans}</th>
                     <th className={`p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.completion}</th>
                     <th className={`p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.tests}</th>
                     <th className={`p-4 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{t.actions}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 bg-white">
                   {subjects.map((sub) => {
                     const stats = getAnalyticsForSubject(sub);
                     return (
                       <tr key={sub} className="hover:bg-gray-50 transition-colors">
                         <td className="p-4 font-medium text-gray-900 flex items-center gap-3">
                            <div className="scale-75 origin-left rtl:origin-right">{getIcon(sub)}</div>
                            <span>{getSubjectLabel(sub)}</span>
                         </td>
                         <td className="p-4 text-gray-600">{stats.classesPlanned}</td>
                         <td className="p-4">
                           <div className="flex items-center gap-3">
                             <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                               <div 
                                 className={`h-full rounded-full ${stats.completionRate > 80 ? 'bg-green-500' : stats.completionRate > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                 style={{ width: `${stats.completionRate}%` }}
                               ></div>
                             </div>
                             <span className="font-mono text-xs text-gray-500">{stats.completionRate}%</span>
                           </div>
                         </td>
                         <td className="p-4 text-gray-600">{stats.totalTests}</td>
                         <td className="p-4">
                           <button 
                             onClick={(e) => handleCopyLink(e, sub)}
                             className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-primary hover:text-white text-gray-600 rounded-md text-xs font-medium transition-colors"
                           >
                             {copiedSubject === sub ? <Check size={14} /> : <LinkIcon size={14} />}
                             {copiedSubject === sub ? t.linkCopied : t.copyLink}
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
