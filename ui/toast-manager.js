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

  show(message, duration = 3000, type = 'info', detail = null) {
    try {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.setAttribute('role', 'status');

      // Get timestamp for detail
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString([], { month: 'short', day: 'numeric' });

      // Type labels and descriptions for display
      const typeInfo = {
        success: { label: '✓ Success', desc: 'Your action was completed successfully.' },
        error: { label: '✕ Error', desc: 'Something went wrong. Please try again.' },
        warning: { label: '⚠ Warning', desc: 'Please review this before continuing.' },
        info: { label: 'ℹ Info', desc: 'Here\'s some information for you.' },
        loading: { label: '⟳ Loading', desc: 'Please wait while we process your request.' }
      };

      const info = typeInfo[type] || typeInfo.info;

      // Generate helpful detail content
      const detailContent = detail || info.desc;

      toast.innerHTML = `
        <div class="toast-content">
          <span class="toast-icon">${this.getIcon(type)}</span>
          <span class="toast-message">${sanitizeInput(message || 'No message')}</span>
          <button class="toast-close" aria-label="Close">×</button>
        </div>
        <div class="toast-detail">
          <p class="toast-detail-message">${sanitizeInput(detailContent)}</p>
          <p class="toast-detail-extra">${info.label} • ${dateStr} at ${timeStr}</p>
        </div>
      `;

      this.container.appendChild(toast);
      this.activeToasts.add(toast);

      // Trigger animation
      requestAnimationFrame(() => {
        toast.classList.add('toast-show');
      });

      // Close button - stop propagation to prevent expand
      const closeBtn = toast.querySelector('.toast-close');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hide(toast);
      });

      // Click to expand/collapse - ALL toasts are expandable
      toast.addEventListener('click', (e) => {
        if (e.target.classList.contains('toast-close')) return;
        this.toggleExpand(toast);
      });

      // Auto hide after duration
      if (duration > 0) {
        toast._hideTimeout = setTimeout(() => this.hide(toast), duration);
      }

      return toast;
    } catch (error) {
      console.error('Error showing toast:', error);
      return null;
    }
  }

  toggleExpand(toast) {
    if (!this.activeToasts.has(toast)) return;

    const isExpanded = toast.classList.contains('toast-expanded');

    if (isExpanded) {
      toast.classList.remove('toast-expanded');
    } else {
      toast.classList.add('toast-expanded');

      // Clear existing timeout and set new one when expanded
      if (toast._hideTimeout) {
        clearTimeout(toast._hideTimeout);
      }
      // Auto close after 5 seconds when expanded
      toast._hideTimeout = setTimeout(() => this.hide(toast), 5000);
    }
  }

  hide(toast) {
    if (!this.activeToasts.has(toast)) return;

    // Clear any pending timeout
    if (toast._hideTimeout) {
      clearTimeout(toast._hideTimeout);
    }

    // If expanded, collapse first then slide up
    if (toast.classList.contains('toast-expanded')) {
      toast.classList.remove('toast-expanded');
      // Wait for collapse animation, then slide up
      setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
          this.activeToasts.delete(toast);
        }, 300);
      }, 300);
    } else {
      // Not expanded, just slide up
      toast.classList.remove('toast-show');
      toast.classList.add('toast-hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.activeToasts.delete(toast);
      }, 300);
    }
  }

  update(toast, message, type = null) {
    if (!toast || !this.activeToasts.has(toast)) return;

    if (message) {
      const messageEl = toast.querySelector('.toast-message');
      if (messageEl) messageEl.textContent = message;

      const detailMessageEl = toast.querySelector('.toast-detail-message');
      if (detailMessageEl) detailMessageEl.textContent = message;
    }

    if (type) {
      // Remove old type classes
      toast.className = 'toast toast-show'; // Reset classes
      toast.classList.add(`toast-${type}`);

      const iconEl = toast.querySelector('.toast-icon');
      if (iconEl) iconEl.innerHTML = this.getIcon(type);
    }
  }

  success(message, duration = 3000, detail = null) {
    return this.show(message, duration, 'success', detail);
  }

  error(message, duration = 4000, detail = null) {
    return this.show(message, duration, 'error', detail);
  }

  warning(message, duration = 3500, detail = null) {
    return this.show(message, duration, 'warning', detail);
  }

  info(message, duration = 3000, detail = null) {
    return this.show(message, duration, 'info', detail);
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
