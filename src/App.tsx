import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ReceptionDashboard } from './components/dashboard/ReceptionDashboard';
import { PatientList } from './components/patients/PatientList';
import { AppointmentsList } from './components/appointments/AppointmentsList';
import { DoctorManagement } from './components/doctors/DoctorManagement';
import { ReportsView } from './components/reports/ReportsView';
import { ClinicSettingsView } from './components/settings/ClinicSettingsView';

// Modals
import { PatientRegistrationModal } from './components/patients/PatientRegistrationModal';
import { PatientProfileModal } from './components/patients/PatientProfileModal';
import { NewAppointmentModal } from './components/appointments/NewAppointmentModal';
import { RescheduleModal } from './components/appointments/RescheduleModal';
import { ScheduleNextVisitModal } from './components/appointments/ScheduleNextVisitModal';
import { ConsultationSlipModal } from './components/pdf/ConsultationSlipModal';
import { SupabaseSetupModal } from './components/setup/SupabaseSetupModal';
import { FinanceModule } from './components/finance/FinanceModule';
import { CollectPaymentModal } from './components/finance/CollectPaymentModal';
import { MoneyReceiptModal } from './components/finance/MoneyReceiptModal';

// Types & Services
import { UserRole, Profile, Patient, Appointment, ClinicSettings, Payment, PaymentType } from './types';
import { clinicRepo } from './services/clinicRepository';
import { isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'appointments' | 'doctors' | 'finance' | 'reports' | 'settings'>('dashboard');

  // User role and staff profile
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [currentProfile, setCurrentProfile] = useState<Profile>(() => {
    const saved = clinicRepo.getCurrentProfile();
    if (saved && saved.full_name && !saved.full_name.includes('Sarah') && !saved.full_name.includes('Elena') && !saved.full_name.includes('Sterling') && !saved.full_name.includes('Marcus')) {
      return saved;
    }
    return {
      id: 'user-admin-01',
      user_id: 'auth-user-admin-01',
      full_name: 'Dr. Nirmal Chandra Mahanta',
      role: 'admin',
      mobile: '+91 98540 12000',
      created_at: new Date().toISOString(),
    };
  });

  // Settings
  const [settings, setSettings] = useState<ClinicSettings>(clinicRepo.getSettings());

  // Connection status state
  const [isConnectedToSupabase, setIsConnectedToSupabase] = useState<boolean>(isSupabaseConfigured());

  // Modals state
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [selectedPatientForBooking, setSelectedPatientForBooking] = useState<Patient | null>(null);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<Patient | null>(null);
  const [slipModalAppointment, setSlipModalAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [scheduleNextVisitAppointment, setScheduleNextVisitAppointment] = useState<Appointment | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Financial & Receipt Modals state
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [collectPaymentPatient, setCollectPaymentPatient] = useState<Patient | null>(null);
  const [collectPaymentAppointment, setCollectPaymentAppointment] = useState<Appointment | null>(null);
  const [collectPaymentType, setCollectPaymentType] = useState<PaymentType | undefined>(undefined);
  const [viewReceiptPayment, setViewReceiptPayment] = useState<Payment | null>(null);

  // App version refresh counter to trigger re-renders on local storage repo updates
  const [repoVersion, setRepoVersion] = useState(0);
  const triggerRefresh = () => setRepoVersion(v => v + 1);

  // Handler to open collection modal
  const handleOpenCollectPayment = (appointment?: Appointment, patient?: Patient, type?: PaymentType) => {
    setCollectPaymentAppointment(appointment || null);
    setCollectPaymentPatient(patient || (appointment?.patient ? appointment.patient : null));
    setCollectPaymentType(type);
    setIsCollectPaymentOpen(true);
  };

  // Handler when payment successfully collected
  const handlePaymentSuccess = (payment: Payment) => {
    triggerRefresh();
    setIsCollectPaymentOpen(false);
    setViewReceiptPayment(payment);
  };

  // Handle Role Switch
  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'doctor') {
      const doctors = clinicRepo.getDoctors();
      setCurrentProfile({
        id: 'user-doc-01',
        user_id: 'auth-user-doc-01',
        full_name: doctors[0]?.name || 'Dr. Mridusmita Pathak',
        role: 'doctor',
        doctor_id: doctors[0]?.id,
        created_at: new Date().toISOString(),
      });
    } else if (newRole === 'admin') {
      setCurrentProfile({
        id: 'user-admin-01',
        user_id: 'auth-user-admin-01',
        full_name: 'Dr. Nirmal Chandra Mahanta',
        role: 'admin',
        created_at: new Date().toISOString(),
      });
    } else {
      setCurrentProfile({
        id: 'user-rec-01',
        user_id: 'auth-user-rec-01',
        full_name: 'Dr. Nirmal Chandra Mahanta',
        role: 'receptionist',
        created_at: new Date().toISOString(),
      });
    }
  };

  // Sync Supabase status on mount
  useEffect(() => {
    setIsConnectedToSupabase(isSupabaseConfigured());
  }, []);

  // Quick Action: Book appointment for a specific patient
  const handleBookForPatient = (patient: Patient) => {
    setSelectedPatientForBooking(patient);
    setIsNewAppointmentModalOpen(true);
  };

  // Quick Action: Open patient profile by ID
  const handleOpenPatientProfileById = (patientId: string) => {
    const pat = clinicRepo.getPatientById(patientId);
    if (pat) {
      setSelectedPatientForProfile(pat);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans antialiased">
      
      {/* Top Navigation Bar */}
      <Navbar
        userRole={currentRole}
        currentProfile={currentProfile}
        onRoleChange={handleRoleChange}
        settings={settings}
        isSupabaseConnected={isConnectedToSupabase}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenNewAppointment={() => {
          setSelectedPatientForBooking(null);
          setIsNewAppointmentModalOpen(true);
        }}
        onResetDemo={() => {
          clinicRepo.resetAllToDemo();
          setSettings(clinicRepo.getSettings());
          triggerRefresh();
        }}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* Sidebar Navigation */}
        <div className="w-64 flex-shrink-0 hidden md:block">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            userRole={currentRole}
            currentProfile={currentProfile}
            settings={settings}
            onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
            onOpenNewAppointment={() => {
              setSelectedPatientForBooking(null);
              setIsNewAppointmentModalOpen(true);
            }}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        </div>

        {/* Mobile Navigation bar for small screens */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-3 py-2 flex justify-around shadow-lg text-[10px] font-semibold text-slate-600">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'dashboard' ? 'text-sky-600' : ''}`}
          >
            <span>Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab('patients')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'patients' ? 'text-sky-600' : ''}`}
          >
            <span>Patients</span>
          </button>
          <button 
            onClick={() => setActiveTab('appointments')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'appointments' ? 'text-sky-600' : ''}`}
          >
            <span>Schedule</span>
          </button>
          <button 
            onClick={() => setActiveTab('doctors')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'doctors' ? 'text-sky-600' : ''}`}
          >
            <span>Doctors</span>
          </button>
          <button 
            onClick={() => setActiveTab('finance')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'finance' ? 'text-emerald-600' : ''}`}
          >
            <span>Finance</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')} 
            className={`flex flex-col items-center cursor-pointer ${activeTab === 'reports' ? 'text-sky-600' : ''}`}
          >
            <span>Reports</span>
          </button>
        </div>

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 min-w-0 pb-16 md:pb-6">
          
          {activeTab === 'dashboard' && (
            <ReceptionDashboard
              userRole={currentRole}
              currentProfile={currentProfile}
              settings={settings}
              onOpenNewAppointment={() => {
                setSelectedPatientForBooking(null);
                setIsNewAppointmentModalOpen(true);
              }}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onOpenPatientProfile={handleOpenPatientProfileById}
              onPrintSlip={(apt) => setSlipModalAppointment(apt)}
              onReschedule={(apt) => setRescheduleAppointment(apt)}
              onScheduleNextVisit={(apt) => setScheduleNextVisitAppointment(apt)}
              onStatusUpdated={triggerRefresh}
              onCollectPayment={(apt) => handleOpenCollectPayment(apt, undefined, apt.appointment_type === 'Follow-up' ? 'FOLLOW_UP' : 'CONSULTATION')}
              onViewReceipt={(p) => setViewReceiptPayment(p)}
              onNavigateToFinance={() => setActiveTab('finance')}
            />
          )}

          {activeTab === 'patients' && (
            <PatientList
              userRole={currentRole}
              onOpenNewPatient={() => setIsNewPatientModalOpen(true)}
              onSelectPatient={(pat) => setSelectedPatientForProfile(pat)}
              onBookAppointment={handleBookForPatient}
            />
          )}

          {activeTab === 'appointments' && (
            <AppointmentsList
              userRole={currentRole}
              settings={settings}
              onOpenNewAppointment={() => {
                setSelectedPatientForBooking(null);
                setIsNewAppointmentModalOpen(true);
              }}
              onOpenPatientProfile={handleOpenPatientProfileById}
              onPrintSlip={(apt) => setSlipModalAppointment(apt)}
              onReschedule={(apt) => setRescheduleAppointment(apt)}
              onScheduleNextVisit={(apt) => setScheduleNextVisitAppointment(apt)}
              onStatusUpdated={triggerRefresh}
              onCollectPayment={(apt) => handleOpenCollectPayment(apt, undefined, apt.appointment_type === 'Follow-up' ? 'FOLLOW_UP' : 'CONSULTATION')}
              onViewReceipt={(p) => setViewReceiptPayment(p)}
            />
          )}

          {activeTab === 'doctors' && (
            <DoctorManagement
              userRole={currentRole}
              onDoctorUpdated={triggerRefresh}
            />
          )}

          {activeTab === 'finance' && (
            <FinanceModule
              userRole={currentRole}
              currentProfile={currentProfile}
              settings={settings}
              onRefresh={triggerRefresh}
              onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
              onCollectPayment={() => handleOpenCollectPayment()}
              onViewReceipt={(p) => setViewReceiptPayment(p)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView />
          )}

          {activeTab === 'settings' && (
            <ClinicSettingsView
              userRole={currentRole}
              settings={settings}
              onSettingsSaved={(newSettings) => {
                setSettings(newSettings);
                triggerRefresh();
              }}
            />
          )}

        </main>
      </div>

      {/* ================= MODALS LAYER ================= */}

      {/* 1. Patient Registration Modal */}
      <PatientRegistrationModal
        isOpen={isNewPatientModalOpen}
        onClose={() => setIsNewPatientModalOpen(false)}
        onPatientCreated={(newPatient) => {
          triggerRefresh();
          // Registration fee collection workflow
          if (newPatient.registration_fee_required && !newPatient.registration_fee_paid) {
            handleOpenCollectPayment(undefined, newPatient, 'REGISTRATION');
          } else {
            setSelectedPatientForBooking(newPatient);
            setIsNewAppointmentModalOpen(true);
          }
        }}
        onSelectExistingPatient={(existingPatient) => {
          setSelectedPatientForBooking(existingPatient);
          setIsNewAppointmentModalOpen(true);
        }}
      />

      {/* 2. Patient Profile & Timeline Modal */}
      <PatientProfileModal
        isOpen={Boolean(selectedPatientForProfile)}
        onClose={() => setSelectedPatientForProfile(null)}
        patient={selectedPatientForProfile}
        userRole={currentRole}
        onBookAppointment={handleBookForPatient}
        onPrintSlip={(apt) => setSlipModalAppointment(apt)}
        onCollectPayment={(pat) => handleOpenCollectPayment(undefined, pat, 'REGISTRATION')}
        onViewReceipt={(p) => setViewReceiptPayment(p)}
      />

      {/* 3. New Appointment Booking Modal */}
      <NewAppointmentModal
        isOpen={isNewAppointmentModalOpen}
        onClose={() => {
          setIsNewAppointmentModalOpen(false);
          setSelectedPatientForBooking(null);
        }}
        preselectedPatient={selectedPatientForBooking}
        settings={settings}
        staffProfile={currentProfile}
        onOpenNewPatientModal={() => {
          setIsNewAppointmentModalOpen(false);
          setIsNewPatientModalOpen(true);
        }}
        onAppointmentCreated={(newApt) => {
          triggerRefresh();
        }}
        onPrintSlip={(apt) => {
          setSlipModalAppointment(apt);
        }}
      />

      {/* 4. Reschedule Modal */}
      <RescheduleModal
        isOpen={Boolean(rescheduleAppointment)}
        onClose={() => setRescheduleAppointment(null)}
        appointment={rescheduleAppointment}
        settings={settings}
        onAppointmentRescheduled={() => {
          triggerRefresh();
        }}
      />

      {/* 5. Schedule Next Visit Modal */}
      <ScheduleNextVisitModal
        isOpen={Boolean(scheduleNextVisitAppointment)}
        onClose={() => setScheduleNextVisitAppointment(null)}
        appointment={scheduleNextVisitAppointment}
        settings={settings}
        onNextVisitScheduled={() => {
          triggerRefresh();
        }}
      />

      {/* 6. Printable PDF Consultation Slip Modal */}
      <ConsultationSlipModal
        isOpen={Boolean(slipModalAppointment)}
        onClose={() => setSlipModalAppointment(null)}
        appointment={slipModalAppointment}
        settings={settings}
      />

      {/* 7. Supabase Setup & SQL Schema Modal */}
      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConnected={() => {
          setIsConnectedToSupabase(true);
          triggerRefresh();
        }}
      />

      {/* 8. Collect Payment Modal (Money Reception Section) */}
      <CollectPaymentModal
        isOpen={isCollectPaymentOpen}
        onClose={() => {
          setIsCollectPaymentOpen(false);
          setCollectPaymentAppointment(null);
          setCollectPaymentPatient(null);
          setCollectPaymentType(undefined);
        }}
        preselectedAppointment={collectPaymentAppointment}
        preselectedPatient={collectPaymentPatient}
        defaultPaymentType={collectPaymentType}
        staffProfile={currentProfile}
        settings={settings}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* 9. Official Money Receipt Modal (A5 Landscape & SMS) */}
      <MoneyReceiptModal
        isOpen={Boolean(viewReceiptPayment)}
        onClose={() => setViewReceiptPayment(null)}
        payment={viewReceiptPayment}
        settings={settings}
      />

    </div>
  );
}
