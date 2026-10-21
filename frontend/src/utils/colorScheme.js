/** @typedef {'system' | 'light' | 'dark'} ColorSchemePreference */

export const COLOR_SCHEME_STORAGE_KEY = 'mathexamColorScheme';

/** @returns {ColorSchemePreference} */
export function getStoredColorScheme() {
  const raw = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

/** @param {ColorSchemePreference} preference */
export function setStoredColorScheme(preference) {
  localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, preference);
}

/** @param {ColorSchemePreference} preference */
export function resolveEffectiveTheme(preference) {
  if (preference === 'light') return 'light';
  if (preference === 'dark') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** @param {ColorSchemePreference} [preference] */
export function applyColorScheme(preference = getStoredColorScheme()) {
  const root = document.documentElement;
  root.dataset.colorSchemePref = preference;

  const effective = resolveEffectiveTheme(preference);
  root.setAttribute('data-bs-theme', effective);

  if (preference === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', preference);
  }

  root.style.colorScheme = effective;
  window.dispatchEvent(new CustomEvent('mathexam-color-scheme-change', {
    detail: { preference, effective },
  }));
}

let mediaListenerAttached = false;

export function initColorScheme() {
  applyColorScheme(getStoredColorScheme());

  if (mediaListenerAttached) return;
  mediaListenerAttached = true;

  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => {
    if (getStoredColorScheme() === 'system') {
      applyColorScheme('system');
    }
  };
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', onChange);
  } else if (typeof mq.addListener === 'function') {
    mq.addListener(onChange);
  }
}

export const COLOR_SCHEME_LABELS = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
};
