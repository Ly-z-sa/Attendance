// ui/dropdown-manager.js

class DropdownManager {
  constructor() {
    this.activeDropdowns = new Set();
  }

  initialize() {
    // Global click handler to close dropdowns
    document.body.addEventListener('click', (e) => {
      const dropdown = e.target.closest('.custom-dropdown');
      const datePicker = e.target.closest('.custom-date-picker');
      
      // Close all dropdowns if clicking outside
      if (!dropdown && !datePicker) {
        this.closeAll();
        return;
      }

      // Handle dropdown toggle
      if (dropdown) {
        const selected = e.target.closest('.dropdown-selected');
        if (selected) {
          this.toggle(dropdown);
        }

        // Handle option selection
        const option = e.target.closest('.dropdown-option');
        if (option) {
          this.selectOption(dropdown, option);
        }
      }

      // Handle date picker toggle
      if (datePicker) {
        const selected = e.target.closest('.date-picker-selected');
        if (selected) {
          this.toggleDatePicker(datePicker);
        }
      }
    });

    // Keyboard navigation
    document.body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAll();
      }

      // Arrow key navigation for dropdowns
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const activeDropdown = document.querySelector('.custom-dropdown.open');
        if (activeDropdown) {
          e.preventDefault();
          this.navigateOptions(activeDropdown, e.key === 'ArrowDown' ? 1 : -1);
        }
      }

      // Enter key to select
      if (e.key === 'Enter') {
        const activeDropdown = document.querySelector('.custom-dropdown.open');
        if (activeDropdown) {
          const focusedOption = activeDropdown.querySelector('.dropdown-option:focus');
          if (focusedOption) {
            e.preventDefault();
            this.selectOption(activeDropdown, focusedOption);
          }
        }
      }
    });
  }

  toggle(dropdown) {
    const isOpen = dropdown.classList.contains('open');
    
    // Close all other dropdowns
    this.closeAll();
    
    if (!isOpen) {
      this.open(dropdown);
    }
  }

  open(dropdown) {
    dropdown.classList.add('open');
    this.activeDropdowns.add(dropdown);
    
    // Update ARIA attributes
    const selected = dropdown.querySelector('.dropdown-selected');
    if (selected) {
      selected.setAttribute('aria-expanded', 'true');
    }

    // Handle z-index for data rows
    const dataRow = dropdown.closest('.data-row');
    if (dataRow) {
      dataRow.style.zIndex = '1003';
      dataRow.style.position = 'relative';
    }

    // Focus first option
    const firstOption = dropdown.querySelector('.dropdown-option');
    if (firstOption) {
      setTimeout(() => firstOption.focus(), 100);
    }
  }

  close(dropdown) {
    dropdown.classList.remove('open');
    this.activeDropdowns.delete(dropdown);
    
    // Update ARIA attributes
    const selected = dropdown.querySelector('.dropdown-selected');
    if (selected) {
      selected.setAttribute('aria-expanded', 'false');
    }

    // Reset z-index for data rows
    const dataRow = dropdown.closest('.data-row');
    if (dataRow) {
      dataRow.style.zIndex = '';
    }
  }

  closeAll() {
    document.querySelectorAll('.custom-dropdown.open').forEach(dropdown => {
      this.close(dropdown);
    });

    document.querySelectorAll('.custom-date-picker.open').forEach(picker => {
      picker.classList.remove('open');
    });
  }

  selectOption(dropdown, option) {
    const value = option.dataset.value;
    const text = option.textContent;
    const selectedDisplay = dropdown.querySelector('.dropdown-selected span');
    
    if (selectedDisplay) {
      selectedDisplay.textContent = text;
    }
    
    dropdown.dataset.value = value;
    
    // Update status class for status dropdowns
    if (dropdown.classList.contains('status-dropdown')) {
      const selectedBox = dropdown.querySelector('.dropdown-selected');
      selectedBox.className = 'dropdown-selected';
      selectedBox.classList.add(`status-${value.toLowerCase()}`);
    }
    
    this.close(dropdown);
    
    // Dispatch change event
    dropdown.dispatchEvent(new Event('change', { bubbles: true }));
  }

  navigateOptions(dropdown, direction) {
    const options = Array.from(dropdown.querySelectorAll('.dropdown-option'));
    const currentIndex = options.findIndex(opt => opt === document.activeElement);
    
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = options.length - 1;
    if (nextIndex >= options.length) nextIndex = 0;
    
    if (options[nextIndex]) {
      options[nextIndex].focus();
    }
  }

  toggleDatePicker(picker) {
    const isOpen = picker.classList.contains('open');
    
    // Close all dropdowns
    this.closeAll();
    
    if (!isOpen) {
      picker.classList.add('open');
    } else {
      picker.classList.remove('open');
    }
  }

  // Helper to create dropdown programmatically
  createDropdown(options, selectedValue = null) {
    const dropdown = document.createElement('div');
    dropdown.className = 'custom-dropdown';
    dropdown.dataset.value = selectedValue || '';

    const selected = document.createElement('div');
    selected.className = 'dropdown-selected';
    selected.setAttribute('role', 'button');
    selected.setAttribute('tabindex', '0');
    selected.setAttribute('aria-haspopup', 'listbox');
    selected.setAttribute('aria-expanded', 'false');

    const selectedText = options.find(opt => opt.value === selectedValue);
    selected.innerHTML = `
      <span>${selectedText ? selectedText.label : 'Select...'}</span>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    `;

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'dropdown-options';
    optionsContainer.setAttribute('role', 'listbox');

    options.forEach(option => {
      const optionEl = document.createElement('div');
      optionEl.className = 'dropdown-option';
      optionEl.dataset.value = option.value;
      optionEl.setAttribute('role', 'option');
      optionEl.textContent = option.label;
      optionsContainer.appendChild(optionEl);
    });

    dropdown.appendChild(selected);
    dropdown.appendChild(optionsContainer);

    return dropdown;
  }
}

export default new DropdownManager();