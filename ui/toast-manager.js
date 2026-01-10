// ui/toast-manager.js
import { ICONS } from '../utils/icons.js';
import { sanitizeInput } from '../utils/sanitizer.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.activeToasts = new Set();
  }

  initialize() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  show(message, duration = 3000, type = 'info') {
    try {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'status');
      toast.innerHTML = `
        <div class="toast-content">
          <span class="toast-icon">${this.getIcon(type)}</span>
          <span class="toast-message">${sanitizeInput(message || 'No message')}</span>
          <button class="toast-close" aria-label="Close">×</button>
        </div>
      `;

      this.container.appendChild(toast);
      this.activeToasts.add(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('toast-show');
      });

      // Close button
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', () => this.hide(toast));

      // Auto hide
      if (duration > 0) {
        setTimeout(() => this.hide(toast), duration);
      }

      return toast;
    } catch (error) {
      console.error('Error showing toast:', error);
      return null;
    }
  }

  hide(toast) {
    if (!this.activeToasts.has(toast)) return;

    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.activeToasts.delete(toast);
    }, 300);
  }

  update(toast, message, type = null) {
    if (!toast || !this.activeToasts.has(toast)) return;

    if (message) {
      const messageEl = toast.querySelector('.toast-message');
      if (messageEl) messageEl.textContent = message;
    }

    if (type) {
      // Remove old type classes
      toast.className = 'toast toast-show'; // Reset classes
      toast.classList.add(`toast-${type}`);

      const iconEl = toast.querySelector('.toast-icon');
      if (iconEl) iconEl.innerHTML = this.getIcon(type);
    }
  }

  success(message, duration = 3000) {
    return this.show(message, duration, 'success');
  }

  error(message, duration = 4000) {
    return this.show(message, duration, 'error');
  }

  warning(message, duration = 3500) {
    return this.show(message, duration, 'warning');
  }

  info(message, duration = 3000) {
    return this.show(message, duration, 'info');
  }

  loading(message) {
    return this.show(message, 0, 'loading');
  }

  getIcon(type) {
    const icons = {
      success: ICONS.CHECK,
      error: ICONS.X_MARK,
      warning: ICONS.WARNING,
      info: ICONS.INFO,
      loading: '<div class="spinner"></div>'
    };
    return icons[type] || icons.info;
  }

  clearAll() {
    this.activeToasts.forEach(toast => this.hide(toast));
  }
}

export default new ToastManager();