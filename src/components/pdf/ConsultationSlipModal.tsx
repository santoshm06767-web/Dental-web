import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  Building2, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Appointment, ClinicSettings, Profile } from '../../types';
import { downloadConsultationSlipPDF, printConsultationSlipPDF } from '../../services/pdfGenerator';
import { DoctorAvatar } from '../common/DoctorAvatar';

interface ConsultationSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  settings: ClinicSettings;
  staffProfile?: Profile;
}

export const ConsultationSlipModal: React.FC<ConsultationSlipModalProps> = ({
  isOpen,
  onClose,
  appointment,
  settings,
  staffProfile,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleDownload = () => {
    try {
      downloadConsultationSlipPDF(appointment, settings, staffProfile);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (e) {
      console.error('PDF download error:', e);
    }
  };

  const handlePrint = () => {
    try {
      printConsultationSlipPDF(appointment, settings, staffProfile);
    } catch (e) {
      console.error('PDF print error:', e);
    }
  };

  const patient = appointment.patient;
  const doctor = appointment.doctor;
  const tokenFormatted = `${settings?.token_prefix ? settings.token_prefix + '-' : ''}${String(appointment.token_number).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold text-base">
            <FileText className="w-5 h-5 text-sky-700" />
            <span>Doctor's Prescription & Appointment Slip Preview</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Visual Slip Card */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-100/70 flex-1">
          <div 
            id="printable-slip-preview" 
            className="bg-white rounded-xl p-5 sm:p-7 shadow-sm border border-slate-200 text-slate-800 font-sans space-y-4 max-w-2xl mx-auto"
          >
            {/* Slip Header: Clinic Branding & Token */}
            <div className="border border-slate-200 bg-slate-50/80 rounded-xl p-3.5 flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5 min-w-0">
                {settings?.logo_url ? (
                  <img 
                    src={settings.logo_url} 
                    alt={settings?.clinic_name || 'Clinic Logo'} 
                    className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 p-1 flex-shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-sky-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-2xs">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-extrabold text-slate-900 text-base sm:text-lg leading-tight truncate">
                    {settings?.clinic_name || 'AROGYA DENTAL CARE & IMPLANT CENTRE'}
                  </h2>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    {settings?.address || 'Pratima Medical Store, Khodasingi, Berhampur, 760001'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ph: {settings?.phone || '+91 94370 12345'} • Email: {settings?.email || 'contact@arogyadental.com'}
                    {settings?.website && ` • ${settings.website}`}
                  </p>
                </div>
              </div>

              {/* Appointment Slip & Token Badge */}
              <div className="bg-sky-700 text-white rounded-lg p-2 sm:px-3 sm:py-2 text-center flex-shrink-0 shadow-xs min-w-[90px]">
                <div className="text-[8px] uppercase tracking-wider font-bold text-sky-100">Appointment Slip</div>
                <div className="text-[8px] uppercase tracking-widest text-sky-200">Token No.</div>
                <div className="text-base sm:text-lg font-black leading-tight tracking-tight mt-0.5">{tokenFormatted}</div>
              </div>
            </div>

            {/* Patient & Doctor Details Compact Strip (Exact match to sample doc) */}
            <div className="border border-slate-200 bg-slate-50/60 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              
              {/* Patient Details Column */}
              <div className="space-y-1 sm:border-r sm:border-slate-200 sm:pr-3">
                <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider pb-1 border-b border-slate-200">
                  Patient Details
                </div>
                <div className="flex justify-between items-baseline pt-0.5">
                  <span><strong>Name:</strong> {patient ? `${patient.first_name} ${patient.last_name}` : 'Walk-in Patient'}</span>
                  <span className="text-slate-600"><strong>Age:</strong> {patient?.age ? `${patient.age} Yrs` : 'N/A'} / {patient?.gender || '-'}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span><strong>Patient ID:</strong> <span className="font-mono text-slate-700">{patient?.patient_code || appointment.patient_id}</span></span>
                  <span><strong>Mobile:</strong> {patient?.mobile || 'N/A'}</span>
                </div>
                <div className="text-slate-600 truncate">
                  <strong>Complaint:</strong> {appointment.reason || 'General Dental Consultation'}
                </div>
              </div>

              {/* Doctor Details Column with Photo beside name */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-sky-800 uppercase tracking-wider pb-1 border-b border-slate-200 flex justify-between">
                  <span>Doctor & Schedule</span>
                  <span className="text-slate-500 font-mono text-[10px]">Apt #{appointment.appointment_code}</span>
                </div>
                <div className="flex items-center gap-2.5 pt-1">
                  <DoctorAvatar
                    name={doctor?.name || 'Dr. Mridusmita Pathak'}
                    photoUrl={doctor?.photo_url}
                    doctorId={doctor?.id}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 leading-tight">
                      {doctor?.name || 'Dr. Mridusmita Pathak'}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      {doctor?.qualification}
                    </div>
                  </div>
                </div>
                <div className="text-slate-600 pt-0.5">
                  <strong>Specialty:</strong> {doctor?.specialization || 'Dental Surgeon'} • {doctor?.consultation_room || 'Room 101'}
                </div>
                <div className="text-slate-600">
                  <strong>Date & Time:</strong> {appointment.appointment_date} at {appointment.appointment_time}
                </div>
              </div>

            </div>

            {/* Medical Allergy Warning if any */}
            {patient?.allergies && patient.allergies.toLowerCase() !== 'none' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
                <span><strong>Medical Alert / Allergies:</strong> {patient.allergies}</span>
              </div>
            )}

            {/* 3. Rx SECTION - PRESCRIPTION & MEDICATIONS WITH AMPLE SPACE */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-serif font-black text-sky-800 italic leading-none">Rx</span>
                <span className="text-xs font-semibold text-slate-500">(Prescription & Medications)</span>
              </div>

              {/* Prescription Table Grid */}
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-100/90 text-slate-700 font-bold grid grid-cols-12 px-2.5 py-1.5 border-b border-slate-200 text-[11px]">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Medicine Name & Strength</div>
                  <div className="col-span-2 text-center">Dosage (M-A-N)</div>
                  <div className="col-span-2 text-center">Duration</div>
                  <div className="col-span-2 text-right">Instructions</div>
                </div>

                {/* Blank / Ruled Prescription Lines for Doctor's Writing */}
                {[1, 2, 3, 4, 5].map((num) => (
                  <div key={num} className="grid grid-cols-12 px-2.5 py-2.5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 items-center">
                    <div className="col-span-1 text-slate-300 font-mono text-[10px]">{num}.</div>
                    <div className="col-span-5 text-slate-300 border-b border-dashed border-slate-200 h-4"></div>
                    <div className="col-span-2 text-slate-300 border-b border-dashed border-slate-200 h-4 mx-1"></div>
                    <div className="col-span-2 text-slate-300 border-b border-dashed border-slate-200 h-4 mx-1"></div>
                    <div className="col-span-2 text-slate-300 border-b border-dashed border-slate-200 h-4"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. ADVICE & CLINICAL FINDINGS SECTION - SUFFICIENT GENEROUS SPACE */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-sky-800">Advice & Clinical Findings</span>
                <span className="text-[11px] text-slate-400 italic">Dental procedures, home-care & precautions</span>
              </div>

              {/* Ruled lines for Doctor's Clinical Findings, Diagnosis & Advice */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/30 space-y-2.5">
                {appointment.notes && (
                  <p className="text-xs text-slate-700 bg-white border border-slate-200/80 rounded p-2 mb-2">
                    <strong className="text-slate-900">Clinical Notes:</strong> {appointment.notes}
                  </p>
                )}
                {[1, 2, 3, 4, 5, 6, 7].map((line) => (
                  <div key={line} className="border-b border-slate-200/90 h-5"></div>
                ))}
              </div>
            </div>

            {/* 5. FOLLOW-UP / NEXT VISIT & DOCTOR'S SIGNATURE */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-4 text-xs">
              {/* Next Visit Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex-1 max-w-sm">
                <div className="font-bold text-sky-800 text-[10px] uppercase tracking-wider mb-1">
                  Next Visit / Review Date
                </div>
                <div className="text-slate-700 font-medium">
                  Date: {appointment.next_visit_date 
                    ? `${appointment.next_visit_date}${appointment.next_visit_time ? ' at ' + appointment.next_visit_time : ''}` 
                    : '_____ / _____ / 20___'}
                </div>
                {appointment.next_visit_notes && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Remarks: {appointment.next_visit_notes}
                  </div>
                )}
              </div>

              {/* Signature Area */}
              <div className="text-right sm:w-60 flex flex-col items-end pt-4 sm:pt-0">
                <div className="w-44 border-b border-slate-400 mb-1.5"></div>
                <div className="font-bold text-slate-800 text-xs">Doctor's Signature / Stamp</div>
                <div className="text-[11px] text-slate-500">
                  {doctor?.name || 'Dr. Mridusmita Pathak'}
                </div>
              </div>
            </div>

            {/* 6. FOOTER (Matching exact sample document) */}
            <div className="pt-3 border-t border-slate-300 text-xs space-y-1.5 text-slate-600">
              <p className="text-[11px] text-center text-slate-500 italic">
                {settings?.footer_text || 'Please bring this prescription slip during follow-up visits. For emergency inquiries, please contact the clinic.'}
              </p>
              
              <div className="pt-1 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-medium text-slate-700">
                <div><strong>Phone :</strong> {settings?.phone || '+91 94370 12345'}</div>
                <div><strong>email :</strong> {settings?.email || 'contact@arogyadental.com'}</div>
                <div><strong>Url :</strong> {settings?.website || 'https://arogyadental.com'}</div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {downloadSuccess ? (
              <span className="text-emerald-600 flex items-center font-medium">
                <CheckCircle className="w-4 h-4 mr-1" /> PDF downloaded successfully!
              </span>
            ) : (
              <span>Formatted for A4 or thermal receipt printer.</span>
            )}
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              id="btn-print-slip"
              onClick={handlePrint}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Slip</span>
            </button>

            <button
              id="btn-download-pdf-slip"
              onClick={handleDownload}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
