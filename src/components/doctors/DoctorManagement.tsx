import React, { useState } from 'react';
import { 
  Stethoscope, 
  UserPlus, 
  Edit, 
  Power, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  Building,
  Phone,
  Mail,
  ShieldAlert,
  Camera,
  Upload,
  Sparkles,
  Shield,
  Link2,
  Check,
  Globe,
  X
} from 'lucide-react';
import { Doctor, UserRole } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';
import { DoctorAvatar } from '../common/DoctorAvatar';
import { drMriduBase64, drSwagatBase64, drNirmalBase64 } from '../../assets/images/doctors';

interface DoctorManagementProps {
  userRole: UserRole;
  onDoctorUpdated: () => void;
}

export const DoctorManagement: React.FC<DoctorManagementProps> = ({
  userRole,
  onDoctorUpdated,
}) => {
  const isAdmin = userRole === 'admin';
  const doctors = clinicRepo.getDoctors();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Quick Photo & Link modal
  const [photoModalDoctor, setPhotoModalDoctor] = useState<Doctor | null>(null);
  const [photoInputUrl, setPhotoInputUrl] = useState('');

  const openPhotoModal = (doc: Doctor) => {
    setPhotoModalDoctor(doc);
    setPhotoInputUrl(doc.photo_url || '');
  };

  const handleSavePhotoModal = (newPhotoUrl?: string) => {
    if (!photoModalDoctor) return;
    const urlToSave = newPhotoUrl !== undefined ? newPhotoUrl : photoInputUrl.trim();
    clinicRepo.updateDoctor(photoModalDoctor.id, { photo_url: urlToSave });
    setPhotoModalDoctor(null);
    onDoctorUpdated();
  };

  const handleQuickPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoModalDoctor) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPhotoInputUrl(dataUrl);
        clinicRepo.updateDoctor(photoModalDoctor.id, { photo_url: dataUrl });
        setPhotoModalDoctor(null);
        onDoctorUpdated();
      }
    };
    reader.readAsDataURL(file);
  };

  const [formData, setFormData] = useState({
    doctor_code: '',
    name: '',
    qualification: '',
    specialization: '',
    registration_number: '',
    mobile: '',
    email: '',
    consultation_room: '',
    photo_url: '',
    start_time: '09:00',
    end_time: '17:00',
    available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const openAddModal = () => {
    setEditingDoctor(null);
    setFormData({
      doctor_code: clinicRepo.generateDoctorCode(),
      name: '',
      qualification: '',
      specialization: '',
      registration_number: '',
      mobile: '',
      email: '',
      consultation_room: '',
      photo_url: '',
      start_time: '09:00',
      end_time: '17:00',
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      active: true,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setFormData({
      doctor_code: doc.doctor_code,
      name: doc.name,
      qualification: doc.qualification,
      specialization: doc.specialization,
      registration_number: doc.registration_number || '',
      mobile: doc.mobile || '',
      email: doc.email || '',
      consultation_room: doc.consultation_room || '',
      photo_url: doc.photo_url || '',
      start_time: doc.start_time,
      end_time: doc.end_time,
      available_days: doc.available_days,
      active: doc.active,
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleDirectPhotoUpload = (docId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        clinicRepo.updateDoctor(docId, { photo_url: dataUrl });
        onDoctorUpdated();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleModalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({ ...prev, photo_url: dataUrl }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleActive = (doc: Doctor) => {
    if (!isAdmin) {
      alert('Only administrators can activate or deactivate doctors.');
      return;
    }
    clinicRepo.toggleDoctorStatus(doc.id);
    onDoctorUpdated();
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Doctor name is required';
    if (!formData.qualification.trim()) errs.qualification = 'Qualification is required';
    if (!formData.specialization.trim()) errs.specialization = 'Specialization is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (editingDoctor) {
      clinicRepo.updateDoctor(editingDoctor.id, {
        name: formData.name.trim(),
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        registration_number: formData.registration_number.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        consultation_room: formData.consultation_room.trim() || undefined,
        photo_url: formData.photo_url.trim() || undefined,
        start_time: formData.start_time,
        end_time: formData.end_time,
        available_days: formData.available_days,
        active: formData.active,
      });
    } else {
      clinicRepo.createDoctor({
        doctor_code: formData.doctor_code,
        name: formData.name.trim(),
        qualification: formData.qualification.trim(),
        specialization: formData.specialization.trim(),
        registration_number: formData.registration_number.trim() || undefined,
        mobile: formData.mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        consultation_room: formData.consultation_room.trim() || undefined,
        photo_url: formData.photo_url.trim() || undefined,
        start_time: formData.start_time,
        end_time: formData.end_time,
        available_days: formData.available_days,
        active: true,
      });
    }

    setIsModalOpen(false);
    onDoctorUpdated();
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Stethoscope className="w-5 h-5 text-sky-600" />
            <span>Doctor & Specialist Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure clinical specialists, consultation rooms, duty hours, and active status
          </p>
        </div>

        {isAdmin && (
          <button
            id="btn-add-new-doctor"
            onClick={openAddModal}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add New Doctor</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800 flex items-center space-x-2">
          <span>Viewing as Receptionist. Switch to Admin role in top bar to add, edit or toggle active status of doctors.</span>
        </div>
      )}

      {/* Doctors Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {doctors.map((doc, idx) => (
          <div
            key={doc.id}
            className={`bg-white rounded-xl border transition-all p-5 shadow-sm space-y-4 flex flex-col justify-between ${
              doc.active ? 'border-slate-200' : 'border-slate-300 bg-slate-50/70 opacity-80'
            }`}
          >
            <div className="space-y-3">
              {/* Card Top */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="relative group/avatar shrink-0">
                    <DoctorAvatar
                      name={doc.name}
                      photoUrl={doc.photo_url}
                      doctorId={doc.id}
                      size="lg"
                      className={!doc.active ? 'opacity-70 grayscale' : ''}
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => openPhotoModal(doc)}
                        title="Upload, change, or paste image link"
                        className="absolute -bottom-1 -right-1 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-600 p-1.5 rounded-full shadow-md border border-slate-200 cursor-pointer transition-transform group-hover/avatar:scale-110 flex items-center justify-center"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-600" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3
                        className={`font-bold text-slate-900 truncate ${
                          idx === 0
                            ? 'text-[12px] w-[87.3125px]'
                            : idx === 1
                            ? 'text-[12px]'
                            : idx === 2
                            ? 'text-[12px] leading-[24px]'
                            : 'text-[12px]'
                        }`}
                      >
                        {doc.name}
                      </h3>
                      {(doc.name.includes('Nirmal') || doc.id === 'doc-003') && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Clinic Director & Admin">
                          <Shield className="w-2.5 h-2.5 text-amber-600" />
                          Director
                        </span>
                      )}
                    </div>
                    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 mt-0.5">
                      {doc.specialization}
                    </span>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                  doc.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {doc.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Doctor Details */}
              <div className="text-xs space-y-1.5 text-slate-600 pt-1">
                <div>
                  <strong className="text-slate-800">Qualification:</strong> {doc.qualification}
                </div>
                {doc.registration_number && (
                  <div>
                    <strong className="text-slate-800">Reg No:</strong> {doc.registration_number}
                  </div>
                )}
                {doc.consultation_room && (
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.consultation_room}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{doc.start_time} - {doc.end_time}</span>
                </div>
                {doc.mobile && (
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.mobile}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            {isAdmin && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  id={`btn-toggle-doctor-${doc.id}`}
                  onClick={() => handleToggleActive(doc)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    doc.active 
                      ? 'text-rose-700 hover:bg-rose-50 border border-rose-200' 
                      : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                  title={doc.active ? 'Deactivate doctor' : 'Activate doctor'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{doc.active ? 'Deactivate' : 'Activate'}</span>
                </button>

                <button
                  id={`btn-edit-doctor-${doc.id}`}
                  onClick={() => openEditModal(doc)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingDoctor ? 'Edit Doctor Details' : 'Add New Clinic Doctor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              
              {/* Doctor Photo Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <label className="block font-semibold text-slate-700">Doctor Profile Photo</label>
                <div className="flex items-center gap-3">
                  <DoctorAvatar
                    name={formData.name || 'Doctor'}
                    photoUrl={formData.photo_url}
                    doctorId={formData.id}
                    size="xl"
                    className="shadow-sm border border-slate-200"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-300 rounded-lg font-medium cursor-pointer shadow-xs transition-colors">
                        <Upload className="w-3.5 h-3.5 text-sky-600" />
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleModalPhotoUpload}
                        />
                      </label>
                      {formData.photo_url && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, photo_url: '' })}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 font-medium"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo_url: drMriduBase64 })}
                        className="px-2 py-0.5 rounded text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-800 font-medium cursor-pointer"
                      >
                        Dr. Mridusmita
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo_url: drSwagatBase64 })}
                        className="px-2 py-0.5 rounded text-[10px] bg-teal-100 hover:bg-teal-200 text-teal-800 font-medium cursor-pointer"
                      >
                        Dr. Swagat
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo_url: drNirmalBase64 })}
                        className="px-2 py-0.5 rounded text-[10px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium cursor-pointer"
                      >
                        Dr. Nirmal
                      </button>
                    </div>

                    {/* Direct Image Link / Web URL Input */}
                    <div className="pt-1.5 space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <Link2 className="w-3 h-3 text-sky-600" />
                        <span>Or Paste Image Link / URL:</span>
                      </label>
                      <input
                        type="url"
                        value={formData.photo_url}
                        onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                        placeholder="Paste image link (e.g. https://...)"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Doctor Code</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.doctor_code}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Doctor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-doc-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Raj Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                  {errors.name && <p className="text-red-500 text-[10px] mt-0.5">{errors.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-doc-specialization"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g. Orthodontist"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Qualification <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. BDS, MDS (Orthodontics)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registration No</label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="e.g. DENT-REG-89214"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Consultation Room</label>
                  <input
                    type="text"
                    value={formData.consultation_room}
                    onChange={(e) => setFormData({ ...formData, consultation_room: e.target.value })}
                    placeholder="e.g. Room 101 (Ortho Bay)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-doctor-submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold cursor-pointer"
                >
                  Save Doctor
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Quick Photo & Link Modal */}
      {photoModalDoctor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Update Photo for {photoModalDoctor.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPhotoModalDoctor(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Live Preview */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <DoctorAvatar
                  name={photoModalDoctor.name}
                  photoUrl={photoInputUrl}
                  doctorId={photoModalDoctor.id}
                  size="xl"
                  className="shadow-sm border border-slate-200"
                />
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">{photoModalDoctor.name}</div>
                  <div className="text-[11px] text-sky-700 font-medium">{photoModalDoctor.specialization}</div>
                  <p className="text-[10px] text-slate-500">
                    Paste an image link or upload a file from your device
                  </p>
                </div>
              </div>

              {/* Paste Image URL / Link */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Link2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Paste Image Link / URL:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={photoInputUrl}
                    onChange={(e) => setPhotoInputUrl(e.target.value)}
                    placeholder="https://example.com/doctor-photo.jpg or image link"
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                  />
                  {photoInputUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoInputUrl('')}
                      className="px-2.5 py-2 text-slate-400 hover:text-rose-600 text-xs font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Supports any image link (Google Drive, Imgur, direct URL, etc.)
                </p>
              </div>

              {/* Upload File */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>Or Upload From Computer / Phone:</span>
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-dashed border-slate-300 hover:border-sky-400 rounded-xl font-medium cursor-pointer transition-colors text-center">
                  <Upload className="w-4 h-4 text-sky-600" />
                  <span>Choose Photo File...</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQuickPhotoUpload}
                  />
                </label>
              </div>

              {/* Presets */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Studio Portrait Presets:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPhotoInputUrl(drMriduBase64)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-sky-100 hover:bg-sky-200 text-sky-800 font-medium cursor-pointer transition-colors"
                  >
                    Dr. Mridusmita
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoInputUrl(drSwagatBase64)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-teal-100 hover:bg-teal-200 text-teal-800 font-medium cursor-pointer transition-colors"
                  >
                    Dr. Swagat
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoInputUrl(drNirmalBase64)}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium cursor-pointer transition-colors"
                  >
                    Dr. Nirmal
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPhotoModalDoctor(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePhotoModal()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Photo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
