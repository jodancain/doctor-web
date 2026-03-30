import React from 'react';
import { LucideIcon, ChevronLeft } from 'lucide-react';

// --- Layouts ---
export const AppContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`h-full w-full max-w-md mx-auto bg-[#F2F4F7] flex flex-col relative shadow-2xl overflow-hidden ${className}`}>
    {children}
  </div>
);

export const ScrollArea: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex-1 overflow-y-auto no-scrollbar pb-24 ${className}`}>
    {children}
  </div>
);

// --- Headers ---
export const AppHeader: React.FC<{ 
  title?: string; 
  onBack?: () => void;
  right?: React.ReactNode; 
  transparent?: boolean;
  className?: string;
}> = ({ title, onBack, right, transparent, className = '' }) => (
  <div className={`flex items-center justify-between px-4 py-3 z-40 sticky top-0 transition-all ${transparent ? 'bg-transparent' : 'bg-[#F2F4F7]/95 backdrop-blur-sm'} ${className}`}>
    <div className="w-10 flex justify-start">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-slate-200/50 active:bg-slate-200 transition-colors">
          <ChevronLeft size={24} className="text-slate-700" />
        </button>
      )}
    </div>
    <div className="font-bold text-slate-900 text-lg">{title}</div>
    <div className="w-10 flex justify-end">{right}</div>
  </div>
);

export const SectionHeader: React.FC<{ title: string; action?: React.ReactNode; className?: string }> = ({ title, action, className='' }) => (
  <div className={`flex justify-between items-center mb-3 mt-6 px-1 ${className}`}>
    <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">{title}</h2>
    {action}
  </div>
);

// --- Cards & Surfaces ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-100/50 transition-all active:scale-[0.98] ${onClick ? 'cursor-pointer active:bg-slate-50' : ''} ${className}`}
  >
    {children}
  </div>
);

export const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  subtext?: string; 
  icon?: LucideIcon; 
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ title, value, subtext, icon: Icon, trend, color = 'text-primary-600' }) => (
  <Card className="flex flex-col justify-between h-full min-h-[110px]">
    <div className="flex justify-between items-start mb-2">
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</span>
      {Icon && <Icon size={18} className={color} />}
    </div>
    <div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {subtext && (
        <div className={`text-xs mt-1 font-medium ${trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-600' : 'text-slate-400'}`}>
          {subtext}
        </div>
      )}
    </div>
  </Card>
);

// --- Inputs & Buttons ---
export const Button: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'; 
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}> = ({ children, variant = 'primary', fullWidth = false, onClick, className = '', disabled, size = 'md' }) => {
  const baseStyle = "rounded-full font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed";
  
  const sizeStyles = {
    sm: "py-1.5 px-3 text-xs",
    md: "py-3 px-6 text-sm",
    lg: "py-4 px-8 text-base",
  };

  const variants = {
    primary: "bg-[#14b8a6] text-white shadow-lg shadow-teal-500/20 hover:bg-[#0d9488]",
    secondary: "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 border border-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
    outline: "bg-transparent border-2 border-slate-200 text-slate-700 hover:bg-slate-50",
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const Chip: React.FC<{ label: string; status: 'Normal' | 'High' | 'Critical' | 'Safe' | 'Moderate' | 'Avoid' | 'Neutral' | 'Active' }> = ({ label, status }) => {
  const colors = {
    Normal: "bg-emerald-100 text-emerald-700",
    Safe: "bg-emerald-100 text-emerald-700",
    Active: "bg-emerald-100 text-emerald-700",
    High: "bg-amber-100 text-amber-700",
    Moderate: "bg-amber-100 text-amber-700",
    Critical: "bg-red-100 text-red-700",
    Avoid: "bg-red-100 text-red-700",
    Neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${colors[status] || colors.Neutral}`}>
      {label}
    </span>
  );
};

export const SegmentedControl: React.FC<{
  options: string[];
  selected: string;
  onChange: (val: string) => void;
}> = ({ options, selected, onChange }) => (
  <div className="flex bg-slate-200/50 p-1 rounded-xl w-full">
    {options.map(opt => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
          selected === opt 
            ? 'bg-white text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        {opt}
      </button>
    ))}
  </div>
);

export const ProgressBar: React.FC<{ progress: number; color?: string; className?: string }> = ({ progress, color = 'bg-teal-500', className }) => (
  <div className={`w-full bg-slate-100 rounded-full h-2 ${className}`}>
    <div 
      className={`h-2 rounded-full transition-all duration-500 ${color}`} 
      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
    />
  </div>
);

export const PainSlider: React.FC<{ value: number; onChange: (val: number) => void }> = ({ value, onChange }) => {
  const getEmoji = (v: number) => {
    if (v === 0) return '😊';
    if (v < 4) return '🙂';
    if (v < 7) return '😣';
    return '😭';
  }
  const getColor = (v: number) => {
    if (v < 4) return 'bg-emerald-500';
    if (v < 7) return 'bg-amber-500';
    return 'bg-red-500';
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-4 px-2">
         <span className="text-4xl filter drop-shadow-sm transition-all transform hover:scale-110">{getEmoji(value)}</span>
         <span className={`text-2xl font-bold ${value < 4 ? 'text-emerald-600' : value < 7 ? 'text-amber-600' : 'text-red-600'}`}>
            {value} <span className="text-sm font-normal text-slate-400">/ 10</span>
         </span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="10" 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-2 px-1">
        <span>无痛</span>
        <span>剧痛</span>
      </div>
    </div>
  );
};

// --- Navigation ---
export const BottomNav: React.FC<{ 
  tabs: { id: string; label: string; icon: LucideIcon }[]; 
  activeTab: string; 
  onTabChange: (id: string) => void 
}> = ({ tabs, activeTab, onTabChange }) => (
  <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-center z-50 pb-8 pt-3 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
    {tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return (
        <button 
          key={tab.id} 
          onClick={() => onTabChange(tab.id)}
          className={`flex flex-col items-center gap-1.5 transition-all w-16 ${isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-teal-50' : ''}`}>
             <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
        </button>
      );
    })}
  </div>
);