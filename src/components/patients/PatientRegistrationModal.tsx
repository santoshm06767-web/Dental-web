import React, { useState, useEffect, useId } from 'react';
import { 
  X, 
  UserPlus, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  User, 
  Calendar, 
  MapPin, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Patient, DuplicatePatientCheckResult } from '../../types';
import { clinicRepo } from '../../services/clinicRepository';

interface PatientRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientCreated: (patient: Patient) => void;
  onSelectExistingPatient?: (patient: Patient) => void;
}

export const PatientRegistrationModal: React.FC<PatientRegistrationModalProps> = ({
  isOpen,
  onClose,
  onPatientCreated,
  onSelectExistingPatient,
}) => {
  const [formData, setFormData] = useState({
    patient_code: '',
    first_name: '',
    last_name: '',
    gender: 'Male' as 'Male' | 'Female' | 'Other',
    date_of_birth: '',
    age: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    blood_group: '',
    allergies: '',
    medical_notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicatePatientCheckResult | null>(null);
  const [allowBypassDuplicate, setAllowBypassDuplicate] = useState(false);

  // Initialize auto-generated patient code on open
  useEffect(() => {
    if (isOpen) {
      const generatedCode = clinicRepo.generatePatientCode();
      setFormData({
        patient_code: generatedCode,
        first_name: '',
        last_name: '',
        gender: 'Male',
        date_of_birth: '',
        age: '',
        mobile: '',
        alternate_mobile: '',
        email: '',
        address: '',
        city: 'Metro City',
        state: 'California',
        postal_code: '90210',
        emergency_contact_name: '',
        emergency_contact_number: '',
        blood_group: '',
        allergies: '',
        medical_notes: '',
      });
      setErrors({});
      setDuplicateWarning(null);
      setAllowBypassDuplicate(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Auto calculate age from Date of Birth
  const handleDobChange = (dobStr: string) => {
    let calculatedAge = '';
    if (dobStr) {
      const dob = new Date(dobStr);
      if (!isNaN(dob.getTime())) {
        const diffMs = Date.now() - dob.getTime();
        const ageDt = new Date(diffMs);
        calculatedAge = String(Math.abs(ageDt.getUTCFullYear() - 1970));
      }
    }
    setFormData(prev => ({
      ...prev,
      date_of_birth: dobStr,
      age: calculatedAge,
    }));

    // Trigger duplicate check with updated DOB
    checkDuplicates({
      ...formData,
      date_of_birth: dobStr,
    });
  };

  const handleInputChange = (field: string, value: string) => {
    const nextData = { ...formData, [field]: value };
    setFormData(nextData);

    if (errors[field]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }

    if (['mobile', 'first_name', 'last_name', 'patient_code'].includes(field)) {
      checkDuplicates(nextData);
    }
  };

  const checkDuplicates = (data: typeof formData) => {
    if ((data.mobile && data.mobile.length >= 7) || (data.first_name && data.date_of_birth)) {
      const result = clinicRepo.checkDuplicatePatient({
        mobile: data.mobile,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        patient_code: data.patient_code,
      });

      if (result.isDuplicate) {
        setDuplicateWarning(result);
      } else {
        setDuplicateWarning(null);
        setAllowBypassDuplicate(false);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.first_name.trim()) errs.first_name = 'First name is required';
    if (!formData.last_name.trim()) errs.last_name = 'Last name is required';
    if (!formData.date_of_birth) errs.date_of_birth = 'Date of birth is required';
    
    // Mobile validation: minimum 7 digits
    const cleanMobile = formData.mobile.replace(/[\s\-\(\)\+]/g, '');
    if (!cleanMobile) {
      errs.mobile = 'Mobile number is required';
    } else if (cleanMobile.length < 8) {
      errs.mobile = 'Please enter a valid mobile number (min 8 digits)';
    }

    if (!formData.address.trim()) errs.address = 'Address is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.state.trim()) errs.state = 'State is required';
    if (!formData.postal_code.trim()) errs.postal_code = 'Postal code is required';
    if (!formData.emergency_contact_name.trim()) errs.emergency_contact_name = 'Emergency contact name is required';
    if (!formData.emergency_contact_number.trim()) errs.emergency_contact_number = 'Emergency contact number is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // Check duplicate warning
    if (duplicateWarning?.isDuplicate && !allowBypassDuplicate) {
      return; // Must confirm or select existing
    }

    try {
      const newPatient = clinicRepo.createPatient({
        patient_code: formData.patient_code,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        mobile: formData.mobile.trim(),
        alternate_mobile: formData.alternate_mobile.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postal_code: formData.postal_code.trim(),
        emergency_contact_name: formData.emergency_contact_name.trim(),
        emergency_contact_number: formData.emergency_contact_number.trim(),
        blood_group: formData.blood_group || undefined,
        allergies: formData.allergies.trim() || undefined,
        medical_notes: formData.medical_notes.trim() || undefined,
        active: true,
      });

      onPatientCreated(newPatient);
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Failed to register patient');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-sky-100 rounded-lg text-sky-700">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">New Patient Registration</h2>
              <p className="text-xs text-slate-500">
                Front desk patient intake & UHID generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* DUPLICATE WARNING BANNER */}
          {duplicateWarning?.isDuplicate && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-amber-900 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-amber-950">
                    Possible Existing Patient Found!
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Matches existing clinic record by:{' '}
                    <strong>{duplicateWarning.matchedBy.join(', ')}</strong>.
                    Please check to avoid duplicate UHID registration.
                  </p>

                  <div className="mt-3 space-y-2">
                    {duplicateWarning.matchedPatients.map(p => (
                      <div 
                        key={p.id}
                        className="bg-white/80 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-900">{p.first_name} {p.last_name}</span>{' '}
                          <span className="text-slate-500 font-mono">({p.patient_code})</span>
                          <div className="text-slate-600 mt-0.5">
                            Mobile: {p.mobile} | DOB: {p.date_of_birth} ({p.gender})
                          </div>
                        </div>

                        {onSelectExistingPatient && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectExistingPatient(p);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                          >
                            <span>Use Existing</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowBypassDuplicate}
                        onChange={(e) => setAllowBypassDuplicate(e.target.checked)}
                        className="rounded border-amber-400 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>This is a different patient (confirm and proceed with registration)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 1: Demographics & Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
              <User className="w-3.5 h-3.5 text-sky-600" />
              <span>Demographic Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Patient ID / UHID */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient ID / UHID (Auto)
                </label>
                <input
                  type="text"
                  readOnly
                  value={formData.patient_code}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 text-sm font-mono font-bold cursor-not-allowed"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-first-name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="e.g. John"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.first_name ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.first_name && <p className="text-red-500 text-[11px] mt-0.5">{errors.first_name}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="input-last-name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="e.g. Doe"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.last_name ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.last_name && <p className="text-red-500 text-[11px] mt-0.5">{errors.last_name}</p>}
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Gender */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  id="select-gender"
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="input-dob"
                  value={formData.date_of_birth}
                  onChange={(e) => handleDobChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.date_of_birth ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.date_of_birth && <p className="text-red-500 text-[11px] mt-0.5">{errors.date_of_birth}</p>}
              </div>

              {/* Age (Auto calculated) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="e.g. 35"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact Information */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              <span>Contact Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="input-mobile"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.mobile ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.mobile && <p className="text-red-500 text-[11px] mt-0.5">{errors.mobile}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alternate Mobile (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.alternate_mobile}
                  onChange={(e) => handleInputChange('alternate_mobile', e.target.value)}
                  placeholder="Optional backup phone"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Address fields */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="House #, Street name, Area"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.address ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.address && <p className="text-red-500 text-[11px] mt-0.5">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.city ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Postal / PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.postal_code ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  placeholder="Spouse, parent, or guardian"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.emergency_contact_name ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.emergency_contact_name && <p className="text-red-500 text-[11px] mt-0.5">{errors.emergency_contact_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_number}
                  onChange={(e) => handleInputChange('emergency_contact_number', e.target.value)}
                  placeholder="Emergency phone number"
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
                    errors.emergency_contact_number ? 'border-red-400 bg-red-50' : 'border-slate-300'
                  }`}
                />
                {errors.emergency_contact_number && <p className="text-red-500 text-[11px] mt-0.5">{errors.emergency_contact_number}</p>}
              </div>
            </div>
          </div>

          {/* Section 3: Clinical & Medical Details */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 border-b border-slate-200 pb-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-sky-600" />
              <span>Medical & Health Details (Optional)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <select
                  value={formData.blood_group}
                  onChange={(e) => handleInputChange('blood_group', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                >
                  <option value="">Select (Optional)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allergies (e.g. Penicillin, Latex, Local Anesthetic)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                  placeholder="None or list known drug allergies"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medical & Dental Notes
              </label>
              <textarea
                rows={2}
                value={formData.medical_notes}
                onChange={(e) => handleInputChange('medical_notes', e.target.value)}
                placeholder="Cardiac conditions, diabetes, ongoing medications, dental phobias..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-new-patient"
              disabled={duplicateWarning?.isDuplicate && !allowBypassDuplicate}
              className={`px-5 py-2 rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center space-x-2 cursor-pointer ${
                duplicateWarning?.isDuplicate && !allowBypassDuplicate
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-sky-600 hover:bg-sky-700 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
