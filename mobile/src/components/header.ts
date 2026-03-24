import { h } from '../utils/dom';

/**
 * Top app header bar.
 * @param title  — text displayed in the header
 * @param showBack — if true, renders a back arrow that calls history.back()
 */
export function createHeader(title: string, showBack?: boolean): HTMLElement {
  const children: (string | Node)[] = [];

  if (showBack) {
    children.push(
      h('button', {
        className: 'header-back',
        onClick: () => history.back(),
        style: {
          background: 'none',
          border: 'none',
          color: 'inherit',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '0 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          minWidth: '32px',
          minHeight: '44px',
          justifyContent: 'center',
        },
      }, '\u2190')
    );
  }

  children.push(
    h('span', {
      style: {
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(16px, 4.2vw, 18px)',
        fontWeight: '700',
        flex: '1',
        textAlign: showBack ? 'left' : 'center',
      },
    }, title)
  );

  return h('header', {
    className: 'app-header',
    style: {
      height: '48px',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      paddingTop: 'env(safe-area-inset-top)',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      boxSizing: 'border-box',
    },
  }, ...children);
}
