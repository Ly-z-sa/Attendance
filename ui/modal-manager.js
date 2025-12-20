// ui/modal-manager.js
import { validatePassword, getPasswordStrength } from '../utils/validation.js';

class ModalManager {
  constructor() {
    this.activeModals = new Set();
    // Expose globally immediately
    window.modalManager = this;
    console.log('ModalManager initialized and exposed to window');
  }

  initialize() {
    // Setup close buttons for all modals
    // Setup close buttons using event delegation with capture phase
    // This ensures we catch the click before any other handlers might stop propagation
    document.addEventListener('click', (e) => {
      // Handle clicks on close buttons
      const closeBtn = e.target.closest('[data-modal-close]');
      if (closeBtn) {
        e.preventDefault();
        e.stopPropagation(); // Stop other handlers from firing
        const modalId = closeBtn.dataset.modalClose;
        this.close(modalId);
        return;
      }

      // Handle clicks on overlay (background)
      if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
        const modalId = e.target.id;
        this.close(modalId);
      }
    }, { capture: true });

    // Expose for debugging/inline usage
    window.modalManager = this;

    // Removed separate overlay listener since we merged it into the capture listener above
    // to ensure reliable handling

    // ESC key to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModals.size > 0) {
        const lastModal = Array.from(this.activeModals).pop();
        this.close(lastModal);
      }
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.error(`Modal ${modalId} not found`);
      return;
    }

    // Force reflow to ensure animation plays
    void modal.offsetWidth;

    // Move to end of body to ensure it sits on top of everything (z-index stacking context fix)
    if (modal.parentNode !== document.body) {
      document.body.appendChild(modal);
    }
    // Also move the overlay/modals container if it exists, but here we assume modals are direct children of body or a container
    // Since we are targeting ID, we just move the element itself.

    // Nuclear Option: Set style directly with !important
    // We use setProperty to be safer than cssText, respecting existing unrelated styles if any
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('opacity', '1', 'important');
    modal.style.setProperty('visibility', 'visible', 'important');
    modal.style.setProperty('pointer-events', 'auto', 'important'); // Ensure clickable
    modal.style.setProperty('z-index', '2147483647', 'important');
    modal.style.setProperty('transition', 'none', 'important'); // Kill animations that might hide it

    // Force content visibility too
    const content = modal.querySelector('.modal-content');
    if (content) {
      content.style.setProperty('opacity', '1', 'important');
      content.style.setProperty('transform', 'none', 'important');
      content.style.setProperty('visibility', 'visible', 'important');
    }

    requestAnimationFrame(() => {
      modal.classList.add('show');
    });

    this.activeModals.add(modalId);

    // Focus first input
    const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn(`Attempted to close non-existent modal: ${modalId}`);
      return;
    }

    modal.classList.remove('show');
    // Clean up direct styles
    modal.style.display = '';
    modal.style.opacity = '';
    modal.style.zIndex = '';

    this.activeModals.delete(modalId);

    // Restore body scroll if no modals are actually visible
    // We check the DOM directly to be absolutely sure
    const visibleModals = document.querySelectorAll('.modal-overlay.show');
    if (visibleModals.length === 0) {
      document.body.style.overflow = '';
    }
  }

  closeAll() {
    this.activeModals.forEach(modalId => this.close(modalId));
  }

  // Input modal for getting user input
  input(title, message, placeholder = '', isPassword = false, validatePasswordFn = null, currentPassword = null) {
    return new Promise((resolve) => {
      const modal = document.getElementById('input-modal');
      const titleEl = document.getElementById('input-modal-title');
      const messageEl = document.getElementById('input-modal-message');
      const inputEl = document.getElementById('input-modal-field');
      const validationEl = document.getElementById('input-modal-validation');
      const confirmBtn = document.getElementById('input-modal-confirm');

      titleEl.textContent = title;
      messageEl.textContent = message;
      inputEl.placeholder = placeholder;
      inputEl.type = isPassword ? 'password' : 'text';
      inputEl.value = '';
      validationEl.innerHTML = '';
      confirmBtn.disabled = false;

      const updateValidation = () => {
        if (!validatePasswordFn || !inputEl.value) {
          validationEl.innerHTML = '';
          confirmBtn.disabled = false;
          return;
        }

        const password = inputEl.value;
        const validation = validatePasswordFn(password);
        const strength = getPasswordStrength(password);

        let requirements = [];
        if (!validation.minLength) requirements.push('6+ characters');
        if (!validation.hasCapital) requirements.push('1 capital letter');
        if (!validation.hasNumber) requirements.push('1 number');

        let samePassword = currentPassword && password === currentPassword;
        if (samePassword) requirements.push('must be different from current');

        const isValid = validation.valid && !samePassword;
        confirmBtn.disabled = !isValid;

        validationEl.innerHTML = `
          <div style="color: ${strength.color}; font-weight: 500;">Strength: ${strength.strength}</div>
          ${requirements.length > 0 ? `<div style="color: var(--red); font-size: 0.8rem;">Missing: ${requirements.join(', ')}</div>` : ''}
        `;
      };

      const handleConfirm = () => {
        const value = inputEl.value;
        this.close('input-modal');
        cleanup();
        resolve(value);
      };

      const handleCancel = () => {
        this.close('input-modal');
        cleanup();
        resolve(null);
      };

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        inputEl.removeEventListener('keypress', handleKeyPress);
        inputEl.removeEventListener('input', updateValidation);
        // Remove temporary listeners
        modal.querySelectorAll('[data-modal-close]').forEach(btn => {
          btn.removeEventListener('click', handleCancelWrap);
        });
      };

      const handleCancelWrap = () => handleCancel();

      // Attach cancel handler to close buttons
      modal.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', handleCancelWrap);
      });

      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (inputEl.value && !confirmBtn.disabled) handleConfirm();
        }
      };

      confirmBtn.addEventListener('click', handleConfirm);
      inputEl.addEventListener('keypress', handleKeyPress);

      if (validatePasswordFn) {
        inputEl.addEventListener('input', updateValidation);
      }

      this.open('input-modal');
    });
  }

  // Confirm modal for yes/no decisions
  confirm(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const messageEl = document.getElementById('confirm-modal-message');
      const confirmBtn = document.getElementById('confirm-modal-confirm');

      titleEl.textContent = title;
      messageEl.textContent = message;

      const handleConfirm = () => {
        this.close('confirm-modal');
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        this.close('confirm-modal');
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        confirmBtn.removeEventListener('click', handleConfirm);
        // Remove temporary listeners we added to close buttons
        modal.querySelectorAll('[data-modal-close]').forEach(btn => {
          btn.removeEventListener('click', handleCancelWrap);
        });
      };

      // Wrap handleCancel to match event listener signature if needed, though handleCancel ignores args
      const handleCancelWrap = () => handleCancel();

      // Attach handleCancel to all close buttons in this modal (X and Cancel)
      // This ensures the promise resolves when they are clicked, in addition to the generic close handler
      modal.querySelectorAll('[data-modal-close]').forEach(btn => {
        btn.addEventListener('click', handleCancelWrap);
      });

      confirmBtn.addEventListener('click', handleConfirm);

      this.open('confirm-modal');
    });
  }

  // Alert modal for information
  alert(title, message) {
    return this.confirm(title, message);
  }
}

export default new ModalManager();