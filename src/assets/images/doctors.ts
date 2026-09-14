import drMriduPhoto from './dr-mridu.jpg';
import drSwagatPhoto from './dr-swagat.jpg';
import drNirmalPhoto from './dr-nirmal.jpg';
import { drMriduBase64, drSwagatBase64, drNirmalBase64 } from './doctorBase64';

// Export both Vite-bundled assets and guaranteed inline base64 URIs
export { drMriduPhoto, drSwagatPhoto, drNirmalPhoto, drMriduBase64, drSwagatBase64, drNirmalBase64 };

export const DOCTOR_PHOTOS: Record<string, string> = {
  'doc-001': drMriduBase64,
  'doc-002': drSwagatBase64,
  'doc-003': drNirmalBase64,
};

/**
 * Normalizes any photo URL, path, or doctor reference to guaranteed working asset URL
 * Ensures 100% reliable rendering on Android mobile browsers, desktop, and PDF slips.
 */
export function resolveDoctorPhoto(photoUrl?: string | null, doctorName?: string, doctorId?: string): string | null {
  // First check by ID if known
  if (doctorId && DOCTOR_PHOTOS[doctorId]) {
    // If an explicit valid data: or http(s) URL was provided that is not a broken relative path, we can try it,
    // otherwise our base64 preset is guaranteed to load without network or mobile encoding issues.
    if (photoUrl && photoUrl.startsWith('data:image')) {
      return photoUrl;
    }
    if (photoUrl && (photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))) {
      return photoUrl;
    }
    return DOCTOR_PHOTOS[doctorId];
  }

  // Next check by photoUrl string matching
  if (photoUrl) {
    const trimmed = photoUrl.trim();
    const lower = trimmed.toLowerCase();

    // Dr. Mridusmita Pathak
    if (
      lower.includes('dr-mridu') ||
      lower.includes('dr mridu') ||
      lower.includes('mridu') ||
      trimmed.includes('dr-mridusmita') ||
      trimmed === '/assets/doctors/dr-mridusmita.svg' ||
      lower.includes('dr%20mridu')
    ) {
      return drMriduBase64;
    }

    // Dr. Swagat Kumar Mahanta
    if (
      lower.includes('dr-swagat') ||
      lower.includes('dr swagat') ||
      lower.includes('swagat') ||
      trimmed.includes('dr-swagat') ||
      trimmed === '/assets/doctors/dr-swagat.svg' ||
      lower.includes('dr%20swagat')
    ) {
      return drSwagatBase64;
    }

    // Dr. Nirmal Chandra Mahanta
    if (
      lower.includes('dr-nirmal') ||
      lower.includes('dr nirmal') ||
      lower.includes('nirmal') ||
      trimmed.includes('dr-nirmal') ||
      trimmed === '/assets/doctors/dr-nirmal.svg' ||
      lower.includes('dr%20nirmal')
    ) {
      return drNirmalBase64;
    }

    // Direct Data URIs
    if (trimmed.startsWith('data:image')) {
      return trimmed;
    }

    // Direct external HTTP / HTTPS URLs
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // Encoded relative paths
    if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
      const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
      return encodeURI(normalizedPath);
    }
  }

  // Fallback by Doctor Name (Notice 'swagat' must be checked before 'mahanta' because both Dr. Swagat and Dr. Nirmal share the surname Mahanta)
  if (doctorName) {
    const lowerName = doctorName.toLowerCase();
    if (lowerName.includes('swagat')) {
      return drSwagatBase64;
    }
    if (lowerName.includes('nirmal')) {
      return drNirmalBase64;
    }
    if (lowerName.includes('mridu') || lowerName.includes('pathak')) {
      return drMriduBase64;
    }
    if (lowerName.includes('mahanta')) {
      return drNirmalBase64;
    }
  }

  return null;
}
