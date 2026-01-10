// ui/dropdown-manager.js
import { sanitizeInput } from '../utils/sanitizer.js';

class DropdownManager {
  constructor() {
    this.activeDropdowns = new Set();
  }

  initialize() {
    this.initializeDatePickers();

    // Global click handler to close dropdowns
    document.body.addEventListener('click', (e) => {
      const dropdown = e.target.closest('.custom-dropdown');
      const datePicker = e.target.closest('.custom-date-picker');
      const timePicker = e.target.closest('.custom-time-picker');
      const popup = e.target.closest('.dropdown-options, .date-picker-calendar, .time-picker-dropdown');

      // 1. If we clicked a popup, handle internal logic FIRST
      if (popup) {
        const owner = popup._owner;
        if (owner) {
          // Handle dropdown option click
          const option = e.target.closest('.dropdown-option');
          if (option && owner.classList.contains('custom-dropdown')) {
            // Check if option is locked
            if (option.classList.contains('locked-option') || option.dataset.locked === 'true') {
              return; // Ignore click for locked options
            }
            this.selectOption(owner, option);
          }
        }
        return; // Don't close if clicking inside popup
      }

      // 2. If we clicked a trigger (Dropdown/DatePicker/TimePicker), handle toggle
      if (dropdown) {
        const selected = e.target.closest('.dropdown-selected');
        if (selected) this.toggle(dropdown);
      } else if (datePicker) {
        const selected = e.target.closest('.date-picker-selected');
        if (selected) this.toggleDatePicker(datePicker);
      } else {
        // Close all if clicking outside everything
        this.closeAll();
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

    // Smart repositioning
    let options = dropdown._optionsRef || dropdown.querySelector('.dropdown-options');
    if (options) {
      dropdown._optionsRef = options;
      options._owner = dropdown; // Reverse Link
      options.classList.add('open');
      this.reposition(options, selected);
    }
  }

  reposition(element, trigger) {
    if (!element || !trigger) return;

    // Link back to trigger owner for click handling
    const owner = trigger.closest('.custom-dropdown, .custom-date-picker, .custom-time-picker');
    if (owner) element._owner = owner;

    // Move to body to avoid clipping
    if (element.parentElement !== document.body) {
      document.body.appendChild(element);
    }

    const rect = trigger.getBoundingClientRect();

    // Reset styles
    element.style.position = 'fixed'; // Use fixed to stay synced with modals
    element.style.zIndex = '20000'; // High enough to be over modals (10000)
    element.style.margin = '0';
    element.style.top = 'auto';
    element.style.bottom = 'auto';
    element.style.left = 'auto';
    element.style.right = 'auto';
    element.style.maxHeight = 'none';

    // Only force width for dropdown options to match trigger
    // Calendars and custom pickers should use their intrinsic (CSS) width
    if (element.classList.contains('dropdown-options')) {
      element.style.width = `${rect.width}px`;
    } else {
      element.style.width = 'auto'; // allow intrinsic width for calendars/time-pickers
    }

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // Sample dimensions AFTER setting width/positioning style
    const elementRect = element.getBoundingClientRect();
    const elementHeight = elementRect.height;
    const elementWidth = elementRect.width;

    let finalTop = rect.bottom + 4; // Viewport relative
    let finalLeft = rect.left;

    // Vertical Positioning logic
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < elementHeight && spaceAbove > elementHeight) {
      // Open above
      finalTop = rect.top - elementHeight - 4;
    } else if (spaceBelow < elementHeight && spaceAbove < elementHeight) {
      // Constrained vertically - scrollable
      if (spaceBelow >= spaceAbove) {
        finalTop = rect.bottom + 2;
        element.style.maxHeight = `${spaceBelow - 20}px`;
        element.style.overflowY = 'auto';
      } else {
        finalTop = 10;
        element.style.maxHeight = `${spaceAbove - 20}px`;
        element.style.overflowY = 'auto';
      }
    }

    // Horizontal check - Stay within viewport
    if (finalLeft + elementWidth > viewportWidth - 10) {
      finalLeft = viewportWidth - elementWidth - 10;
    }

    if (finalLeft < 10) {
      finalLeft = 10;
    }

    element.style.top = `${finalTop}px`;
    element.style.left = `${finalLeft}px`;
  }

  close(dropdown) {
    dropdown.classList.remove('open');
    this.activeDropdowns.delete(dropdown);

    // Hide the teleported options too
    const options = dropdown._optionsRef || dropdown.querySelector('.dropdown-options');
    if (options) {
      options.classList.remove('open');
    }

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
    document.querySelectorAll('.custom-dropdown, .custom-date-picker, .custom-time-picker').forEach(d => {
      d.classList.remove('open');
    });

    document.querySelectorAll('.dropdown-options, .date-picker-calendar, .time-picker-dropdown').forEach(p => {
      p.classList.remove('open');
    });

    this.activeDropdowns.clear();
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
    const calendar = picker._calendarRef || picker.querySelector('.date-picker-calendar');
    const trigger = picker.querySelector('.date-picker-selected');
    if (calendar) picker._calendarRef = calendar;

    if (calendar && calendar.classList.contains('open')) {
      calendar.classList.remove('open');
      picker.classList.remove('open');
    } else if (calendar) {
      this.closeAll();
      picker.classList.add('open');
      calendar.classList.add('open');
      this.reposition(calendar, trigger);
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
      <span>${selectedText ? sanitizeInput(selectedText.label) : 'Select...'}</span>
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
      optionEl.dataset.value = sanitizeInput(option.value);
      optionEl.setAttribute('role', 'option');
      optionEl.textContent = sanitizeInput(option.label);
      optionsContainer.appendChild(optionEl);
    });

    dropdown.appendChild(selected);
    dropdown.appendChild(optionsContainer);

    return dropdown;
  }

  // Helper to create time picker programmatically
  createTimePicker(name, initialValue = '') {
    const container = document.createElement('div');
    container.className = 'custom-time-picker';

    // Hidden input to store value (source of truth for form submission)
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = name;
    hiddenInput.value = initialValue;
    container.appendChild(hiddenInput);

    // Display element container
    const display = document.createElement('div');
    display.className = 'time-picker-display';

    // Manual Input Field
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'time-manual-input';
    textInput.value = initialValue;
    textInput.placeholder = 'HH:MM'; // Updated placeholder
    textInput.maxLength = 5; // HH:MM

    // Auto-format logic (1245 -> 12:45)
    textInput.oninput = (e) => {
      let val = e.target.value.replace(/\D/g, ''); // Strip non-digits

      // Prevent typing more than 4 digits
      if (val.length > 4) val = val.substring(0, 4);

      // Smart Colon Insertion
      if (val.length > 2) {
        val = val.substring(0, 2) + ':' + val.substring(2);
      }

      e.target.value = val;
      hiddenInput.value = val;
    };

    // Validation on Blur
    textInput.onblur = (e) => {
      const val = e.target.value;
      if (!val) return; // Allow empty

      // Basic format check
      const parts = val.split(':');
      let h = 0, m = 0;

      if (parts.length === 2) {
        h = parseInt(parts[0]) || 0;
        m = parseInt(parts[1]) || 0;
      } else if (val.length === 2) {
        // User typed "12" -> "12:00"
        h = parseInt(val) || 0;
      } else if (val.length === 1) {
        h = parseInt(val) || 0;
      }

      // Validate Ranges
      if (h > 23) h = 23;
      if (m > 59) m = 59;

      // Reformat nicely
      const formatted = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      e.target.value = formatted;
      hiddenInput.value = formatted;
    };

    // prevent dropdown toggle when clicking input
    textInput.onclick = (e) => {
      e.stopPropagation();
      this.closeAll(); // Close dropdowns if user wants to type
    };

    display.appendChild(textInput);

    // Toggle Icon structure
    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'time-picker-icon';
    iconWrapper.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 1.25em; height: 1.25em;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;

    // Toggle logic ONLY on icon
    iconWrapper.onclick = (e) => {
      e.stopPropagation();
      this.toggleTimePicker(container);
    };

    display.appendChild(iconWrapper);
    container.appendChild(display);

    // Dropdown container
    const dropdown = document.createElement('div');
    dropdown.className = 'time-picker-dropdown';

    // Helper to generate time parts
    let initHour = '09';
    let initMinute = '00';
    if (initialValue) {
      const parts = initialValue.split(':');
      if (parts.length === 2) {
        initHour = parts[0];
        initMinute = parts[1];
      }
    }

    // Hours Column
    const hoursCol = document.createElement('div');
    hoursCol.className = 'time-column';
    for (let i = 0; i < 24; i++) {
      const h = i.toString().padStart(2, '0');
      const opt = document.createElement('div');
      opt.className = `time-option ${h === initHour ? 'selected' : ''}`;
      opt.textContent = h;
      opt.dataset.value = h;
      opt.onclick = (e) => {
        e.stopPropagation();
        hoursCol.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        this.updateTimeValue(container);
      };
      hoursCol.appendChild(opt);
    }

    // Separator
    const sep = document.createElement('div');
    sep.className = 'time-separator';
    sep.textContent = ':';

    // Minutes Column
    const minsCol = document.createElement('div');
    minsCol.className = 'time-column';
    for (let i = 0; i < 60; i += 5) {
      const m = i.toString().padStart(2, '0');
      const opt = document.createElement('div');
      opt.className = `time-option ${m === initMinute ? 'selected' : ''}`;
      opt.textContent = m;
      opt.dataset.value = m;
      opt.onclick = (e) => {
        e.stopPropagation();
        minsCol.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        this.updateTimeValue(container);
      };
      minsCol.appendChild(opt);
    }

    dropdown.appendChild(hoursCol);
    dropdown.appendChild(sep);
    dropdown.appendChild(minsCol);
    container.appendChild(dropdown);

    return container;
  }

  updateTimeValue(container) {
    const dropdown = container._dropdownRef || container.querySelector('.time-picker-dropdown');
    if (!dropdown) return;

    const hours = dropdown.querySelector('.time-column:first-child .selected')?.dataset.value || '00';
    const mins = dropdown.querySelector('.time-column:last-child .selected')?.dataset.value || '00';
    const timeStr = `${hours}:${mins}`;

    const hiddenInput = container.querySelector('input[type="hidden"]');
    const textInput = container.querySelector('.time-manual-input');

    if (hiddenInput) hiddenInput.value = timeStr;
    if (textInput) textInput.value = timeStr;
  }

  toggleTimePicker(picker) {
    const dropdown = picker._dropdownRef || picker.querySelector('.time-picker-dropdown');
    const trigger = picker.querySelector('.time-picker-display');
    if (dropdown) picker._dropdownRef = dropdown;

    if (dropdown && dropdown.classList.contains('open')) {
      dropdown.classList.remove('open');
      picker.classList.remove('open');
    } else if (dropdown) {
      this.closeAll();
      picker.classList.add('open');
      dropdown.classList.add('open');
      this.reposition(dropdown, trigger);
    }

    // Scroll to selected
    const selected = picker.querySelectorAll('.selected');
    selected.forEach(el => el.scrollIntoView({ block: 'center' }));
  }


  // Date Picker Logic
  initializeDatePickers() {
    document.querySelectorAll('.custom-date-picker').forEach(picker => {
      this.setupDatePicker(picker);
    });
  }

  setupDatePicker(picker, options = {}) {
    if (picker.dataset.initialized) return;

    const { disablePastDates = true } = options; // Default to true for semesters

    const grid = picker.querySelector('.calendar-grid');
    const monthYearDisplay = picker.querySelector('.calendar-month-year');
    const prevBtn = picker.querySelector('.calendar-nav[aria-label="Previous month"]');
    const nextBtn = picker.querySelector('.calendar-nav[aria-label="Next month"]');
    const hiddenInput = picker.nextElementSibling; // Assuming input is next sibling as per HTML structure
    const displaySpan = picker.querySelector('.date-picker-selected span');

    // State
    let currentDate = new Date(); // Viewing date
    let selectedDate = null;      // Selected value

    // Check existing value
    if (hiddenInput && hiddenInput.value) {
      const [y, m, d] = hiddenInput.value.split('-');
      selectedDate = new Date(y, m - 1, d);
      currentDate = new Date(selectedDate);
      if (displaySpan) displaySpan.textContent = selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Render function
    const render = () => {
      // Update Header
      const monthName = currentDate.toLocaleDateString(undefined, { month: 'long' });
      monthYearDisplay.textContent = `${monthName} ${currentDate.getFullYear()}`;

      grid.innerHTML = '';

      // Calendar Logic
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Adjust for Monday start if preferred, but standard JS starts Sunday (0)
      // Let's stick to standard grid (Su Mo Tu We Th Fr Sa) or matching users locale. 
      // For simplicity and consistency with most cals here:
      // Week headers (optional, usually hardcoded or generated once)
      // If headers aren't in HTML, we might need to add them or just assume grid styling handles it.
      // Looking at HTML, there are NO key headers. Let's add day headers if they don't exist? 
      // Actually, let's just render the days. Standard grid usually implies 7 cols.

      // Empty slots for previous month
      for (let i = 0; i < firstDayOfMonth; i++) {
        const empty = document.createElement('div');
        empty.className = 'calendar-day empty';
        grid.appendChild(empty);
      }

      // Days
      for (let d = 1; d <= daysInMonth; d++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = d;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thisDay = new Date(year, month, d);
        const isPast = thisDay < today;

        if (disablePastDates && isPast) {
          dayEl.classList.add('disabled');
        } else {
          dayEl.onclick = (e) => {
            e.stopPropagation();
            // Select Logic
            selectedDate = new Date(year, month, d);

            // Update Input (YYYY-MM-DD for standard format)
            const formatY = selectedDate.getFullYear();
            const formatM = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const formatD = String(selectedDate.getDate()).padStart(2, '0');
            const val = `${formatY}-${formatM}-${formatD}`;

            if (hiddenInput) hiddenInput.value = val;
            if (displaySpan) displaySpan.textContent = selectedDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

            // Re-render to show selection
            render();
            this.closeAll();
          };
        }

        // Check if selected
        if (selectedDate &&
          selectedDate.getDate() === d &&
          selectedDate.getMonth() === month &&
          selectedDate.getFullYear() === year) {
          dayEl.classList.add('selected');
        }

        // Check if today
        if (today.getDate() === d && today.getMonth() === month && today.getFullYear() === year) {
          dayEl.classList.add('today');
        }

        grid.appendChild(dayEl);
      }
    };

    // Event Listeners
    prevBtn.onclick = (e) => {
      e.stopPropagation();
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    };

    nextBtn.onclick = (e) => {
      e.stopPropagation();
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    };

    // Initial Render
    render();
    picker.dataset.initialized = 'true';
  }
}

export default new DropdownManager();
