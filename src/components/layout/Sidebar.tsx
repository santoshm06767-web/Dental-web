import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Receipt,
  Stethoscope, 
  BarChart3, 
  Settings, 
  Database,
  UserPlus,
  CalendarPlus
} from 'lucide-react';
import { UserRole, Profile, ClinicSettings } from '../../types';

export type NavTab = 
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'finance'
  | 'doctors'
  | 'reports'
  | 'settings';

import { DoctorAvatar } from '../common/DoctorAvatar';
import { drNirmalBase64 } from '../../assets/images/doctors';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  userRole: UserRole;
  currentProfile?: Profile;
  settings?: ClinicSettings;
  onOpenNewPatient: () => void;
  onOpenNewAppointment: () => void;
  onOpenSupabaseModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  currentProfile,
  settings,
  onOpenNewPatient,
  onOpenNewAppointment,
  onOpenSupabaseModal,
}) => {
  const isDoctor = userRole === 'doctor';

  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: isDoctor ? 'Doctor Queue' : 'Dashboard',
      icon: LayoutDashboard,
      roles: ['receptionist', 'admin', 'doctor'],
    },
    {
      id: 'patients' as NavTab,
      label: 'Patients',
      icon: Users,
      roles: ['receptionist', 'admin', 'doctor'],
    },
    {
      id: 'appointments' as NavTab,
      label: 'Appointments',
      icon: CalendarDays,
      roles: ['receptionist', 'admin', 'doctor'],
    },
    {
      id: 'finance' as NavTab,
      label: 'Finance',
      icon: Receipt,
      roles: ['receptionist', 'admin'],
    },
    {
      id: 'doctors' as NavTab,
      label: 'Doctors',
      icon: Stethoscope,
      roles: ['receptionist', 'admin'],
    },
    {
      id: 'reports' as NavTab,
      label: 'Reports',
      icon: BarChart3,
      roles: ['receptionist', 'admin'],
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
      roles: ['admin'],
      adminOnly: true,
    },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(userRole));
  const clinicName = settings?.clinic_name || 'AROGYA DENTAL CARE & IMPLANT CENTRE';
  const initialLetter = clinicName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <aside className="w-64 bg-[#0f172a] text-white flex flex-col flex-shrink-0 h-full border-r border-slate-800 select-none">
      
      {/* Brand Header matching Sleek Interface */}
      <div className="p-5 border-b border-slate-700/80">
        <div className="flex items-center gap-3">
          <div 
            id="sidebar-clinic-badge"
            className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center font-bold text-base text-white shadow-xs shrink-0 ring-1 ring-white/15"
          >
            {initialLetter}
          </div>
          <div className="overflow-hidden min-w-0">
            <h1 
              id="sidebar-clinic-title"
              title={clinicName}
              className="text-[12px] font-bold tracking-tight text-white uppercase leading-snug line-clamp-2"
            >
              {clinicName}
            </h1>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-medium">
          Multi-Clinic System
        </p>
      </div>

      {/* Quick Action Buttons */}
      {!isDoctor && (
        <div className="px-5 pt-4 pb-2 space-y-2">
          <button
            id="sidebar-new-appointment-btn"
            onClick={onOpenNewAppointment}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow-xs transition-all cursor-pointer"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>+ New Appointment</span>
          </button>
          <button
            id="sidebar-new-patient-btn"
            onClick={onOpenNewPatient}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium py-2 px-3 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Patient</span>
          </button>
        </div>
      )}

      {/* Navigation Links matching Sleek Interface */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-6 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menu
        </div>
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-6 py-3 transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-sky-600/10 text-sky-400 border-r-2 border-sky-400 font-medium'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>

              {item.adminOnly && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 uppercase">
                  Admin
                </span>
              )}
            </button>
          );
        })}

        {/* Supabase PostgreSQL shortcut */}
        <div className="pt-4 px-3">
          <button
            onClick={() => onOpenSupabaseModal?.()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span className="truncate">PostgreSQL Schema & Sync</span>
          </button>
        </div>
      </nav>

      {/* User Profile Card matching Sleek Interface */}
      <div className="p-4 border-t border-slate-700/80">
        <div className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
          <DoctorAvatar
            name={currentProfile?.full_name || 'Dr. Nirmal Chandra Mahanta'}
            photoUrl={currentProfile?.avatar_url || drNirmalBase64}
            size="sm"
            className="ring-1 ring-white/10 shrink-0"
          />
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-semibold truncate text-white">
              {currentProfile?.full_name || 'Dr. Nirmal Chandra Mahanta'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-tighter">
              {userRole === 'admin' ? 'Clinic Director / Admin' : userRole}
            </p>
          </div>
        </div>
      </div>

    </aside>
  );
};
