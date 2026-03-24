// Create element helper
export function h(tag: string, attrs?: Record<string, any>, ...children: (string | Node)[]): HTMLElement {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (key === 'className') el.className = val;
      else if (key === 'style' && typeof val === 'object') Object.assign(el.style, val);
      else if (key.startsWith('on') && typeof val === 'function') el.addEventListener(key.slice(2).toLowerCase(), val);
      else if (key === 'innerHTML') el.innerHTML = val;
      else if (val === false || val === null || val === undefined) el.removeAttribute(key);
      else if (val === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(val));
    }
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  }
  return el;
}

// Render into container
export function render(container: HTMLElement, ...elements: HTMLElement[]): void {
  container.innerHTML = '';
  for (const el of elements) container.appendChild(el);
}

// Query shorthand
export function $(selector: string, parent: Element | Document = document): HTMLElement | null {
  return parent.querySelector(selector);
}
