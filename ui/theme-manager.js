// ui/theme-manager.js
import { COLOR_SCHEMES, FONTS, BACKGROUNDS } from '../utils/constants.js';

class ThemeManager {
  constructor() {
    this.currentTheme = 'light';
    this.currentColorScheme = 'default';
    this.currentFont = 'philosopher';
    this.currentBackground = 'default';
    this.backgroundInstance = null;
  }

  initialize() {
    // Load saved preferences
    this.currentTheme = localStorage.getItem('theme') || 'light';
    this.currentColorScheme = localStorage.getItem('colorScheme') || 'default';
    this.currentFont = localStorage.getItem('font') || 'philosopher';
    this.currentBackground = localStorage.getItem('background') || 'default';

    // Apply theme
    this.applyTheme(this.currentTheme);
    this.applyColorScheme(this.currentColorScheme);
    this.applyFont(this.currentFont);
    this.applyBackground(this.currentBackground);

    // Setup theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Setup personalization dropdowns (will be initialized in settings page)
    this.setupPersonalizationListeners();
  }

  setupPersonalizationListeners() {
    // These will be called when settings page is loaded
    const colorSchemeDropdown = document.getElementById('color-scheme-dropdown');
    const fontDropdown = document.getElementById('font-dropdown');
    const backgroundDropdown = document.getElementById('background-dropdown');

    if (colorSchemeDropdown) {
      colorSchemeDropdown.addEventListener('change', (e) => {
        this.applyColorScheme(e.currentTarget.dataset.value);
      });
    }

    if (fontDropdown) {
      fontDropdown.addEventListener('change', (e) => {
        this.applyFont(e.currentTarget.dataset.value);
      });
    }

    if (backgroundDropdown) {
      backgroundDropdown.addEventListener('change', (e) => {
        this.applyBackground(e.currentTarget.dataset.value);
      });
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    this.updateThemeIcon(theme);
  }

  applyColorScheme(scheme) {
    this.currentColorScheme = scheme;

    if (scheme === 'default') {
      document.documentElement.removeAttribute('data-color-scheme');
    } else {
      document.documentElement.setAttribute('data-color-scheme', scheme);
    }

    localStorage.setItem('colorScheme', scheme);

    // Update dropdown display if exists
    const display = document.getElementById('color-scheme-display');
    if (display) {
      display.textContent = COLOR_SCHEMES[scheme] || 'Default';
    }
  }

  applyFont(font) {
    this.currentFont = font;
    document.documentElement.setAttribute('data-font', font);
    localStorage.setItem('font', font);

    // Update dropdown display if exists
    const display = document.getElementById('font-display');
    if (display) {
      display.textContent = FONTS[font] || 'Philosopher';
    }
  }

  applyBackground(background) {
    this.currentBackground = background;
    localStorage.setItem('background', background);

    // Cleanup previous background
    if (this.backgroundInstance) {
      this.backgroundInstance.destroy();
      this.backgroundInstance = null;
    }

    // Apply new background
    switch (background) {
      case 'floating-lines':
        if (typeof FloatingLines !== 'undefined') {
          this.backgroundInstance = new FloatingLines();
        }
        break;
      case 'particles':
        if (typeof ParticlesBackground !== 'undefined') {
          this.backgroundInstance = new ParticlesBackground();
        }
        break;
      case 'matrix':
        if (typeof MatrixBackground !== 'undefined') {
          this.backgroundInstance = new MatrixBackground();
        }
        break;
      case 'prism':
        if (typeof PrismBackground !== 'undefined') {
          this.backgroundInstance = new PrismBackground();
        }
        break;
      case 'aurora':
        if (typeof AuroraBackground !== 'undefined') {
          this.backgroundInstance = new AuroraBackground();
        }
        break;
      case 'snowfall':
        if (typeof SnowfallBackground !== 'undefined') {
          this.backgroundInstance = new SnowfallBackground();
        }
        break;
      case 'lunar-new-year':
        if (typeof LunarNewYearBackground !== 'undefined') {
          this.backgroundInstance = new LunarNewYearBackground();
        }
        break;
      default:
        // No background
        break;
    }

    // Update dropdown display if exists
    const display = document.getElementById('background-display');
    if (display) {
      display.textContent = BACKGROUNDS[background] || 'Default';
    }
  }

  updateThemeIcon(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    if (!sunIcon || !moonIcon) return;

    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    }
  }

  getTheme() {
    return this.currentTheme;
  }

  getColorScheme() {
    return this.currentColorScheme;
  }

  getFont() {
    return this.currentFont;
  }

  getBackground() {
    return this.currentBackground;
  }

  // Get name for display
  getColorSchemeName(scheme = this.currentColorScheme) {
    return COLOR_SCHEMES[scheme] || 'Default';
  }

  getFontName(font = this.currentFont) {
    return FONTS[font] || 'Philosopher';
  }

  getBackgroundName(background = this.currentBackground) {
    return BACKGROUNDS[background] || 'Default';
  }
}

export default new ThemeManager();