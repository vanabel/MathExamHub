/**
 * Bootstrap 5 dropdown / navbar collapse helpers.
 * Vue Router <router-link class="dropdown-item"> does not always trigger Bootstrap hide.
 * Uses the same bootstrap instance as bootstrap.bundle (window.bootstrap).
 */

const NAVBAR_COLLAPSE_ID = 'navbarNav';

function bs() {
  return typeof window !== 'undefined' ? window.bootstrap : null;
}

export function hideOpenDropdowns() {
  const bootstrap = bs();
  if (bootstrap) {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach((toggle) => {
      const instance = bootstrap.Dropdown.getInstance(toggle);
      if (instance) {
        instance.hide();
      }
    });
  }

  document.querySelectorAll('.dropdown-menu').forEach((menu) => {
    menu.classList.remove('show');
    if (menu.parentElement === document.body) {
      menu.remove();
    }
  });
  document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach((toggle) => {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('show');
  });
}

export function collapseMobileNavbar() {
  const bootstrap = bs();
  if (!bootstrap) return;
  const collapseEl = document.getElementById(NAVBAR_COLLAPSE_ID);
  if (!collapseEl?.classList.contains('show')) return;
  bootstrap.Collapse.getOrCreateInstance(collapseEl).hide();
}

function hideDropdownForItem(item) {
  if (!item?.classList?.contains('dropdown-item') || item.classList.contains('disabled')) {
    return;
  }
  const dropdownRoot = item.closest('.dropdown');
  if (!dropdownRoot) return;
  const toggle = dropdownRoot.querySelector('[data-bs-toggle="dropdown"]');
  const menu = dropdownRoot.querySelector('.dropdown-menu');
  const bootstrap = bs();
  if (toggle && bootstrap) {
    const instance = bootstrap.Dropdown.getInstance(toggle);
    if (instance) {
      instance.hide();
    }
  }
  if (menu) {
    menu.classList.remove('show');
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('show');
  }
}

/**
 * @param {import('vue-router').Router} router
 */
export function installBootstrapUiHandlers(router) {
  document.addEventListener(
    'click',
    (event) => {
      const item = event.target.closest('.dropdown-item');
      if (!item) return;
      hideDropdownForItem(item);
      if (item.tagName === 'A') {
        collapseMobileNavbar();
      }
      queueMicrotask(() => {
        hideDropdownForItem(item);
        hideOpenDropdowns();
      });
    },
    true,
  );

  router.afterEach(() => {
    hideOpenDropdowns();
    collapseMobileNavbar();
  });
}
