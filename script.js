const root = document.documentElement;
root.classList.add('js');

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.site-nav a');
const year = document.getElementById('year');
const langButtons = document.querySelectorAll('.lang-btn');
const i18nNodes = document.querySelectorAll('[data-i18n]');
const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
const newsletterForm = document.querySelector('.newsletter-form');
const revealElements = document.querySelectorAll('.reveal');
const sectionLinks = [...navLinks].filter((link) => link.hash);
const sections = [...document.querySelectorAll('main section[id]')];

if (year) {
  year.textContent = new Date().getFullYear();
}

const setMenu = (open) => {
  if (!header || !toggle) return;
  header.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('menu-is-open', open);
};

toggle?.addEventListener('click', () => {
  setMenu(!header?.classList.contains('menu-open'));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => setMenu(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
});

document.addEventListener('click', (event) => {
  if (!header?.classList.contains('menu-open')) return;
  if (!header.contains(event.target)) setMenu(false);
});

const setLanguage = (lang) => {
  const activeLanguage = lang === 'en' ? 'en' : 'zh';
  document.documentElement.lang = activeLanguage === 'zh' ? 'zh-Hant' : 'en';
  document.body.dataset.lang = activeLanguage;

  i18nNodes.forEach((node) => {
    const value = node.dataset[activeLanguage];
    if (value) node.innerHTML = value;
  });

  i18nPlaceholders.forEach((node) => {
    const key = activeLanguage === 'zh' ? 'placeholderZh' : 'placeholderEn';
    const value = node.dataset[key];
    if (value) node.setAttribute('placeholder', value);
  });

  langButtons.forEach((button) => {
    const isActive = button.dataset.lang === activeLanguage;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  try {
    localStorage.setItem('cs12-language', activeLanguage);
  } catch (error) {
    // Private browsing can disable localStorage; the switcher still works in-session.
  }
};

langButtons.forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.lang || 'zh'));
});

let savedLanguage = 'zh';
try {
  savedLanguage = localStorage.getItem('cs12-language') || 'zh';
} catch (error) {
  // Use the default Traditional Chinese language when storage is unavailable.
}
setLanguage(savedLanguage);

newsletterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('email');
  const lang = document.body.dataset.lang || 'zh';
  let status = newsletterForm.querySelector('.form-status');

  if (!status) {
    status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    newsletterForm.append(status);
  }

  if (input) input.value = '';
  status.textContent = lang === 'zh'
    ? '謝謝您的訂閱，最新修護靈感即將送達。'
    : 'Thank you for subscribing. New repair rituals are on their way.';
});

const handleHeaderScroll = () => {
  header?.classList.toggle('scrolled', window.scrollY > 20);
};

const handleReveal = () => {
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  revealElements.forEach((element) => {
    if (element.getBoundingClientRect().top < windowHeight * 0.88) {
      element.classList.add('visible');
    }
  });
};

const setCurrentSection = (id) => {
  sectionLinks.forEach((link) => {
    link.classList.toggle('is-current', link.hash === `#${id}`);
  });
};

if ('IntersectionObserver' in window && sections.length) {
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) setCurrentSection(entry.target.id);
    });
  }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

  sections.forEach((section) => sectionObserver.observe(section));
}

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  window.requestAnimationFrame(() => {
    handleHeaderScroll();
    handleReveal();
    ticking = false;
  });
  ticking = true;
};

window.addEventListener('scroll', onScroll, { passive: true });
handleHeaderScroll();
handleReveal();

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  revealElements.forEach((element) => revealObserver.observe(element));
}
