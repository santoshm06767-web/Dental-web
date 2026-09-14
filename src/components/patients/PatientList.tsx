import React, { useState } from 'react';
import { 
  Search, 
  UserPlus, 
  Users, 
  Calendar, 
  Phone, 
  ChevronRight, 
  CalendarPlus, 
  Clock,
  Sparkles
} from 'lucide-react';
import { Patient, UserRole } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';

interface PatientListProps {
  userRole: UserRole;
  onOpenNewPatient: () => void;
  onSelectPatient: (patient: Patient) => void;
  onBookAppointment: (patient: Patient) => void;
}

export const PatientList: React.FC<PatientListProps> = ({
  userRole,
  onOpenNewPatient,
  onSelectPatient,
  onBookAppointment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const patients = clinicRepo.searchPatients(searchQuery);

  // Helper to get patient last visit and next appointment
  const getPatientVisitDates = (patientId: string) => {
    const apts = clinicRepo.getAppointmentsByPatient(patientId);
    const nowStr = new Date().toISOString().split('T')[0];

    // Last visit: latest completed or past appointment
    const past = apts
      .filter(a => a.appointment_date <= nowStr)
      .sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
    const lastVisit = past[0]?.appointment_date || 'No prior visits';

    // Next visit: future scheduled
    const future = apts
      .filter(a => a.appointment_date > nowStr && a.status !== 'Cancelled')
      .sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
    const nextVisit = future[0]?.appointment_date || null;

    return { lastVisit, nextVisit };
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-sky-600" />
            <span>Patient Registry & Directory</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search existing patients by UHID, Mobile number, Name, or Email
          </p>
        </div>

        <button
          id="btn-register-patient-directory"
          onClick={onOpenNewPatient}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          id="input-patient-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Patient ID (e.g. PAT-000001), Mobile (e.g. 9876543210), Name, or Email..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:outline-none shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-100 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Patient Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Registered Patients ({patients.length})
          </div>
          {searchQuery && (
            <span className="text-xs text-sky-700 font-medium">
              Filtered by: "{searchQuery}"
            </span>
          )}
        </div>

        {patients.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-semibold text-slate-700">No matching patients found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No registered patient matches your search query. You can register them as a new patient now.
            </p>
            <button
              onClick={onOpenNewPatient}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Patient</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Patient ID / UHID</th>
                  <th className="py-3.5 px-4">Patient Name</th>
                  <th className="py-3.5 px-4">Mobile Number</th>
                  <th className="py-3.5 px-4">Age / Gender</th>
                  <th className="py-3.5 px-4">City</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4">Next Appointment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => {
                  const { lastVisit, nextVisit } = getPatientVisitDates(patient.id);

                  return (
                    <tr 
                      key={patient.id} 
                      className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                      onClick={() => onSelectPatient(patient)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-800">
                        {patient.patient_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                          {patient.first_name} {patient.last_name}
                        </div>
                        {patient.email && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {patient.email}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {patient.mobile}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {patient.age || '—'} yrs • {patient.gender}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {patient.city || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {lastVisit}
                      </td>
                      <td className="py-3.5 px-4">
                        {nextVisit ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Calendar className="w-3 h-3 mr-1" />
                            {nextVisit}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onBookAppointment(patient)}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                            title="Book appointment for this patient"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Book</span>
                          </button>
                          <button
                            onClick={() => onSelectPatient(patient)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="View patient profile"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
