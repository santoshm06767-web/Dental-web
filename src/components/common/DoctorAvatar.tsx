import React, { useState, useEffect } from 'react';
import { resolveDoctorPhoto } from '../../assets/images/doctors';

export interface DoctorAvatarProps {
  name: string;
  photoUrl?: string;
  doctorId?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  role?: string;
  alt?: string;
  showBorder?: boolean;
}

const sizeClasses: Record<string, { container: string; text: string; ring: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', ring: 'ring-1' },
  sm: { container: 'w-8 h-8', text: 'text-xs', ring: 'ring-1' },
  md: { container: 'w-10 h-10', text: 'text-sm', ring: 'ring-1.5' },
  lg: { container: 'w-12 h-12', text: 'text-base', ring: 'ring-2' },
  xl: { container: 'w-16 h-16', text: 'text-xl', ring: 'ring-2' },
  '2xl': { container: 'w-20 h-20', text: 'text-2xl', ring: 'ring-2' },
};

export const DoctorAvatar: React.FC<DoctorAvatarProps> = ({
  name,
  photoUrl,
  doctorId,
  size = 'md',
  className = '',
  alt,
  showBorder = true,
}) => {
  const [imageError, setImageError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  useEffect(() => {
    setImageError(false);
    setFallbackError(false);
  }, [photoUrl, name, doctorId]);

  // Compute clean initial letter (e.g. "Dr. Mridusmita" -> "M", "Dr Nirmal" -> "N")
  const cleanName = (name || '').replace(/^Dr\.?\s*/i, '').trim();
  const initial = cleanName.charAt(0).toUpperCase() || 'D';

  const config = sizeClasses[size] || sizeClasses.md;

  // Resolve photo url: either explicit photoUrl, or default mapping by doctor name
  const resolvedPhoto = (() => {
    if (fallbackError) return null;
    if (!imageError && photoUrl) {
      const resolved = resolveDoctorPhoto(photoUrl, name, doctorId);
      if (resolved) return resolved;
    }
    // If photoUrl failed or wasn't provided, fall back to default doctor photo by name or id
    return resolveDoctorPhoto(null, name, doctorId);
  })();

  if (resolvedPhoto) {
    return (
      <div
        className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-xl overflow-hidden bg-slate-100 ${
          config.container
        } ${showBorder ? `${config.ring} ring-sky-200/70 shadow-xs` : ''} ${className}`}
      >
        <img
          src={resolvedPhoto}
          alt={alt || name}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center aspect-square rounded-xl transition-all duration-200 hover:scale-105 select-none"
          onError={() => {
            if (!imageError && photoUrl) {
              setImageError(true);
            } else {
              setFallbackError(true);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-shrink-0 items-center justify-center font-bold text-white rounded-xl bg-gradient-to-br from-sky-600 to-sky-800 shadow-xs select-none ${
        config.container
      } ${config.text} ${showBorder ? `${config.ring} ring-sky-200/50` : ''} ${className}`}
    >
      {initial}
    </div>
  );
};
