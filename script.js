const header = document.querySelector('.site-header');
const toggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelectorAll('.site-nav a');
const year = document.getElementById('year');
const langButtons = document.querySelectorAll('.lang-btn');
const i18nNodes = document.querySelectorAll('[data-i18n]');
const i18nPlaceholders = document.querySelectorAll('[data-i18n-placeholder]');
const newsletterForm = document.querySelector('.newsletter-form');
const revealElements = document.querySelectorAll('.reveal');

if (year) {
  year.textContent = new Date().getFullYear();
}

if (toggle && header) {
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    if (header?.classList.contains('menu-open')) {
      header.classList.remove('menu-open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });
});

const setLanguage = (lang) => {
  document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  document.body.dataset.lang = lang;

  i18nNodes.forEach((node) => {
    const value = node.dataset[lang];
    if (value) {
      node.innerHTML = value;
    }
  });

  i18nPlaceholders.forEach((node) => {
    const key = lang === 'zh' ? 'placeholderZh' : 'placeholderEn';
    const value = node.dataset[key];
    if (value) {
      node.setAttribute('placeholder', value);
    }
  });

  langButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.lang === lang);
    button.setAttribute('aria-pressed', button.dataset.lang === lang);
  });

  localStorage.setItem('cs12-language', lang);
};

langButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang || 'zh');
  });
});

const savedLanguage = localStorage.getItem('cs12-language') || 'zh';
setLanguage(savedLanguage);

newsletterForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.getElementById('email');
  const lang = document.body.dataset.lang || 'zh';

  if (input) {
    input.value = '';
  }

  alert(
    lang === 'zh'
      ? '這裡是表單示意位置，下一步可正式串接 WordPress / EDM 系統。'
      : 'This is a placeholder form. Next, it can be connected to WordPress or your email platform.'
  );
});

const handleHeaderScroll = () => {
  if (!header) return;
  if (window.scrollY > 20) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
};

const handleReveal = () => {
  revealElements.forEach((el) => {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    if (rect.top < windowHeight * 0.85) {
      el.classList.add('visible');
    }
  });
};

let ticking = false;
const onScroll = () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      handleHeaderScroll();
      handleReveal();
      ticking = false;
    });
    ticking = true;
  }
};

window.addEventListener('scroll', onScroll, { passive: true });
handleHeaderScroll();
handleReveal();

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

  revealElements.forEach((el) => observer.observe(el));
}