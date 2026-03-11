
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import { UserRole, Subject } from './types';
import { LanguageProvider } from './contexts/LanguageContext';
import { getSubjects } from './services/storage';

const AppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [assignedSubject, setAssignedSubject] = useState<Subject>('');
  const [isRestricted, setIsRestricted] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    const loadedSubjects = getSubjects();
    setSubjects(loadedSubjects);
    if (!assignedSubject && loadedSubjects.length > 0) {
      setAssignedSubject(loadedSubjects[0]);
    }
  }, []);

  useEffect(() => {
    const assigned = searchParams.get('assigned');
    const loadedSubjects = getSubjects();
    
    if (assigned && loadedSubjects.includes(assigned)) {
      setRole(UserRole.TEACHER);
      setAssignedSubject(assigned);
      // Enable restricted mode: User cannot switch to Admin
      setIsRestricted(true);
    } else {
      setIsRestricted(false);
    }
  }, [searchParams]);

  return (
    <Layout 
      role={role} 
      setRole={setRole} 
      assignedSubject={assignedSubject} 
      setAssignedSubject={setAssignedSubject}
      isRestricted={isRestricted}
    >
      <Routes>
        <Route path="/" element={<Dashboard role={role} assignedSubject={assignedSubject} />} />
        <Route path="/planner/:subject" element={<Planner role={role} assignedSubject={assignedSubject} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </LanguageProvider>
  );
};

export default App;
