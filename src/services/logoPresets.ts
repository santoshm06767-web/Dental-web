import { Appointment } from '../types';

// Preset dental clinic logos and logo processing utilities for consultation slips

export interface LogoPreset {
  id: string;
  name: string;
  description: string;
  dataUrl: string;
}

// Crisp inline SVG data URL for Arogya Dental Care & Implant Centre
// Featuring a medical tooth emblem, implant threading accents, and clinic aesthetic
export const AROGYA_DENTAL_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="arogyaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%230284c7" />
      <stop offset="100%" stop-color="%230369a1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%2338bdf8" />
      <stop offset="100%" stop-color="%230ea5e9" />
    </linearGradient>
  </defs>
  <!-- Background Shield Container -->
  <rect x="10" y="10" width="180" height="180" rx="40" fill="url(%23arogyaGrad)" />
  <rect x="16" y="16" width="168" height="168" rx="34" fill="none" stroke="%23bae6fd" stroke-width="3" stroke-opacity="0.5" />
  
  <!-- Stylized Tooth Silhouette -->
  <path d="M 60 70 C 60 48, 80 44, 100 52 C 120 44, 140 48, 140 70 C 140 92, 134 116, 122 144 C 118 152, 108 154, 104 140 C 100 126, 100 126, 96 140 C 92 154, 82 152, 78 144 C 66 116, 60 92, 60 70 Z" 
        fill="%23ffffff" />
        
  <!-- Medical Implant Rings -->
  <rect x="88" y="112" width="24" height="4" rx="2" fill="%230284c7" />
  <rect x="91" y="122" width="18" height="3" rx="1.5" fill="%230284c7" />
  <rect x="94" y="130" width="12" height="3" rx="1.5" fill="%230284c7" />
  
  <!-- Tooth Sparkle / Shine -->
  <path d="M 76 65 Q 82 58 92 56 Q 86 64 84 74 Q 76 74 76 65 Z" fill="%23e0f2fe" />
  
  <!-- Cross Accent -->
  <rect x="96" y="74" width="8" height="22" rx="2" fill="url(%23goldGrad)" />
  <rect x="89" y="81" width="22" height="8" rx="2" fill="url(%23goldGrad)" />
  
  <!-- Dental Care Sparkle Star -->
  <polygon points="144,48 147,56 155,59 147,62 144,70 141,62 133,59 141,56" fill="%23fef08a" />
</svg>`;

export const MODERN_TOOTH_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="%230f766e" />
      <stop offset="100%" stop-color="%23042f2e" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="180" height="180" rx="36" fill="url(%23tealGrad)" />
  <circle cx="100" cy="100" r="76" fill="none" stroke="%2399f6e4" stroke-width="2" stroke-opacity="0.4" />
  
  <!-- Tooth outline with heart apex -->
  <path d="M 64 74 C 64 54, 82 50, 100 58 C 118 50, 136 54, 136 74 C 136 96, 130 118, 120 144 C 116 152, 108 152, 104 138 C 100 124, 100 124, 96 138 C 92 152, 84 152, 80 144 C 70 118, 64 96, 64 74 Z" 
        fill="%23f0fdfa" />
        
  <!-- Smile curve inside -->
  <path d="M 80 88 Q 100 108 120 88" fill="none" stroke="%230f766e" stroke-width="5" stroke-linecap="round" />
  <circle cx="86" cy="80" r="3" fill="%230f766e" />
  <circle cx="114" cy="80" r="3" fill="%230f766e" />
</svg>`;

export const LOGO_PRESETS: LogoPreset[] = [
  {
    id: 'arogya-implant',
    name: 'Arogya Dental & Implant Shield',
    description: 'Specialist dental implant & clinical cross shield in cyan/sky blue',
    dataUrl: AROGYA_DENTAL_LOGO_SVG,
  },
  {
    id: 'modern-teal-smile',
    name: 'Gentle Care Smile Emblem',
    description: 'Clean aesthetic tooth with smile curve in deep clinical teal',
    dataUrl: MODERN_TOOTH_LOGO_SVG,
  },
];

/**
 * Converts any user-uploaded file (PNG, JPG, SVG, WebP) into a clean,
 * bounded PNG Data URL that jsPDF and standard browser elements can render safely.
 */
export function processUploadedLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, SVG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        reject(new Error('Failed to read image file.'));
        return;
      }

      // If SVG, convert to PNG via canvas for reliable jsPDF rendering
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 360;
        let width = img.width || 300;
        let height = img.height || 300;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(result);
          return;
        }

        // Draw image onto canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        try {
          const pngUrl = canvas.toDataURL('image/png', 0.95);
          resolve(pngUrl);
        } catch {
          resolve(result);
        }
      };

      img.onerror = () => {
        // Fallback to raw data url
        resolve(result);
      };

      img.src = result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Creates a sample appointment object populated with current clinic branding
 * so users can preview and design their PDF copy instantly without having an existing patient.
 */
export function createSampleAppointment(clinicName?: string, doctorName?: string): Appointment {
  const todayStr = new Date().toISOString().split('T')[0];
  return {
    id: 'apt-sample-demo',
    appointment_code: 'APT-000101',
    patient_id: 'pat-sample-01',
    doctor_id: 'doc-001',
    appointment_date: todayStr,
    appointment_time: '10:30',
    token_number: 1,
    appointment_type: 'New Consultation' as const,
    reason: 'Dental Implant Consultation & Routine Oral Examination',
    status: 'Scheduled' as const,
    notes: 'Patient requested digital smile assessment & implant viability check.',
    next_visit_date: '2026-09-21',
    next_visit_time: '10:30',
    next_visit_notes: 'Follow-up for implant impression and 3D CBCT review',
    created_by: 'user-rec-01',
    created_by_name: 'Reception Front Desk',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    patient: {
      id: 'pat-sample-01',
      patient_code: 'PAT-000001',
      first_name: 'Rajesh',
      last_name: 'Sharma',
      gender: 'Male',
      date_of_birth: '1985-06-15',
      age: 41,
      mobile: '+91 98765 43210',
      email: 'rajesh.sharma@example.com',
      address: 'House 42, Green Park Avenue, Phase 2',
      city: 'Guwahati',
      state: 'Assam',
      postal_code: '781001',
      emergency_contact_name: 'Anita Sharma',
      emergency_contact_number: '+91 98765 43211',
      active: true,
      blood_group: 'O+',
      medical_notes: 'Hypertension (managed), No diabetes',
      allergies: 'Penicillin (mild rash)',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    doctor: {
      id: 'doc-001',
      doctor_code: 'DOC-001',
      name: doctorName || 'Dr. Mridusmita Pathak',
      qualification: 'BDS, MDS (Orthodontics & Aesthetic Dentistry)',
      specialization: 'Orthodontist & Implantologist',
      registration_number: 'DENT-REG-89214',
      mobile: '+91 98540 12001',
      email: 'dr.mridusmita@arogyadental.com',
      consultation_room: 'Room 101 (Ortho & Implant Bay)',
      active: true,
      available_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      start_time: '09:00',
      end_time: '17:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}
