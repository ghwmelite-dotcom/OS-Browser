import { h, render } from '../utils/dom';
import { showToast } from '../components/toast';

interface GhanaCardData {
  fullName: string;
  cardNumber: string; // GHA-XXXXXXXXX-X format
  dateOfBirth: string;
  gender: 'Male' | 'Female';
  nationality: string;
  dateOfIssue: string;
  expiryDate: string;
}

const STORAGE_KEY = 'os_mobile_ghana_card';
const CARD_NUMBER_REGEX = /^GHA-\d{9}-\d$/;

function loadCardData(): GhanaCardData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCardData(data: GhanaCardData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isExpired(expiryDate: string): boolean {
  return new Date(expiryDate) < new Date();
}

function maskCardNumber(num: string): string {
  // GHA-123456789-0 -> GHA-*****6789-0
  if (num.length < 15) return num;
  return num.slice(0, 4) + '*****' + num.slice(9);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

// Decorative QR-like grid seeded from card number
function buildQRGrid(cardNumber: string): HTMLElement {
  const seed = cardNumber.replace(/\D/g, '');
  const cells: HTMLElement[] = [];
  const gridSize = 11;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      // Corner finder patterns
      const isCornerFinder =
        (row < 3 && col < 3) ||
        (row < 3 && col >= gridSize - 3) ||
        (row >= gridSize - 3 && col < 3);

      // Seed-based fill for data area
      const idx = row * gridSize + col;
      const seedChar = seed[idx % seed.length] || '0';
      const filled = isCornerFinder
        ? (row === 1 && col === 1) || (row === 1 && col === gridSize - 2) || (row === gridSize - 2 && col === 1)
          ? false
          : true
        : (parseInt(seedChar, 10) + row + col) % 3 !== 0;

      cells.push(
        h('div', {
          style: {
            width: '100%',
            aspectRatio: '1',
            borderRadius: '1px',
            background: filled ? '#fff' : 'transparent',
            transition: 'background 200ms ease',
          },
        }),
      );
    }
  }

  return h(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gap: '2px',
        width: '120px',
        height: '120px',
        padding: '8px',
        background: '#1a1a1a',
        borderRadius: '12px',
        margin: '0 auto',
      },
    },
    ...cells,
  );
}

