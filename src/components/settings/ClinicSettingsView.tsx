import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, 
  Building, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Upload,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  Sparkles,
  Printer,
  AlertCircle,
  IndianRupee,
  MessageSquare
} from 'lucide-react';
import { ClinicSettings, UserRole } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { INITIAL_CLINIC_SETTINGS } from '../../services/seedData';
import { ConsultationSlipModal } from '../pdf/ConsultationSlipModal';
import { downloadConsultationSlipPDF, printConsultationSlipPDF } from '../../services/pdfGenerator';
import { 
  LOGO_PRESETS, 
  processUploadedLogo, 
  createSampleAppointment 
} from '../../services/logoPresets';

interface ClinicSettingsViewProps {
  userRole: UserRole;
  settings?: ClinicSettings;
  onSettingsSaved: (newSettings: ClinicSettings) => void;
}

export const ClinicSettingsView: React.FC<ClinicSettingsViewProps> = ({
  userRole,
  settings,
  onSettingsSaved,
}) => {
  const isAdmin = userRole === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ClinicSettings>(() => ({
    ...INITIAL_CLINIC_SETTINGS,
    ...(settings || {}),
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({ ...INITIAL_CLINIC_SETTINGS, ...settings });
    }
  }, [settings]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleDayToggle = (day: string) => {
    const current = formData.working_days || [];
    if (current.includes(day)) {
      setFormData({ ...formData, working_days: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, working_days: [...current, day] });
    }
  };

  const handleFileSelect = async (file: File) => {
    setLogoError(null);
    setIsProcessingLogo(true);
    try {
      const pngDataUrl = await processUploadedLogo(file);
      setFormData(prev => ({ ...prev, logo_url: pngDataUrl }));
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to process the logo image.');
    } finally {
      setIsProcessingLogo(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isAdmin) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAdmin) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleApplyPreset = (presetDataUrl: string) => {
    setLogoError(null);
    setFormData(prev => ({ ...prev, logo_url: presetDataUrl }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isAdmin) {
      alert('Only clinic administrators can modify settings.');
      return;
    }

    const payload: ClinicSettings = {
      ...formData,
      footer_text: formData.footer_text || (formData as any).slip_footer_text || '',
    };

    const updated = clinicRepo.updateSettings(payload);
    onSettingsSaved(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  // Generate sample appointment for interactive preview
  const sampleAppointment = createSampleAppointment(formData.clinic_name);

  const handleDownloadSamplePDF = () => {
    try {
      downloadConsultationSlipPDF(sampleAppointment, formData);
    } catch (err) {
      console.error('Error downloading sample PDF:', err);
    }
  };

  const handlePrintSamplePDF = () => {
    try {
      printConsultationSlipPDF(sampleAppointment, formData);
    } catch (err) {
      console.error('Error printing sample PDF:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-sky-600" />
            <span>Clinic Settings & Appointment Slip Designer</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your clinic logo, branding details, working hours, and preview or download sample PDF slips
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => handleSubmit()}
            className="flex items-center space-x-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save All Settings</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center space-x-2">
          <span>Read-only mode. Switch to the <strong>Administrator</strong> role in the top bar to edit settings and upload clinic logos.</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Settings & Clinic Logo successfully updated! All consultation slips and booking templates will immediately reflect these changes.</span>
        </div>
      )}

      {/* SECTION: Sample PDF Slip Designer & Live Preview Banner */}
      <div className="bg-gradient-to-br from-sky-500/10 via-white to-slate-50 border border-sky-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>Sample PDF Slip Designer</span>
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Design & Test Your Printed Consultation Slip
            </h3>
            <p className="text-xs text-slate-600 max-w-xl">
              Inspect how your clinic logo, Dr. Mridusmita Pathak's credentials, appointment tokens, and footer instructions render on the official A5/A4 consultation slip before printing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSampleModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-sky-600" />
              <span>Live Preview Slip</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSamplePDF}
              className="flex items-center space-x-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Sample PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrintSamplePDF}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Test direct print layout"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Print Test</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Section 1: Logo & Visual Branding */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <ImageIcon className="w-4 h-4 text-sky-600" />
              <h3 className="font-bold text-slate-900 text-sm">Clinic Logo & Slip Header Branding</h3>
            </div>
            {formData.logo_url && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Custom Logo Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Logo Preview Area */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
              <span className="text-xs font-bold text-slate-600">Current Slip Logo</span>
              <div className="w-28 h-28 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-center justify-center overflow-hidden p-2 relative group">
                {formData.logo_url ? (
                  <img
                    src={formData.logo_url}
                    alt="Clinic Logo Preview"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-1 font-bold text-xl">
                      +
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium leading-tight block">
                      Default Clinical Emblem
                    </span>
                  </div>
                )}
              </div>

              {formData.logo_url && isAdmin && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="flex items-center space-x-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer pt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            {/* Upload Zone & Presets */}
            <div className="md:col-span-2 space-y-4">
              {/* Drag and drop upload */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => isAdmin && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragging 
                    ? 'border-sky-500 bg-sky-50/80 scale-[0.99]' 
                    : 'border-slate-300 hover:border-sky-400 bg-slate-50/50 hover:bg-slate-50'
                } ${isAdmin ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={handleFileInputChange}
                  disabled={!isAdmin}
                  className="hidden"
                />

                <div className="flex flex-col items-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      {isProcessingLogo ? 'Processing image...' : 'Click to upload or drag & drop clinic logo'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Supports PNG, JPG, SVG, WebP. Recommended square 1:1 or 4:3 ratio.
                    </p>
                  </div>
                </div>
              </div>

              {logoError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{logoError}</span>
                </div>
              )}

              {/* Logo Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Or Apply High-Res Dental Logo Presets:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {LOGO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleApplyPreset(preset.dataUrl)}
                      className="flex items-center space-x-3 p-2.5 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-left group cursor-pointer disabled:opacity-50"
                    >
                      <img
                        src={preset.dataUrl}
                        alt={preset.name}
                        className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-0.5 flex-shrink-0"
                      />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-800 group-hover:text-sky-700 truncate">
                          {preset.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {preset.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Image URL input */}
              <div className="pt-1">
                <label className="block font-semibold text-slate-700 text-xs mb-1">
                  Direct Logo URL (Alternative)
                </label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/clinic-logo.png or data:image/png;base64..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Section 2: Clinic Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Clinic Identity & Contact Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Clinic Name (Printed on Slips)</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.clinic_name}
                onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax / Registration / GST Number</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.gst_number || (formData as any).tax_id || ''}
                onChange={(e) => setFormData({ ...formData, gst_number: e.target.value, tax_id: e.target.value } as any)}
                placeholder="e.g. GSTIN27AABCS1234F1Z5"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Clinic Address</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reception Phone</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reception Email</label>
              <input
                type="email"
                disabled={!isAdmin}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Website</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Scheduling & Token Rules */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Working Hours, Slot Duration & Token Numbering</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Slot Duration</label>
              <select
                disabled={!isAdmin}
                value={formData.appointment_duration}
                onChange={(e) => setFormData({ ...formData, appointment_duration: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Working Start Time</label>
              <input
                type="time"
                disabled={!isAdmin}
                value={formData.working_hours_start}
                onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Working End Time</label>
              <input
                type="time"
                disabled={!isAdmin}
                value={formData.working_hours_end}
                onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Token Prefix</label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.token_prefix || ''}
                onChange={(e) => setFormData({ ...formData, token_prefix: e.target.value })}
                placeholder="e.g. TK"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Working Days</label>
              <div className="flex flex-wrap gap-1.5">
                {daysOfWeek.map((day) => {
                  const isChecked = (formData.working_days || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => handleDayToggle(day)}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-sky-600 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Consultation Slip Instructions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Consultation Slip Footer & Patient Instructions</h3>
          </div>

          <div className="text-xs space-y-2">
            <label className="block font-semibold text-slate-700">
              Slip Footer Instructions (Printed on every consultation slip)
            </label>
            <textarea
              rows={3}
              disabled={!isAdmin}
              value={formData.footer_text || (formData as any).slip_footer_text || ''}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value, slip_footer_text: e.target.value } as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400">
              Example: "Please report to the dental reception 10 minutes prior to your scheduled time. Carry your UHID card."
            </span>
          </div>
        </div>

        {/* Section 5: Financial & Reception Fee Policies */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Reception Billing, Registration & Fee Policies</h3>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              Cash Collection Rules
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                One-Time Registration Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="10"
                disabled={!isAdmin}
                value={formData.registration_fee ?? 100}
                onChange={(e) => setFormData({ ...formData, registration_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Charged strictly once per patient lifetime</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Consultation Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                disabled={!isAdmin}
                value={formData.default_consultation_fee ?? 500}
                onChange={(e) => setFormData({ ...formData, default_consultation_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default new consultation booking fee</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Standard Follow-up Fee (₹)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                disabled={!isAdmin}
                value={formData.default_followup_fee ?? 300}
                onChange={(e) => setFormData({ ...formData, default_followup_fee: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">Default revisit/follow-up rate</p>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Money Receipt Note / Terms
              </label>
              <input
                type="text"
                disabled={!isAdmin}
                value={formData.receipt_footer_note || 'Payments once made are non-refundable. Please preserve this receipt for your records.'}
                onChange={(e) => setFormData({ ...formData, receipt_footer_note: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Printed at the bottom of A5 Money Receipt</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                SMS Sender Header ID
              </label>
              <input
                type="text"
                maxLength={6}
                disabled={!isAdmin}
                value={formData.sms_sender_id || 'DNTREC'}
                onChange={(e) => setFormData({ ...formData, sms_sender_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">6-character DLT registered transactional header</p>
            </div>
          </div>
        </div>

        {/* Save Bar at Bottom */}
        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        )}

      </form>

      {/* Interactive Consultation Slip Modal for sample preview */}
      {isSampleModalOpen && (
        <ConsultationSlipModal
          isOpen={isSampleModalOpen}
          onClose={() => setIsSampleModalOpen(false)}
          appointment={sampleAppointment}
          settings={formData}
        />
      )}

    </div>
  );
};
