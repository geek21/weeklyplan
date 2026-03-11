
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, BookOpen, Lock, LogOut } from 'lucide-react';
import { UserRole, Subject } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getSettings, getSubjects } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  setRole: (role: UserRole) => void;
  assignedSubject: Subject;
  setAssignedSubject: (subject: Subject) => void;
  isRestricted?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, role, setRole, assignedSubject, setAssignedSubject, isRestricted = false 
}) => {
  const location = useLocation();
  const { t, language, setLanguage, dir } = useLanguage();
  
  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    // Initial fetch
    const fetchSettings = () => {
        const settings = getSettings();
        setSchoolLogo(settings.schoolLogo || '');
        setSubjects(getSubjects());
    };
    
    fetchSettings();

    // Listen for updates from other components (like Dashboard)
    const handleSettingsUpdate = () => {
        fetchSettings();
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate);
    return () => window.removeEventListener('settingsUpdated', handleSettingsUpdate);
  }, []);

  const isActive = (path: string) => location.pathname === path ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100';

  const handleRoleToggle = () => {
    if (role === UserRole.ADMIN) {
      setRole(UserRole.TEACHER);
    } else {
      setIsLoginModalOpen(true);
      setLoginError(false);
      setPasswordInput('');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'starteamxol') {
      setRole(UserRole.ADMIN);
      setIsLoginModalOpen(false);
    } else {
      setLoginError(true);
    }
  };

  // Helper to get translated subject name or return raw if custom
  const getSubjectLabel = (sub: string) => {
    return (t.subjects && t.subjects[sub]) ? t.subjects[sub] : sub;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50">
      {/* Sidebar / Navbar */}
      <aside className="bg-white w-full md:w-64 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          {schoolLogo ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shrink-0">
              <BookOpen size={20} />
            </div>
          )}
          <h1 className="text-xl font-bold text-gray-800 tracking-tight truncate">Al-Muallim</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} />
            {t.dashboard}
          </Link>
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t.settings}</p>
          </div>
          
          {/* Role Toggle - HIDDEN if the app is in Restricted Mode (Shared Link) */}
          {!isRestricted && (
            <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-lg">
              <span>{t.role}: {role === UserRole.ADMIN ? 'Admin' : 'Teacher'}</span>
              <button 
                onClick={handleRoleToggle}
                className="text-primary hover:underline text-xs font-semibold flex items-center gap-1"
              >
                {role === UserRole.ADMIN ? (
                   <>
                     <LogOut size={12} />
                     {t.logout}
                   </>
                ) : (
                   <>
                     <Lock size={12} />
                     {t.login}
                   </>
                )}
              </button>
            </div>
          )}

          {/* Teacher's Assigned Subject Selector (Visible only for Teachers to simulate login, and NOT in restricted mode) */}
          {role === UserRole.TEACHER && !isRestricted && (
            <div className="px-4 py-2 space-y-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">{t.assignedSubject}</label>
              <select 
                value={assignedSubject}
                onChange={(e) => setAssignedSubject(e.target.value as Subject)}
                className="w-full text-sm p-2 border border-gray-200 rounded-md bg-white focus:ring-1 focus:ring-primary outline-none"
              >
                {subjects.map(sub => (
                  <option key={sub} value={sub}>{getSubjectLabel(sub)}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* If Restricted, show which subject is locked */}
          {isRestricted && (
            <div className="px-4 py-3 bg-teal-50 text-teal-800 rounded-lg text-sm border border-teal-100 flex items-center gap-2">
              <Lock size={14} />
              <div>
                <p className="text-xs uppercase opacity-75">{t.assignedSubject}</p>
                <p className="font-bold">{getSubjectLabel(assignedSubject)}</p>
              </div>
            </div>
          )}

          {/* Language Toggle */}
          <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-600 bg-gray-50 rounded-lg">
            <span>{language === 'en' ? 'English' : 'العربية'}</span>
            <button 
              onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
              className="text-primary hover:underline text-xs font-semibold"
            >
              {t.switch}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
           <div className="flex items-center gap-3 px-4 py-2 text-gray-500 text-sm">
             <Settings size={16} />
             <span>{t.version}</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Admin Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Lock size={24} />
              <h2 className="text-xl font-bold">{t.adminLogin}</h2>
            </div>
            <p className="text-gray-500 text-sm">{t.enterPassword}</p>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                  placeholder={t.password}
                  autoFocus
                />
                {loginError && (
                  <p className="text-red-500 text-xs mt-1">{t.incorrectPassword}</p>
                )}
              </div>
              
              <div className="flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-teal-800 text-sm font-medium"
                >
                  {t.login}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