export function renderGhanaCardPage(container: HTMLElement): void {
  let cardData = loadCardData();
  let editMode = false;
  let numberRevealed = false;

  function buildPage(): void {
    const expired = cardData ? isExpired(cardData.expiryDate) : false;

    // ── Section Header Helper ──
    function sectionHeader(title: string): HTMLElement {
      return h(
        'div',
        {
          style: {
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(11px, 2.8vw, 12px)',
            fontWeight: '700',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '1.5px',
            padding: '20px 16px 10px',
          },
        },
        title,
      );
    }

    // ── Digital Card ──
    function buildCard(): HTMLElement {
      if (!cardData) {
        return h(
          'div',
          {
            style: {
              background: 'var(--surface, #141414)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '16px',
              padding: '40px 20px',
              textAlign: 'center',
              margin: '16px',
            },
          },
          h(
            'div',
            {
              style: {
                fontSize: 'clamp(32px, 8vw, 40px)',
                marginBottom: '12px',
              },
            },
            '\uD83C\uDDEC\uD83C\uDDED',
          ),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(16px, 4.2vw, 18px)',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '8px',
              },
            },
            'No Ghana Card Added',
          ),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(13px, 3.4vw, 14px)',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: '1.5',
              },
            },
            'Tap "Add Card" below to enter your Ghana Card details.',
          ),
        );
      }

      const initial = getInitials(cardData.fullName);
      const displayNumber = numberRevealed ? cardData.cardNumber : maskCardNumber(cardData.cardNumber);

      const card = h(
        'div',
        {
          style: {
            background: 'linear-gradient(145deg, #1c1c1e 0%, #0d0d0d 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            overflow: 'hidden',
            margin: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            transform: 'perspective(800px) rotateY(0deg) rotateX(0deg)',
            transition: 'transform 400ms ease, box-shadow 400ms ease',
            cursor: 'pointer',
            willChange: 'transform',
          },
          onClick: () => {
            // Toggle number reveal on tap
            numberRevealed = !numberRevealed;
            buildPage();
          },
          onMouseenter: (e: MouseEvent) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'perspective(800px) rotateY(2deg) rotateX(-1deg)';
            el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)';
          },
          onMouseleave: (e: MouseEvent) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg)';
            el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)';
          },
          onTouchstart: (e: TouchEvent) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'perspective(800px) rotateY(3deg) rotateX(-2deg) scale(0.98)';
          },
          onTouchend: (e: TouchEvent) => {
            const el = e.currentTarget as HTMLElement;
            el.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
          },
        },

        // Flag gradient strip
        h('div', {
          style: {
            height: '6px',
            background: 'linear-gradient(90deg, #CE1126 0%, #CE1126 33%, #D4A017 33%, #D4A017 66%, #006B3F 66%, #006B3F 100%)',
          },
        }),

        // Card body
        h(
          'div',
          { style: { padding: '20px' } },

          // Header row
          h(
            'div',
            {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              },
            },
            h(
              'div',
              {},
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(10px, 2.5vw, 11px)',
                    fontWeight: '600',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#D4A017',
                    marginBottom: '2px',
                  },
                },
                'REPUBLIC OF GHANA',
              ),
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(16px, 4.2vw, 18px)',
                    fontWeight: '800',
                    color: '#fff',
                    letterSpacing: '1px',
                  },
                },
                'GHANA CARD',
              ),
            ),
            // Ghana coat of arms placeholder
            h(
              'div',
              {
                style: {
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D4A017 0%, #b8860b 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: '0',
                },
              },
              '\uD83C\uDDEC\uD83C\uDDED',
            ),
          ),

          // Profile + Info
          h(
            'div',
            {
              style: {
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                marginBottom: '16px',
              },
            },
            // Photo circle
            h(
              'div',
              {
                style: {
                  width: '56px',
                  height: '56px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #D4A017 0%, #b8860b 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(20px, 5vw, 24px)',
                  fontWeight: '800',
                  flexShrink: '0',
                },
              },
              initial,
            ),
            // Name + Number
            h(
              'div',
              { style: { flex: '1', minWidth: '0' } },
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(15px, 4vw, 17px)',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '4px',
                    wordBreak: 'break-word',
                  },
                },
                cardData.fullName.toUpperCase(),
              ),
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(13px, 3.4vw, 14px)',
                    color: '#D4A017',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  },
                },
                displayNumber,
              ),
              h(
                'div',
                {
                  style: {
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(10px, 2.6vw, 11px)',
                    color: 'rgba(255,255,255,0.35)',
                    marginTop: '2px',
                  },
                },
                numberRevealed ? 'Tap card to hide number' : 'Tap card to reveal number',
              ),
            ),
          ),

          // Divider
          h('div', {
            style: {
              height: '1px',
              background: 'rgba(255,255,255,0.08)',
              margin: '0 0 12px',
            },
          }),

          // Detail rows
          buildDetailGrid(cardData),

          // Status bar
          h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '14px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.06)',
              },
            },
            // Status
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                },
              },
              h('div', {
                style: {
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: expired ? '#CE1126' : '#006B3F',
                  boxShadow: expired ? '0 0 8px rgba(206,17,38,0.5)' : '0 0 8px rgba(0,107,63,0.5)',
                },
              }),
              h(
                'span',
                {
                  style: {
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(11px, 2.8vw, 12px)',
                    fontWeight: '600',
                    color: expired ? '#CE1126' : '#006B3F',
                  },
                },
                expired ? 'EXPIRED' : 'ACTIVE',
              ),
            ),
            h(
              'span',
              {
                style: {
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(10px, 2.6vw, 11px)',
                  color: 'rgba(255,255,255,0.3)',
                },
              },
              'National Identification Authority',
            ),
          ),
        ),
      );

      // Add entrance animation
      requestAnimationFrame(() => {
        card.style.opacity = '0';
        card.style.transform = 'perspective(800px) rotateY(-5deg) rotateX(3deg) scale(0.95)';
        requestAnimationFrame(() => {
          card.style.transition = 'opacity 500ms ease, transform 500ms ease, box-shadow 400ms ease';
          card.style.opacity = '1';
          card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
        });
      });

      return card;
    }

    function buildDetailGrid(data: GhanaCardData): HTMLElement {
      function detailItem(label: string, value: string): HTMLElement {
        return h(
          'div',
          { style: { marginBottom: '2px' } },
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(9px, 2.2vw, 10px)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'rgba(255,255,255,0.35)',
                marginBottom: '1px',
              },
            },
            label,
          ),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(12px, 3.2vw, 13px)',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.85)',
              },
            },
            value,
          ),
        );
      }

      return h(
        'div',
        {
          style: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px 16px',
          },
        },
        detailItem('Date of Birth', data.dateOfBirth),
        detailItem('Gender', data.gender),
        detailItem('Nationality', data.nationality),
        detailItem('Date of Issue', data.dateOfIssue),
        detailItem('Expiry Date', data.expiryDate),
      );
    }

    // ── Edit Mode ──
    function buildEditForm(): HTMLElement {
      const formData: GhanaCardData = cardData
        ? { ...cardData }
        : {
            fullName: '',
            cardNumber: '',
            dateOfBirth: '',
            gender: 'Male',
            nationality: 'Ghanaian',
            dateOfIssue: '',
            expiryDate: '',
          };

      function fieldInput(
        label: string,
        key: keyof GhanaCardData,
        type = 'text',
        placeholder = '',
      ): HTMLElement {
        return h(
          'div',
          { style: { marginBottom: '14px' } },
          h(
            'label',
            {
              style: {
                display: 'block',
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(11px, 2.8vw, 12px)',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'rgba(255,255,255,0.45)',
                marginBottom: '6px',
              },
            },
            label,
          ),
          h('input', {
            type,
            value: formData[key],
            placeholder,
            style: {
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(14px, 3.6vw, 15px)',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 200ms ease',
            },
            onFocus: (e: FocusEvent) => {
              (e.target as HTMLInputElement).style.borderColor = '#D4A017';
            },
            onBlur: (e: FocusEvent) => {
              (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)';
            },
            onInput: (e: Event) => {
              (formData as any)[key] = (e.target as HTMLInputElement).value;
            },
          }),
        );
      }

      // Gender select
      const genderSelect = h(
        'div',
        { style: { marginBottom: '14px' } },
        h(
          'label',
          {
            style: {
              display: 'block',
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(11px, 2.8vw, 12px)',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'rgba(255,255,255,0.45)',
              marginBottom: '6px',
            },
          },
          'Gender',
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              gap: '8px',
            },
          },
          ...(['Male', 'Female'] as const).map((g) => {
            const active = formData.gender === g;
            return h(
              'button',
              {
                style: {
                  flex: '1',
                  padding: '10px',
                  border: active ? '1px solid #D4A017' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  background: active ? 'rgba(212,160,23,0.15)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#D4A017' : 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(14px, 3.6vw, 15px)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  minHeight: '44px',
                },
                onClick: () => {
                  formData.gender = g;
                  buildPage();
                },
              },
              g,
            );
          }),
        ),
      );

      // Save handler
      function handleSave(): void {
        // Validate all fields
        const fields: (keyof GhanaCardData)[] = [
          'fullName',
          'cardNumber',
          'dateOfBirth',
          'gender',
          'nationality',
          'dateOfIssue',
          'expiryDate',
        ];
        for (const f of fields) {
          if (!formData[f] || !formData[f].trim()) {
            showToast(`Please fill in all fields`, 'error');
            return;
          }
        }
        // Validate card number format
        if (!CARD_NUMBER_REGEX.test(formData.cardNumber)) {
          showToast('Card number must be GHA-XXXXXXXXX-X', 'error');
          return;
        }
        saveCardData(formData);
        cardData = formData;
        editMode = false;
        numberRevealed = false;
        showToast('Ghana Card saved successfully', 'success');
        buildPage();
      }

      return h(
        'div',
        {
          style: {
            background: 'var(--surface, #141414)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: '16px',
            padding: '20px 16px',
            margin: '0 16px 16px',
          },
        },
        fieldInput('Full Name', 'fullName', 'text', 'Kofi Mensah'),
        fieldInput('Card Number', 'cardNumber', 'text', 'GHA-123456789-0'),
        fieldInput('Date of Birth', 'dateOfBirth', 'date'),
        genderSelect,
        fieldInput('Nationality', 'nationality', 'text', 'Ghanaian'),
        fieldInput('Date of Issue', 'dateOfIssue', 'date'),
        fieldInput('Expiry Date', 'expiryDate', 'date'),

        // Save + Cancel buttons
        h(
          'div',
          {
            style: {
              display: 'flex',
              gap: '10px',
              marginTop: '6px',
            },
          },
          h(
            'button',
            {
              style: {
                flex: '1',
                padding: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.6vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '48px',
              },
              onClick: () => {
                editMode = false;
                buildPage();
              },
            },
            'Cancel',
          ),
          h(
            'button',
            {
              style: {
                flex: '1',
                padding: '14px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #006B3F 0%, #005a34 100%)',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.6vw, 15px)',
                fontWeight: '700',
                cursor: 'pointer',
                minHeight: '48px',
                boxShadow: '0 4px 12px rgba(0,107,63,0.3)',
              },
              onClick: handleSave,
            },
            'Save Card',
          ),
        ),
      );
    }

    // ── Action Buttons ──
    function buildActions(): HTMLElement {
      const buttons: HTMLElement[] = [];

      // Edit / Add button
      buttons.push(
        h(
          'button',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              background: 'var(--surface, #141414)',
              color: '#D4A017',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(14px, 3.6vw, 15px)',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '48px',
              transition: 'all 200ms ease',
            },
            onClick: () => {
              editMode = true;
              buildPage();
            },
          },
          cardData ? '\u270E  Edit Card Details' : '\u002B  Add Ghana Card',
        ),
      );

      // Share button (only if card data exists)
      if (cardData) {
        buttons.push(
          h(
            'button',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                background: 'var(--surface, #141414)',
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.6vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '48px',
                transition: 'all 200ms ease',
              },
              onClick: async () => {
                if (!cardData) return;
                const text = [
                  `Ghana Card - ${cardData.fullName}`,
                  `Card Number: ${cardData.cardNumber}`,
                  `Date of Birth: ${cardData.dateOfBirth}`,
                  `Gender: ${cardData.gender}`,
                  `Nationality: ${cardData.nationality}`,
                  `Issued: ${cardData.dateOfIssue}`,
                  `Expires: ${cardData.expiryDate}`,
                ].join('\n');

                if (navigator.share) {
                  try {
                    await navigator.share({
                      title: 'Ghana Card Details',
                      text,
                    });
                  } catch {
                    // User cancelled share — no toast needed
                  }
                } else {
                  // Fallback: copy to clipboard
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast('Card details copied to clipboard', 'success');
                  } catch {
                    showToast('Unable to share', 'error');
                  }
                }
              },
            },
            '\u{1F4E4}  Share Card Details',
          ),
        );

        // Delete button
        buttons.push(
          h(
            'button',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '14px',
                border: '1px solid rgba(206,17,38,0.2)',
                borderRadius: '12px',
                background: 'rgba(206,17,38,0.08)',
                color: '#CE1126',
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(14px, 3.6vw, 15px)',
                fontWeight: '600',
                cursor: 'pointer',
                minHeight: '48px',
                transition: 'all 200ms ease',
              },
              onClick: () => {
                if (confirm('Remove your Ghana Card data? This cannot be undone.')) {
                  localStorage.removeItem(STORAGE_KEY);
                  cardData = null;
                  editMode = false;
                  numberRevealed = false;
                  showToast('Ghana Card removed', 'info');
                  buildPage();
                }
              },
            },
            '\u{1F5D1}  Remove Card',
          ),
        );
      }

      return h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '0 16px',
          },
        },
        ...buttons,
      );
    }

    // ── QR Section ──
    function buildQRSection(): HTMLElement {
      if (!cardData) {
        return h('div', {});
      }
      return h(
        'div',
        {
          style: {
            padding: '0 16px',
          },
        },
        h(
          'div',
          {
            style: {
              background: 'var(--surface, #141414)',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
            },
          },
          buildQRGrid(cardData.cardNumber),
          h(
            'div',
            {
              style: {
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(11px, 2.8vw, 12px)',
                color: 'rgba(255,255,255,0.3)',
                marginTop: '10px',
              },
            },
            'Digital verification pattern',
          ),
        ),
      );
    }

    // ── Page Header ──
    const pageHeader = h(
      'div',
      {
        style: {
          padding: '16px 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
      },
      h(
        'div',
        {},
        h(
          'div',
          {
            style: {
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(22px, 5.5vw, 26px)',
              fontWeight: '800',
              color: '#fff',
            },
          },
          'Ghana Card',
        ),
        h(
          'div',
          {
            style: {
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(12px, 3vw, 13px)',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '2px',
            },
          },
          'Digital National ID',
        ),
      ),
      // Status badge (only when card exists)
      ...(cardData
        ? [
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  background: expired
                    ? 'rgba(206,17,38,0.12)'
                    : 'rgba(0,107,63,0.12)',
                  border: expired
                    ? '1px solid rgba(206,17,38,0.25)'
                    : '1px solid rgba(0,107,63,0.25)',
                },
              },
              h('div', {
                style: {
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: expired ? '#CE1126' : '#006B3F',
                },
              }),
              h(
                'span',
                {
                  style: {
                    fontFamily: 'var(--font-body)',
                    fontSize: 'clamp(11px, 2.8vw, 12px)',
                    fontWeight: '600',
                    color: expired ? '#CE1126' : '#006B3F',
                  },
                },
                expired ? 'Expired' : 'Active',
              ),
            ),
          ]
        : []),
    );

    // ── Assemble ──
    const children: HTMLElement[] = [pageHeader, buildCard()];

    if (editMode) {
      children.push(sectionHeader('Card Details'));
      children.push(buildEditForm());
    } else {
      if (cardData) {
        children.push(sectionHeader('Verification'));
        children.push(buildQRSection());
      }
      children.push(sectionHeader('Actions'));
      children.push(buildActions());
    }

    render(
      container,
      h(
        'div',
        {
          style: {
            paddingBottom: '100px',
            overflowY: 'auto',
            height: '100%',
            background: 'var(--bg, #000)',
          },
        },
        ...children,
      ),
    );
  }

  buildPage();
}
