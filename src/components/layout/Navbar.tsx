import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  CheckCircle2, 
  RotateCcw,
  Plus,
  Building2,
  X
} from 'lucide-react';
import { Profile, ClinicSettings, UserRole } from '../../types';

interface NavbarProps {
  settings: ClinicSettings;
  currentProfile: Profile;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  isSupabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  onOpenNewAppointment?: () => void;
  onResetDemo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  currentProfile,
  userRole,
  onRoleChange,
  isSupabaseConnected,
  onOpenSupabaseModal,
  onOpenNewAppointment,
  onResetDemo,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  const clinicName = settings?.clinic_name || 'Arogya Dental Care & Implant Centre';
  const clinicAddress = settings?.address || 'Pratima Medical Store, Khodasingi, Berhampur, 760001';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-5 lg:px-7 flex items-center justify-between flex-shrink-0 z-20 gap-3">
      
      {/* 1. CLINIC NAME & BRANDING - Prominent in Mobile View & Desktop */}
      <div className={`flex items-center gap-2.5 min-w-0 ${isMobileSearchOpen ? 'hidden sm:flex' : 'flex'} flex-1 md:flex-initial max-w-[280px] xs:max-w-sm sm:max-w-md`}>
        {settings?.logo_url ? (
          <img 
            src={settings.logo_url} 
            alt={clinicName} 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain bg-white border border-slate-200 p-0.5 flex-shrink-0 shadow-2xs" 
          />
        ) : (
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-2xs">
            <Building2 className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0 overflow-hidden">
          <h1 className="text-[14px] font-extrabold text-slate-900 leading-tight truncate tracking-tight" title={clinicName}>
            {clinicName}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate leading-tight mt-0.5" title={clinicAddress}>
            {clinicAddress}
          </p>
        </div>
      </div>

      {/* 2. SEARCH BAR - Desktop inline, Mobile expandable */}
      <div className={`${isMobileSearchOpen ? 'flex flex-1' : 'hidden md:flex'} items-center gap-2 max-w-xs lg:max-w-md flex-1`}>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient by name, ID or mobile..."
            className="w-full bg-slate-100 border-none rounded-full py-1.5 sm:py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const el = document.getElementById('input-today-search') as HTMLInputElement | null;
                if (el) {
                  el.value = (e.target as HTMLInputElement).value;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.focus();
                }
              }
            }}
          />
          {isMobileSearchOpen && (
            <button
              onClick={() => setIsMobileSearchOpen(false)}
              className="md:hidden absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. RIGHT CONTROLS */}
      <div className={`flex items-center gap-2 sm:gap-3 flex-shrink-0 ${isMobileSearchOpen ? 'hidden xs:flex' : 'flex'}`}>
        
        {/* Mobile search trigger icon */}
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Search Patients"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Date & Time display on tablet/desktop */}
        <div className="text-right hidden lg:block">
          <p className="text-xs font-semibold text-slate-700">Today: {currentDateStr}</p>
          <p className="text-[11px] text-slate-400 font-mono">{timeStr || '09:00 AM'}</p>
        </div>

        <div className="w-px h-6 bg-slate-200 hidden lg:block"></div>

        {/* Supabase Status Pill */}
        <button
          id="btn-supabase-status"
          onClick={onOpenSupabaseModal}
          className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            isSupabaseConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
          title="Supabase PostgreSQL status & DDL configuration"
        >
          <Database className="w-3.5 h-3.5" />
          <span className="hidden md:inline">{isSupabaseConnected ? 'PostgreSQL Active' : 'Offline / Demo'}</span>
          {isSupabaseConnected ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        {/* Role Switcher */}
        <div className="flex items-center">
          <select
            id="select-user-role-nav"
            value={userRole}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg px-2 sm:px-2.5 py-1.5 focus:ring-2 focus:ring-sky-500 focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none"
            title="Switch User Role"
          >
            <option value="receptionist">Receptionist</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Demo reset button */}
        {onResetDemo && (
          <button
            onClick={onResetDemo}
            className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Reset to Demo Data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Sleek New Appointment Button */}
        {onOpenNewAppointment && userRole !== 'doctor' && (
          <button
            id="btn-nav-new-appointment"
            onClick={onOpenNewAppointment}
            className="bg-sky-600 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-sky-700 shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New Appointment</span>
            <span className="xs:hidden">Book</span>
          </button>
        )}

      </div>
    </header>
  );
};
