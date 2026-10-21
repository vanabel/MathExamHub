# macOS-style UI refresh (MathExamHub)

Visual language inspired by macOS Sonoma-era system UI: neutral workspace, white sheets, hairline borders, system blue accent, and translucent chrome. **Behavior, layout contracts, and data-testids are unchanged.**

## Typography

- **Stack:** `-apple-system`, `BlinkMacSystemFont`, `'SF Pro Text'`, `'PingFang SC'`, `'Helvetica Neue'`, `sans-serif`
- **Scale:** 12px captions → 16px body → ~26px page titles (existing `--text-*` tokens)

## Color & surfaces

| Token | Light value | Use |
|-------|-------------|-----|
| `--color-accent` | `#007AFF` | Primary actions, links, focus |
| `--surface-bg` | `#ebebeb` | App window background |
| `--surface-card` | `#ffffff` | Cards, sheets, modals |
| `--border-hairline` | `rgba(0,0,0,0.08)` | 1px separators |
| `--text-primary` | `#1d1d1f` | Body text |
| `--text-muted` | `#6e6e73` | Secondary copy |

## Dark mode (required)

Follows **系统设置** by default via `prefers-color-scheme`, with user override in the nav **用户** menu: **跟随系统 / 浅色 / 深色** (`localStorage` key `mathexamColorScheme`).

| Token | Dark value |
|-------|------------|
| Window `--surface-bg` | `#1E1E1E` |
| Sheet `--surface-card` | `#2C2C2E` |
| Hairline `--border-hairline` | `rgba(255,255,255,0.1)` |
| Accent | `#0A84FF` |
| Muted text | `#98989D` |

Implementation: `data-bs-theme="dark"` on `<html>` (see `frontend/src/utils/colorScheme.js`), tokens in `theme-dark.css`. Transparent line-art / figure previews keep a **light backing** in dark mode; PDF preview frames use `--media-frame-bg` (light gray) for readability.

## Shape & depth

- **Radii:** 10px controls, 12px cards/sheets/modals (`--radius-md`, `--radius-lg`)
- **Shadows:** layered soft shadows (`--shadow-sheet`, `--shadow-modal`) — no harsh drop shadows
- **Navbar:** frosted bar (`backdrop-filter: blur(20px) saturate(180%)`), light background ~72% white

## Motion

- **Duration:** 150–200ms ease for hover/focus/open
- **`prefers-reduced-motion: reduce`:** disable non-essential animations (page fade, modal scale)

## Components

- **Buttons:** pill-ish radius (10px), primary filled accent blue; secondary gray outline on white
- **Segmented controls:** `.btn-group` styled as mac segmented (shared border, rounded ends)
- **Dialogs:** `.modal-content` as sheet — rounded, hairline border, scale+fade in; footer primary action on the right (Bootstrap default)
- **Dropdowns:** white panel, hairline border, soft shadow, hover row tint
- **Tables:** sticky header on `--surface-bg`, zebra optional, row hover tint
- **Toasts / alerts:** rounded, hairline border, subtle fill

## Layout contracts (must not regress)

- Desktop navbar **one row**: menus left; bank selector, **试卷头**, user menu right; long bank names ellipsized
- Question form: stem + answer **side-by-side** 5-line textareas; **解答过程** full width below
- **SubjectCombobox** for 科目; KP constraints **collapsed by default**
- **mathexam** import guide on `/latex-import`; choice options **(A)–(D)**
- Usable at **~1280px** and narrow mobile widths

## Implementation

- Global tokens and Bootstrap overrides: `frontend/src/assets/design-system.css`
- Shell: `App.vue` navbar (`app-navbar--mac`)
- Pages inherit via `.card`, `.modal`, `.form-control`, `.dropdown-menu` global rules
