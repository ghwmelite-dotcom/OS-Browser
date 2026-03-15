import React, { useState, useEffect } from 'react';
import { X, CreditCard, User, Building, Mail, Phone, MapPin, Shield, Edit2, Save, Lock } from 'lucide-react';

interface IdentityData {
  ghanaCardNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  staffId: string;
  ministry: string;
  department: string;
  officialEmail: string;
  phoneNumber: string;
  digitalAddress: string;
}

const EMPTY_FORM: IdentityData = {
  ghanaCardNumber: '',
  fullName: '',
  dateOfBirth: '',
  gender: '',
  staffId: '',
  ministry: '',
  department: '',
  officialEmail: '',
  phoneNumber: '',
  digitalAddress: '',
};

export function IdentityPanel({ onClose }: { onClose: () => void }) {
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<IdentityData>(EMPTY_FORM);

  useEffect(() => {
    const load = async () => {
      const settings = await window.osBrowser.settings.get();
      if ((settings as any)?.ghana_card_data) {
        try {
          const data = JSON.parse((settings as any).ghana_card_data);
          setIdentity(data);
          setForm(data);
        } catch {}
      }
    };
    load();
  }, []);

  const saveIdentity = async () => {
    await window.osBrowser.settings.update({ ghana_card_data: JSON.stringify(form) } as any);
    setIdentity(form);
    setEditing(false);
  };

  const fields: { key: keyof IdentityData; label: string; icon: React.ElementType; placeholder: string }[] = [
    { key: 'ghanaCardNumber', label: 'GhanaCard Number', icon: CreditCard, placeholder: 'GHA-XXXXXXXXX-X' },
    { key: 'fullName', label: 'Full Name', icon: User, placeholder: 'e.g. Kwame Asante' },
    { key: 'dateOfBirth', label: 'Date of Birth', icon: User, placeholder: 'DD/MM/YYYY' },
    { key: 'gender', label: 'Gender', icon: User, placeholder: 'Male / Female' },
    { key: 'staffId', label: 'Staff ID', icon: CreditCard, placeholder: 'Civil Service Staff ID' },
    { key: 'ministry', label: 'Ministry / Agency', icon: Building, placeholder: 'e.g. Ministry of Finance' },
    { key: 'department', label: 'Department', icon: Building, placeholder: 'e.g. Budget Division' },
    { key: 'officialEmail', label: 'Official Email', icon: Mail, placeholder: 'name@gov.gh' },
    { key: 'phoneNumber', label: 'Phone Number', icon: Phone, placeholder: '024 XXX XXXX' },
    { key: 'digitalAddress', label: 'Digital Address', icon: MapPin, placeholder: 'GhanaPostGPS address' },
  ];

  return (
    <div
      className="w-[340px] border-l flex flex-col h-full animate-slide-in-right"
      style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border-1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-1)' }}>
        <div className="flex items-center gap-2">
          <CreditCard size={16} style={{ color: 'var(--color-accent)' }} />
          <span className="text-[14px] font-bold text-text-primary">GhanaCard Identity</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2">
          <X size={14} className="text-text-muted" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!identity && !editing ? (
          /* Setup prompt */
          <div className="text-center py-8">
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}
            >
              <CreditCard size={28} className="text-white" />
            </div>
            <h3 className="text-[16px] font-bold text-text-primary mb-2">Set Up Your GhanaCard</h3>
            <p className="text-[13px] text-text-muted mb-6 leading-relaxed">
              Store your GhanaCard and civil service details for quick auto-fill on government portals.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold"
              style={{ background: 'var(--color-accent)', color: '#fff' }}
            >
              Set Up Identity
            </button>
            <p className="text-[10px] text-text-muted mt-4 flex items-center justify-center gap-1">
              <Lock size={10} /> Stored securely on your device only
            </p>
          </div>
        ) : editing ? (
          /* Edit form */
          <div className="space-y-3">
            <p className="text-[12px] text-text-muted mb-2">Fill in your details for auto-fill on government sites:</p>
            {fields.map(field => (
              <div key={field.key}>
                <label className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1 block">
                  {field.label}
                </label>
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                  style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border-1)' }}
                >
                  <field.icon size={13} className="text-text-muted shrink-0" />
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="flex-1 bg-transparent text-[13px] outline-none text-text-primary placeholder:text-text-muted"
                  />
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setEditing(false);
                  if (!identity) setForm(EMPTY_FORM);
                }}
                className="flex-1 py-2 rounded-lg text-[12px] font-medium border hover:bg-surface-2"
                style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={saveIdentity}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5"
                style={{ background: 'var(--color-accent)', color: '#fff' }}
              >
                <Save size={12} /> Save Identity
              </button>
            </div>
          </div>
        ) : (
          /* View identity */
          <div>
            <div className="text-center mb-5">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #CE1126 0%, #FCD116 50%, #006B3F 100%)' }}
              >
                <span className="text-[20px] font-bold text-white">{identity!.fullName.charAt(0)}</span>
              </div>
              <h3 className="text-[15px] font-bold text-text-primary">{identity!.fullName}</h3>
              <p className="text-[12px] text-text-muted">{identity!.ministry || 'Ghana Civil Service'}</p>
            </div>

            <div className="space-y-2">
              {fields.map(field => {
                const value = identity![field.key];
                if (!value) return null;
                return (
                  <div
                    key={field.key}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ background: 'var(--color-surface-2)' }}
                  >
                    <field.icon size={13} className="text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-text-muted">{field.label}</p>
                      <p className="text-[13px] text-text-primary truncate">
                        {field.key === 'ghanaCardNumber' ? `GHA-****-${value.slice(-1)}` : value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEditing(true)}
              className="w-full mt-4 py-2 rounded-lg text-[12px] font-medium border hover:bg-surface-2 flex items-center justify-center gap-1.5"
              style={{ borderColor: 'var(--color-border-1)', color: 'var(--color-text-secondary)' }}
            >
              <Edit2 size={12} /> Edit Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
