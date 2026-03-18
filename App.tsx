import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import PatientForm from './pages/PatientForm';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';
import ProjectList from './pages/ProjectList';
import ProjectForm from './pages/ProjectForm';
import QuestionnaireDesign from './pages/QuestionnaireDesign';
import QuestionnaireRecords from './pages/QuestionnaireRecords';
import { 
  UserManagement, 
  RoleManagement, 
  OrgManagement, 
  TitleManagement, 
  ResourceManagement, 
  EducationManagement 
} from './pages/SystemPages';
import { api } from './api';

const RequireAuth = ({ children, isAuthenticated }: React.PropsWithChildren<{ isAuthenticated: boolean }>) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.getMe();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout failed', err);
    }
    setIsAuthenticated(false);
  };

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100">Loading...</div>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/*" element={
          <RequireAuth isAuthenticated={isAuthenticated}>
            <Layout onLogout={handleLogout}>
              <Routes>
                <Route path="/dashboard" element={<DoctorDashboard />} />
                <Route path="/patients" element={<PatientList />} />
                <Route path="/patients/new" element={<PatientForm />} />
                <Route path="/patients/:id" element={<PatientDetail />} />
                <Route path="/patients/edit/:id" element={<PatientForm />} />
                <Route path="/projects" element={<ProjectList />} />
                <Route path="/projects/new" element={<ProjectForm />} />
                
                {/* Questionnaire Routes */}
                <Route path="/questionnaires/design" element={<QuestionnaireDesign />} />
                <Route path="/questionnaires/records" element={<QuestionnaireRecords />} />
                
                {/* System Management Routes */}
                <Route path="/system/users" element={<UserManagement />} />
                <Route path="/system/roles" element={<RoleManagement />} />
                <Route path="/system/orgs" element={<OrgManagement />} />
                <Route path="/system/titles" element={<TitleManagement />} />
                <Route path="/system/resources" element={<ResourceManagement />} />
                <Route path="/system/education" element={<EducationManagement />} />

                <Route path="/ai-consult" element={<AIChat />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </RequireAuth>
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;