import React, { useState } from 'react';
import { PatientApp } from './components/patient/PatientApp';
import { DoctorApp } from './components/doctor/DoctorApp';
import { Role } from './types';
import { Button } from './components/ui/Common';

// Root App Component
const App: React.FC = () => {
  const [role, setRole] = useState<Role | null>(null);

  const switchRole = () => {
    setRole(prev => prev === 'patient' ? 'doctor' : 'patient');
  };

  if (!role) {
    return (
      <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="w-24 h-24 bg-gradient-to-tr from-teal-400 to-emerald-600 rounded-3xl shadow-xl flex items-center justify-center mb-8 rotate-3">
            <span className="text-4xl text-white font-bold">痛</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">痛风管家 Pro</h1>
        <p className="text-slate-500 text-center mb-10 max-w-xs leading-relaxed">
          痛风与高尿酸血症全病程慢病管理平台
        </p>

        <div className="space-y-4 w-full">
          <Button fullWidth onClick={() => setRole('patient')}>
             我是患者
          </Button>
          <Button fullWidth variant="ghost" className="bg-white border border-slate-200 shadow-sm" onClick={() => setRole('doctor')}>
             我是医生
          </Button>
        </div>
        
        <p className="absolute bottom-8 text-xs text-slate-400">v1.0.0 • 概念演示</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-100 flex items-center justify-center font-sans">
      {/* 
         In a real mobile app, we wouldn't center this like a desktop preview, 
         but for web demo purposes, this frame looks better. 
      */}
      {role === 'patient' ? (
        <PatientApp onSwitchRole={switchRole} />
      ) : (
        <DoctorApp onSwitchRole={switchRole} />
      )}
    </div>
  );
};

export default App;