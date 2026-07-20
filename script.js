const root = document.documentElement;
root.classList.add('js');

const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.header-nav');
const navLinks = document.querySelectorAll('.header-nav a');
const year = document.getElementById('year');
const langButtons = document.querySelectorAll('.lang-btn');
const i18nNodes = document.querySelectorAll('[data-i18n]');
const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
const newsletterForm = document.querySelector('.newsletter-form');
const revealElements = document.querySelectorAll('.reveal');
const sectionLinks = [...document.querySelectorAll('.header-nav a')].filter(a => a.hash);
const sections = [...document.querySelectorAll('main section[id]')];

if (year) year.textContent = new Date().getFullYear();

/* Menu */
const setMenu = (open) => {
  if (!header || !toggle) return;
  header.classList.toggle('menu-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
};
toggle?.addEventListener('click', () => {
  setMenu(!header.classList.contains('menu-open'));
});
navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', e => { if(e.key==='Escape') setMenu(false); });
document.addEventListener('click', e => {
  if (!header?.classList.contains('menu-open')) return;
  if (!header.contains(e.target)) setMenu(false);
});

/* Language */
const setLanguage = (lang) => {
  const active = lang === 'en' ? 'en' : 'zh';
  document.documentElement.lang = active === 'zh' ? 'zh-Hant' : 'en';
  document.body.dataset.lang = active;

  i18nNodes.forEach(node => {
    const v = node.dataset[active];
    if (v) node.innerHTML = v;
  });
  i18nPlaceholders.forEach(node => {
    const key = active === 'zh' ? 'placeholderZh' : 'placeholderEn';
    const v = node.dataset[key];
    if (v) node.setAttribute('placeholder', v);
  });
  langButtons.forEach(btn => {
    const isActive = btn.dataset.lang === active;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
  try { localStorage.setItem('cs12-language', active); } catch {}
};

langButtons.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.lang || 'zh')));
let savedLang = 'zh';
try { savedLang = localStorage.getItem('cs12-language') || 'zh'; } catch {}
setLanguage(savedLang);

/* Newsletter */
newsletterForm?.addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('email');
  const lang = document.body.dataset.lang || 'zh';
  let status = newsletterForm.querySelector('.form-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'form-status';
    status.setAttribute('role','status');
    status.style.marginTop='12px';
    status.style.fontSize='11px';
    status.style.color='var(--muted)';
    newsletterForm.append(status);
  }
  if (input) input.value = '';
  status.textContent = lang === 'zh'
    ? '謝謝您的訂閱，最新修護靈感即將送達。'
    : 'Thank you for subscribing. New repair rituals are on their way.';
});

/* Header scroll */
let ticking = false;
const onScroll = () => {
  if (ticking) return;
  requestAnimationFrame(() => {
    header?.classList.toggle('scrolled', window.scrollY > 12);
    ticking = false;
  });
  ticking = true;
};
window.addEventListener('scroll', onScroll, {passive:true});
onScroll();

/* Reveal — minimal, Dior-like fade only */
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  revealElements.forEach(el => io.observe(el));
} else {
  revealElements.forEach(el => el.classList.add('visible'));
}

/* Active section */
if ('IntersectionObserver' in window && sections.length) {
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        sectionLinks.forEach(link => {
          link.classList.toggle('is-current', link.hash === `#${entry.target.id}`);
        });
      }
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  sections.forEach(s => secObs.observe(s));
}
