/** Shared LaTeX IO list view: rendered preview vs raw LaTeX source. */
export const LATEX_VIEW_MODE_STORAGE_KEY = 'mathexamLatexViewMode';

export function loadLatexViewMode() {
  try {
    const v = localStorage.getItem(LATEX_VIEW_MODE_STORAGE_KEY);
    return v === 'latex' ? 'latex' : 'preview';
  } catch {
    return 'preview';
  }
}

export function saveLatexViewMode(mode) {
  try {
    localStorage.setItem(LATEX_VIEW_MODE_STORAGE_KEY, mode === 'latex' ? 'latex' : 'preview');
  } catch {
    /* ignore */
  }
}
