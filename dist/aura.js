(function (global) {
  'use strict';

  const allowedToastTypes = new Set(['info', 'success', 'warning', 'error']);
  const modalOpeners = new WeakMap();
  const offcanvasOpeners = new WeakMap();
  let generatedId = 0;

  function createId(prefix) {
    let id;
    do {
      id = `${prefix}-${++generatedId}`;
    } while (document.getElementById(id));
    return id;
  }

  function getFocusableElements(container) {
    return Array.from(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  }

  function getToastContainer() {
    let container = document.querySelector('.aura-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'aura-toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  }

  function closeModal(backdrop) {
    backdrop.classList.remove('active');
    backdrop.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.aura-modal-backdrop.active')) {
      document.body.classList.remove('aura-modal-open');
    }
    const opener = modalOpeners.get(backdrop);
    if (opener && opener.isConnected) opener.focus();
    modalOpeners.delete(backdrop);
  }

  // --- ฟังก์ชันจัดการ Offcanvas Backdrop และ Toggle จากโค้ดชุดที่ 2 ---
  function getOffcanvasBackdrop(panel) {
    const panelId = panel.id || (panel.id = createId('aura-offcanvas'));
    let backdrop = document.querySelector(`.aura-offcanvas-backdrop[data-for="${panelId}"]`);
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'aura-offcanvas-backdrop';
      backdrop.dataset.for = panelId;
      backdrop.addEventListener('click', () => toggleOffcanvas(panel, false));
      document.body.appendChild(backdrop);
    }
    return backdrop;
  }

  function toggleOffcanvas(panel, force) {
    const open = force !== undefined ? force : !panel.classList.contains('show');
    const backdrop = getOffcanvasBackdrop(panel);

    if (open && !panel.classList.contains('show')) {
      offcanvasOpeners.set(panel, document.activeElement);
    }

    panel.classList.toggle('show', open);
    backdrop.classList.toggle('show', open);
    panel.setAttribute('aria-hidden', String(!open));

    const anyOffcanvasOpen = document.querySelector('.aura-offcanvas.show');
    if (open) {
      document.body.classList.add('aura-offcanvas-open');
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
    } else if (!anyOffcanvasOpen) {
      document.body.classList.remove('aura-offcanvas-open');
      const opener = offcanvasOpeners.get(panel);
      if (opener && opener.isConnected) opener.focus();
      offcanvasOpeners.delete(panel);
    }
  }

  function getSavedTheme() {
    try {
      return global.localStorage.getItem('aura-theme');
    } catch (error) {
      console.warn('AuraCSS could not read the saved theme.', error);
      return null;
    }
  }

  const Aura = {
    toast({ title = 'Notification', message = '', type = 'info', duration = 3000 } = {}) {
      const toastType = allowedToastTypes.has(type) ? type : 'info';
      const toast = document.createElement('div');
      const content = document.createElement('div');
      const heading = document.createElement('div');
      const detail = document.createElement('div');
      const closeButton = document.createElement('button');

      toast.className = `aura-toast toast-${toastType}`;
      heading.className = 'aura-toast-title';
      heading.textContent = String(title);
      detail.className = 'aura-toast-message';
      detail.textContent = String(message);
      closeButton.type = 'button';
      closeButton.className = 'aura-toast-close';
      closeButton.setAttribute('aria-label', 'Close notification');
      closeButton.textContent = '×';
      content.append(heading, detail);
      toast.append(content, closeButton);
      getToastContainer().appendChild(toast);

      const close = () => {
        if (toast.dataset.closing === 'true') return;
        toast.dataset.closing = 'true';
        toast.classList.remove('show');
        global.setTimeout(() => toast.remove(), 300);
      };

      closeButton.addEventListener('click', close);
      global.requestAnimationFrame(() => toast.classList.add('show'));
      if (Number.isFinite(duration) && duration > 0) global.setTimeout(close, duration);
      return toast;
    },

    modal(targetSelector) {
      if (typeof targetSelector !== 'string' || !targetSelector.trim()) {
        throw new TypeError('Aura.modal requires a non-empty CSS selector.');
      }
      const modal = document.querySelector(targetSelector);
      if (!modal || !modal.classList.contains('aura-modal-backdrop')) {
        throw new Error(`Aura modal not found: ${targetSelector}`);
      }
      return {
        open() {
          if (!modal.classList.contains('active')) {
            modalOpeners.set(modal, document.activeElement);
          }
          modal.classList.add('active');
          modal.setAttribute('aria-hidden', 'false');
          document.body.classList.add('aura-modal-open');
          const dialog = modal.querySelector('[role="dialog"]') || modal;
          const focusTarget = dialog.querySelector('[autofocus]') || getFocusableElements(dialog)[0] || dialog;
          if (focusTarget === dialog && !dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
          const focusWhenVisible = () => {
            if (!modal.classList.contains('active') || !focusTarget.isConnected) return;
            if (dialog.contains(document.activeElement)) return;
            if (Number(global.getComputedStyle(modal).opacity) < 1) {
              global.requestAnimationFrame(focusWhenVisible);
              return;
            }
            focusTarget.focus();
          };
          global.requestAnimationFrame(focusWhenVisible);
        },
        close() {
          closeModal(modal);
        }
      };
    },

    // --- เพิ่ม API Offcanvas ให้เรียกใช้งานผ่าน JavaScript ได้ ---
    offcanvas(targetSelector) {
      if (typeof targetSelector !== 'string' || !targetSelector.trim()) {
        throw new TypeError('Aura.offcanvas requires a non-empty CSS selector.');
      }
      const panel = document.querySelector(targetSelector);
      if (!panel || !panel.classList.contains('aura-offcanvas')) {
        throw new Error(`Aura offcanvas not found: ${targetSelector}`);
      }
      return {
        open() { toggleOffcanvas(panel, true); },
        close() { toggleOffcanvas(panel, false); },
        toggle() { toggleOffcanvas(panel); }
      };
    },

    setTheme(theme) {
      if (!['dark', 'light', 'system'].includes(theme)) {
        throw new TypeError('Aura.setTheme expects "dark", "light", or "system".');
      }
      document.documentElement.setAttribute('data-aura-theme', theme);
      try {
        global.localStorage.setItem('aura-theme', theme);
      } catch (error) {
        console.warn('AuraCSS could not save the selected theme.', error);
      }
      return theme;
    },

    getTheme() {
      return document.documentElement.getAttribute('data-aura-theme') || 'dark';
    },

    toggleTheme() {
      return Aura.setTheme(Aura.getTheme() === 'light' ? 'dark' : 'light');
    },

    copy(text, successMsg = 'คัดลอกลงคลิปบอร์ดแล้ว!') {
      if (!global.navigator.clipboard || typeof global.navigator.clipboard.writeText !== 'function') {
        const error = new Error('Clipboard access is unavailable. Use HTTPS or a supported browser.');
        Aura.toast({ title: 'Copy failed', message: error.message, type: 'error' });
        return Promise.reject(error);
      }
      return Promise.resolve().then(() => global.navigator.clipboard.writeText(String(text))).then(() => {
        Aura.toast({ title: 'Copy Success', message: successMsg, type: 'success' });
      }).catch(error => {
        const message = error && typeof error.message === 'string'
          ? error.message
          : 'Unable to access the clipboard.';
        Aura.toast({ title: 'Copy failed', message, type: 'error' });
        throw error;
      });
    },

    init() {
      const savedTheme = getSavedTheme();
      if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'system') {
        document.documentElement.setAttribute('data-aura-theme', savedTheme);
      }
      document.documentElement.classList.add('aura-motion-ready');

      // Accordion
      document.querySelectorAll('[data-aura-toggle="accordion"]').forEach(header => {
        const content = header.nextElementSibling;
        if (!content || !content.classList.contains('aura-accordion-content')) return;
        if (!header.id) header.id = createId('aura-accordion-trigger');
        if (!content.id) content.id = createId('aura-accordion-panel');
        if (header.tagName === 'BUTTON' && !header.hasAttribute('type')) header.type = 'button';
        header.setAttribute('aria-controls', content.id);
        content.setAttribute('role', 'region');
        content.setAttribute('aria-labelledby', header.id);
        const initiallyOpen = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', String(initiallyOpen));
        content.setAttribute('aria-hidden', String(!initiallyOpen));
        if (initiallyOpen) content.style.maxHeight = `${content.scrollHeight}px`;
        header.addEventListener('click', () => {
          const isOpen = header.getAttribute('aria-expanded') === 'true';
          const parent = header.closest('.aura-accordion');
          if (parent) {
            parent.querySelectorAll('[data-aura-toggle="accordion"]').forEach(item => {
              item.setAttribute('aria-expanded', 'false');
              const panel = item.nextElementSibling;
              if (panel) {
                panel.style.maxHeight = null;
                panel.setAttribute('aria-hidden', 'true');
              }
            });
          }
          if (!isOpen) {
            header.setAttribute('aria-expanded', 'true');
            content.style.maxHeight = `${content.scrollHeight}px`;
            content.setAttribute('aria-hidden', 'false');
          }
        });
      });

      // Modals
      document.querySelectorAll('.aura-modal-backdrop').forEach(backdrop => {
        backdrop.setAttribute('aria-hidden', backdrop.classList.contains('active') ? 'false' : 'true');
      });
      document.querySelectorAll('[data-aura-toggle="modal"]').forEach(button => {
        button.addEventListener('click', () => {
          const selector = button.getAttribute('data-aura-target');
          if (selector) Aura.modal(selector).open();
        });
      });
      document.querySelectorAll('[data-aura-dismiss="modal"]').forEach(button => {
        button.addEventListener('click', () => {
          const backdrop = button.closest('.aura-modal-backdrop');
          if (backdrop) closeModal(backdrop);
        });
      });
      document.querySelectorAll('.aura-modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', event => {
          if (event.target === backdrop) closeModal(backdrop);
        });
      });

      // --- Offcanvas Init & Events (นำเข้ามาจากโค้ดชุดที่ 2) ---
      document.querySelectorAll('.aura-offcanvas').forEach(panel => {
        panel.setAttribute('aria-hidden', panel.classList.contains('show') ? 'false' : 'true');
      });
      document.querySelectorAll('[data-aura-toggle="offcanvas"]').forEach(trigger => {
        trigger.addEventListener('click', () => {
          const selector = trigger.getAttribute('data-aura-target');
          if (selector) {
            const panel = document.querySelector(selector);
            if (panel) toggleOffcanvas(panel);
          }
        });
      });
      document.querySelectorAll('[data-aura-dismiss="offcanvas"]').forEach(button => {
        button.addEventListener('click', () => {
          const panel = button.closest('.aura-offcanvas');
          if (panel) toggleOffcanvas(panel, false);
        });
      });

      // Global Keydown Handler (รองรับทั้ง Modal และ Offcanvas ปิดด้วย Escape)
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          // ปิด Offcanvas ที่เปิดอยู่
          document.querySelectorAll('.aura-offcanvas.show').forEach(panel => {
            toggleOffcanvas(panel, false);
          });

          // ปิด Modal ที่เปิดอยู่
          const openModal = document.querySelector('.aura-modal-backdrop.active');
          if (openModal) {
            closeModal(openModal);
            return;
          }
        }

        // Trap Focus สำหรับ Modal
        const openModal = document.querySelector('.aura-modal-backdrop.active');
        if (openModal && event.key === 'Tab') {
          const dialog = openModal.querySelector('[role="dialog"]') || openModal;
          const focusable = getFocusableElements(dialog);
          if (!focusable.length) {
            event.preventDefault();
            if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
            dialog.focus();
            return;
          }
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
            event.preventDefault();
            first.focus();
          }
        }
      });

      // Collapse
      document.querySelectorAll('[data-aura-toggle="collapse"]').forEach(trigger => {
        const selector = trigger.getAttribute('data-aura-target');
        const target = selector ? document.querySelector(selector) : null;
        if (!target) return;
        const isOpen = target.classList.contains('show');
        trigger.setAttribute('aria-expanded', String(isOpen));
        target.setAttribute('aria-hidden', String(!isOpen));
        trigger.addEventListener('click', () => {
          const isOpen = target.classList.toggle('show');
          trigger.setAttribute('aria-expanded', String(isOpen));
          target.setAttribute('aria-hidden', String(!isOpen));
        });
      });

      // Alert Dismiss
      document.querySelectorAll('[data-aura-dismiss="alert"]').forEach(button => {
        button.addEventListener('click', () => {
          const alert = button.closest('.aura-alert');
          if (alert) alert.remove();
        });
      });

      // Tabs
      document.querySelectorAll('[data-aura-tabs]').forEach(tabList => {
        const tabs = Array.from(tabList.querySelectorAll('[data-aura-tab]'));
        if (!tabs.length) return;
        const selectedIndex = tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
        const activeIndex = selectedIndex < 0 ? 0 : selectedIndex;
        tabList.setAttribute('role', 'tablist');
        tabs.forEach((tab, index) => {
          const selector = tab.getAttribute('data-aura-target') || tab.getAttribute('aria-controls');
          const panel = selector
            ? (selector.startsWith('#') ? document.getElementById(selector.slice(1)) : document.querySelector(selector))
            : null;
          if (!panel) return;
          if (!tab.id) tab.id = createId('aura-tab');
          if (!panel.id) panel.id = createId('aura-panel');
          tab.setAttribute('aria-controls', panel.id);
          panel.setAttribute('aria-labelledby', tab.id);
          const selected = index === activeIndex;
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-selected', String(selected));
          tab.setAttribute('tabindex', selected ? '0' : '-1');
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-hidden', String(!selected));
          panel.hidden = !selected;

          const activate = () => {
            tabs.forEach(item => {
              const itemSelector = item.getAttribute('data-aura-target') || item.getAttribute('aria-controls');
              const itemPanel = itemSelector
                ? (itemSelector.startsWith('#') ? document.getElementById(itemSelector.slice(1)) : document.querySelector(itemSelector))
                : null;
              const isSelected = item === tab;
              item.setAttribute('aria-selected', String(isSelected));
              item.setAttribute('tabindex', isSelected ? '0' : '-1');
              if (itemPanel) {
                itemPanel.hidden = !isSelected;
                itemPanel.setAttribute('aria-hidden', String(!isSelected));
              }
            });
          };

          tab.addEventListener('click', activate);
          tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const currentIndex = tabs.indexOf(tab);
            const nextIndex = event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? tabs.length - 1
                : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[nextIndex].focus();
            tabs[nextIndex].click();
          });
        });
      });

      // Dropdowns
      document.querySelectorAll('[data-aura-toggle="dropdown"]').forEach(trigger => {
        const dropdown = trigger.closest('.aura-dropdown');
        const menu = dropdown && dropdown.querySelector('.aura-dropdown-menu');
        if (!dropdown || !menu) return;
        trigger.setAttribute('aria-haspopup', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        const close = () => {
          dropdown.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        };
        trigger.addEventListener('click', () => {
          const shouldOpen = !dropdown.classList.contains('open');
          document.querySelectorAll('.aura-dropdown.open').forEach(openDropdown => {
            openDropdown.classList.remove('open');
            const openTrigger = openDropdown.querySelector('[data-aura-toggle="dropdown"]');
            if (openTrigger) openTrigger.setAttribute('aria-expanded', 'false');
          });
          dropdown.classList.toggle('open', shouldOpen);
          trigger.setAttribute('aria-expanded', String(shouldOpen));
        });
        menu.querySelectorAll('a, button').forEach(item => item.addEventListener('click', close));
      });

      document.addEventListener('click', event => {
        if (event.target instanceof Element && event.target.closest('.aura-dropdown')) return;
        document.querySelectorAll('.aura-dropdown.open').forEach(dropdown => {
          dropdown.classList.remove('open');
          const trigger = dropdown.querySelector('[data-aura-toggle="dropdown"]');
          if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const dropdown = document.querySelector('.aura-dropdown.open');
        if (!dropdown) return;
        dropdown.classList.remove('open');
        const trigger = dropdown.querySelector('[data-aura-toggle="dropdown"]');
        if (trigger) {
          trigger.setAttribute('aria-expanded', 'false');
          trigger.focus();
        }
      });

      // Navbar Burger
      document.querySelectorAll('.aura-burger').forEach(burger => {
        const nav = burger.closest('.aura-navbar')?.querySelector('.aura-nav-menu');
        if (!nav) return;
        burger.setAttribute('aria-expanded', 'false');
        const close = () => {
          nav.classList.remove('open');
          burger.setAttribute('aria-expanded', 'false');
          burger.focus();
        };
        burger.addEventListener('click', () => {
          const isOpen = nav.classList.toggle('open');
          burger.setAttribute('aria-expanded', String(isOpen));
        });
        nav.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', () => {
            nav.classList.remove('open');
            burger.setAttribute('aria-expanded', 'false');
          });
        });
        document.addEventListener('keydown', event => {
          if (event.key === 'Escape' && nav.classList.contains('open')) close();
        });
      });

      // Card Spotlight
      document.querySelectorAll('.aura-card-spotlight').forEach(card => {
        card.addEventListener('pointermove', event => {
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--mouse-x', `${event.clientX - rect.left}px`);
          card.style.setProperty('--mouse-y', `${event.clientY - rect.top}px`);
        });
      });

      // Card Tilt
      document.querySelectorAll('[data-aura-tilt]').forEach(card => {
        card.addEventListener('pointermove', event => {
          if (event.pointerType === 'touch') return;
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          const rotateX = (0.5 - y) * 16;
          const rotateY = (x - 0.5) * 16;
          card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        card.addEventListener('pointerleave', () => {
          card.style.transform = '';
        });
      });

      // Hero pointer shift
      document.querySelectorAll('[data-aura-pointer-shift]').forEach(stage => {
        const reducedMotion = global.matchMedia('(prefers-reduced-motion: reduce)');
        const reset = () => {
          stage.style.setProperty('--hero-shift-x', '0px');
          stage.style.setProperty('--hero-shift-y', '0px');
        };
        const update = (clientX, clientY) => {
          if (reducedMotion.matches) {
            reset();
            return;
          }
          const rect = stage.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = Math.max(-1, Math.min(1, ((clientX - rect.left) / rect.width - 0.5) * 2));
          const y = Math.max(-1, Math.min(1, ((clientY - rect.top) / rect.height - 0.5) * 2));
          stage.style.setProperty('--hero-shift-x', `${x * 14}px`);
          stage.style.setProperty('--hero-shift-y', `${y * 10}px`);
        };

        stage.addEventListener('pointermove', event => {
          if (event.pointerType !== 'touch') update(event.clientX, event.clientY);
        });
        stage.addEventListener('pointerleave', event => {
          if (event.pointerType !== 'touch') reset();
        });
        stage.addEventListener('touchstart', event => {
          if (event.touches.length === 1) {
            update(event.touches[0].clientX, event.touches[0].clientY);
          }
        }, { passive: true });
        stage.addEventListener('touchmove', event => {
          if (event.touches.length === 1) {
            update(event.touches[0].clientX, event.touches[0].clientY);
          }
        }, { passive: true });
        stage.addEventListener('touchend', event => {
          if (event.touches.length === 1) {
            update(event.touches[0].clientX, event.touches[0].clientY);
          } else {
            reset();
          }
        }, { passive: true });
        stage.addEventListener('touchcancel', reset, { passive: true });
        reducedMotion.addEventListener('change', event => {
          if (event.matches) reset();
        });
      });

      // Ripple Effect
      document.querySelectorAll('.aura-btn').forEach(button => {
        button.addEventListener('click', event => {
          if (button.disabled || global.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
          const circle = document.createElement('span');
          const diameter = Math.max(button.clientWidth, button.clientHeight);
          const radius = diameter / 2;
          const rect = button.getBoundingClientRect();
          const x = event.detail === 0 ? rect.width / 2 : event.clientX - rect.left;
          const y = event.detail === 0 ? rect.height / 2 : event.clientY - rect.top;
          circle.style.width = circle.style.height = `${diameter}px`;
          circle.style.left = `${x - radius}px`;
          circle.style.top = `${y - radius}px`;
          circle.className = 'aura-ripple';
          button.querySelector('.aura-ripple')?.remove();
          button.appendChild(circle);
          global.setTimeout(() => circle.remove(), 700);
        });
      });

      // Number Counter
      const animateCounter = counter => {
        const target = Number(counter.getAttribute('data-aura-counter'));
        if (!Number.isFinite(target)) {
          throw new TypeError('data-aura-counter must contain a finite number.');
        }
        const configuredDuration = Number(counter.getAttribute('data-aura-duration'));
        const duration = Number.isFinite(configuredDuration) && configuredDuration > 0
          ? configuredDuration
          : 1200;
        const startTime = global.performance.now();
        const formatter = new Intl.NumberFormat();
        const update = now => {
          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          counter.textContent = formatter.format(Math.round(target * eased));
          if (progress < 1) global.requestAnimationFrame(update);
        };
        global.requestAnimationFrame(update);
      };
      document.querySelectorAll('[data-aura-counter]').forEach(counter => {
        if ('IntersectionObserver' in global) {
          const observer = new IntersectionObserver(entries => {
            if (!entries[0].isIntersecting) return;
            observer.disconnect();
            animateCounter(counter);
          });
          observer.observe(counter);
        } else {
          animateCounter(counter);
        }
      });

      // Tooltip
      let tooltipBox = document.querySelector('.aura-tooltip-box');
      if (!tooltipBox) {
        tooltipBox = document.createElement('div');
        tooltipBox.className = 'aura-tooltip-box';
        tooltipBox.setAttribute('role', 'tooltip');
        document.body.appendChild(tooltipBox);
      }
      document.querySelectorAll('[data-aura-tooltip]').forEach(element => {
        const show = () => {
          const rect = element.getBoundingClientRect();
          tooltipBox.textContent = element.getAttribute('data-aura-tooltip');
          const left = Math.min(Math.max(rect.left + rect.width / 2, 8), global.innerWidth - 8);
          tooltipBox.style.top = `${Math.max(rect.top, 8)}px`;
          tooltipBox.style.left = `${left}px`;
          element.setAttribute('aria-describedby', 'aura-tooltip');
          tooltipBox.id = 'aura-tooltip';
          tooltipBox.classList.add('visible');
        };
        element.addEventListener('mouseenter', show);
        element.addEventListener('focus', show);
        element.addEventListener('mouseleave', () => tooltipBox.classList.remove('visible'));
        element.addEventListener('blur', () => tooltipBox.classList.remove('visible'));
      });

      // Scroll Reveal
      const revealItems = document.querySelectorAll('.aura-reveal');
      if ('IntersectionObserver' in global) {
        const observer = new IntersectionObserver((entries, currentObserver) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            currentObserver.unobserve(entry.target);
          });
        }, { threshold: 0.12 });
        revealItems.forEach(item => observer.observe(item));
      } else {
        revealItems.forEach(item => item.classList.add('is-visible'));
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Aura.init, { once: true });
  } else {
    Aura.init();
  }

  global.Aura = Aura;
})(window);