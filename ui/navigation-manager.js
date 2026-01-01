// ui/navigation-manager.js

class NavigationManager {
    constructor() {
        this.nav = null;
        this.toggleBtn = null;
        this.overlay = null;
        this.menuIcon = null;
        this.closeIcon = null;
        this.isOpen = false;
    }

    initialize() {
        this.nav = document.querySelector('.app-nav');
        this.toggleBtn = document.getElementById('mobile-menu-toggle');
        this.overlay = document.getElementById('mobile-nav-overlay');
        this.menuIcon = document.getElementById('menu-icon');
        this.closeIcon = document.getElementById('close-icon');

        if (!this.toggleBtn || !this.nav || !this.overlay) {
            console.warn('Navigation elements not found');
            return;
        }

        this.toggleBtn.addEventListener('click', () => this.toggleMenu());
        this.overlay.addEventListener('click', () => this.closeMenu());

        // Close menu when a link is clicked
        this.nav.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                this.closeMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMenu();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        if (this.isOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (this.isOpen) return;

        this.isOpen = true;
        this.nav.classList.add('mobile-open');
        this.overlay.classList.add('visible');
        this.toggleBtn.setAttribute('aria-expanded', 'true');
        this.menuIcon.style.display = 'none';
        this.closeIcon.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scroll
    }

    closeMenu() {
        if (!this.isOpen) return;

        this.isOpen = false;
        this.nav.classList.remove('mobile-open');
        this.overlay.classList.remove('visible');
        this.toggleBtn.setAttribute('aria-expanded', 'false');
        this.menuIcon.style.display = 'block';
        this.closeIcon.style.display = 'none';
        document.body.style.overflow = ''; // Restore scroll
    }
}

const navigationManager = new NavigationManager();
export default navigationManager;
window.navigationManager = navigationManager;
