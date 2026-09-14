import React, { useState } from 'react';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Printer, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  Stethoscope 
} from 'lucide-react';
import { clinicRepo } from '../../services/clinicRepository';
import { Doctor, AppointmentStatus } from '../../types';

export const ReportsView: React.FC = () => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState<'daily' | 'doctor' | 'status' | 'registrations' | 'completed'>('daily');
  const [fromDate, setFromDate] = useState<string>(firstOfMonth);
  const [toDate, setToDate] = useState<string>(today);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const allAppointments = clinicRepo.getAppointments();
  const allPatients = clinicRepo.getPatients();
  const doctors = clinicRepo.getDoctors();

  // Filtered appointments by date range, doctor, status
  const filteredAppointments = allAppointments.filter(apt => {
    if (fromDate && apt.appointment_date < fromDate) return false;
    if (toDate && apt.appointment_date > toDate) return false;
    if (selectedDoctor !== 'ALL' && apt.doctor_id !== selectedDoctor) return false;
    if (selectedStatus !== 'ALL' && apt.status !== selectedStatus) return false;
    return true;
  });

  // Filtered patients by date range
  const filteredPatients = allPatients.filter(pat => {
    const regDate = pat.created_at.split('T')[0];
    if (fromDate && regDate < fromDate) return false;
    if (toDate && regDate > toDate) return false;
    return true;
  });

  // Summary Metrics
  const totalInPeriod = filteredAppointments.length;
  const completedInPeriod = filteredAppointments.filter(a => a.status === 'Completed').length;
  const cancelledInPeriod = filteredAppointments.filter(a => a.status === 'Cancelled').length;
  const noShowInPeriod = filteredAppointments.filter(a => a.status === 'No Show').length;
  const completionRate = totalInPeriod > 0 ? Math.round((completedInPeriod / totalInPeriod) * 100) : 0;

  // Breakdown by doctor
  const doctorStats = doctors.map(doc => {
    const docApts = filteredAppointments.filter(a => a.doctor_id === doc.id);
    const completed = docApts.filter(a => a.status === 'Completed').length;
    return {
      doctor: doc,
      total: docApts.length,
      completed,
      waiting: docApts.filter(a => a.status === 'Waiting' || a.status === 'Checked-in').length,
      rate: docApts.length > 0 ? Math.round((completed / docApts.length) * 100) : 0,
    };
  });

  // Breakdown by status
  const statuses: AppointmentStatus[] = [
    'Scheduled', 'Checked-in', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show'
  ];
  const statusCounts = statuses.map(s => ({
    status: s,
    count: filteredAppointments.filter(a => a.status === s).length,
  }));

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers = ['Appointment Code', 'Date', 'Time', 'Patient UHID', 'Patient Name', 'Doctor', 'Type', 'Status'];
    let rows = filteredAppointments.map(a => [
      a.appointment_code,
      a.appointment_date,
      a.appointment_time,
      a.patient?.patient_code || '',
      `"${a.patient?.first_name || ''} ${a.patient?.last_name || ''}"`,
      `"${a.doctor?.name || ''}"`,
      a.appointment_type,
      a.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `clinic_report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            <span>Clinic Operational Reports & Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational analytics, appointment volumes, doctor productivity, and patient registration reports
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Range & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          
          <div>
            <label className="block font-semibold text-slate-700 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">All Doctors</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Visits</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalInPeriod}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <span className="text-xs text-emerald-700 font-semibold uppercase">Completed</span>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{completedInPeriod}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-sky-200 bg-sky-50/20 shadow-sm">
          <span className="text-xs text-sky-700 font-semibold uppercase">Completion Rate</span>
          <div className="text-2xl font-bold text-sky-800 mt-1">{completionRate}%</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <span className="text-xs text-rose-700 font-semibold uppercase">Cancelled</span>
          <div className="text-2xl font-bold text-rose-800 mt-1">{cancelledInPeriod}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <span className="text-xs text-blue-700 font-semibold uppercase">New Patients</span>
          <div className="text-2xl font-bold text-blue-800 mt-1">{filteredPatients.length}</div>
        </div>
      </div>

      {/* Report Sub-tabs */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'daily' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Daily Appointments
        </button>
        <button
          onClick={() => setActiveTab('doctor')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'doctor' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments by Doctor
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'status' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Appointments by Status
        </button>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`pb-2.5 px-3 text-xs font-semibold cursor-pointer border-b-2 transition-colors ${
            activeTab === 'registrations' ? 'border-sky-600 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Patient Registrations
        </button>
      </div>

      {/* Report Tables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* TAB 1: DAILY APPOINTMENTS */}
        {activeTab === 'daily' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Apt Code</th>
                  <th className="py-3 px-4">Patient Name & UHID</th>
                  <th className="py-3 px-4">Doctor</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-medium">{a.appointment_date} {a.appointment_time}</td>
                    <td className="py-3 px-4 font-mono text-cyan-700">{a.appointment_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {a.patient?.first_name} {a.patient?.last_name} ({a.patient?.patient_code})
                    </td>
                    <td className="py-3 px-4 text-slate-800">{a.doctor?.name}</td>
                    <td className="py-3 px-4 text-slate-600">{a.appointment_type}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 border border-slate-200">
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{a.next_visit_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: APPOINTMENTS BY DOCTOR */}
        {activeTab === 'doctor' && (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {doctorStats.map(stat => (
                <div key={stat.doctor.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{stat.doctor.name}</h4>
                      <p className="text-[11px] text-cyan-700">{stat.doctor.specialization}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                      {stat.rate}% Completion
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Total</span>
                      <strong className="text-slate-800">{stat.total}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Completed</span>
                      <strong className="text-emerald-700">{stat.completed}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Waiting</span>
                      <strong className="text-amber-700">{stat.waiting}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: APPOINTMENTS BY STATUS */}
        {activeTab === 'status' && (
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {statusCounts.map(item => (
                <div key={item.status} className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-center space-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">{item.status}</div>
                  <div className="text-2xl font-bold text-slate-900">{item.count}</div>
                  <div className="text-[11px] text-slate-400">
                    {totalInPeriod > 0 ? `${Math.round((item.count / totalInPeriod) * 100)}% of total` : '0%'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PATIENT REGISTRATIONS */}
        {activeTab === 'registrations' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4">Patient ID / UHID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Gender & Age</th>
                  <th className="py-3 px-4">Mobile</th>
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Emergency Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono text-cyan-700 font-bold">{p.patient_code}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.first_name} {p.last_name}</td>
                    <td className="py-3 px-4 text-slate-600">{p.gender} • {p.age || '—'} yrs</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{p.mobile}</td>
                    <td className="py-3 px-4 text-slate-600">{p.city}</td>
                    <td className="py-3 px-4 text-slate-600">{p.emergency_contact_name} ({p.emergency_contact_number})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
