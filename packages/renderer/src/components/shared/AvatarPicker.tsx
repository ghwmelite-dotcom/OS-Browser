import React, { useRef, useCallback } from 'react';
import { Camera } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  AvatarPicker                                                       */
/* ------------------------------------------------------------------ */

interface AvatarPickerProps {
  /** Base64 data URL of the current avatar image */
  currentAvatar?: string;
  /** Used to derive initials when no avatar image is set */
  displayName: string;
  /** Diameter in px (default 64) */
  size?: number;
  /** Called with the resized base64 data URL after the user picks an image */
  onAvatarChange: (url: string) => void;
  /** Whether clicking opens the file picker (default true) */
  editable?: boolean;
}

/* ─────────── helpers ─────────── */

const AVATAR_BG_COLORS = [
  '#CE1126', '#006B3F', '#D4A017', '#1565C0',
  '#6A1B9A', '#00838F', '#E65100', '#2E7D32',
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function pickBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

function resizeToBase64(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ─────────── component ─────────── */

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  currentAvatar,
  displayName,
  size = 64,
  onAvatarChange,
  editable = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (editable) inputRef.current?.click();
  }, [editable]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const base64 = await resizeToBase64(file, 128);
        onAvatarChange(base64);
      } catch {
        // silently ignore corrupt files
      }

      // reset so re-selecting the same file triggers onChange again
      e.target.value = '';
    },
    [onAvatarChange],
  );

  const initials = getInitials(displayName || '?');
  const bgColor = pickBgColor(displayName || '?');
  const fontSize = Math.round(size * 0.36);
  const overlayIconSize = Math.max(14, Math.round(size * 0.28));

  return (
    <div
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      aria-label={editable ? 'Change avatar' : 'User avatar'}
      onClick={handleClick}
      onKeyDown={e => {
        if (editable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      className="relative inline-flex items-center justify-center select-none group"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        cursor: editable ? 'pointer' : 'default',
        outline: 'none',
      }}
    >
      {/* Avatar circle */}
      {currentAvatar ? (
        <img
          src={currentAvatar}
          alt={`${displayName}'s avatar`}
          draggable={false}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid var(--color-surface-2, rgba(128,128,128,0.2))',
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center font-semibold text-white"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: bgColor,
            fontSize,
            lineHeight: 1,
            border: '2px solid var(--color-surface-2, rgba(128,128,128,0.2))',
          }}
        >
          {initials}
        </div>
      )}

      {/* Hover overlay with camera icon */}
      {editable && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full
                     opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                     transition-opacity duration-150"
          style={{
            background: 'rgba(0, 0, 0, 0.45)',
          }}
        >
          <Camera
            size={overlayIconSize}
            className="text-white"
            strokeWidth={2}
          />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
};

export default AvatarPicker;
