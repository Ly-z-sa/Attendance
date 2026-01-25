// ui/tutorial-manager.js
import i18nService from '../services/i18n-service.js';
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';

class TutorialManager {
    constructor() {
        this.currentStep = 0;
        this.overlay = null;
        this.tooltip = null;
        this.isActive = false;

        // Tutorial steps configuration - highlighting important elements
        this.steps = [
            {
                target: '.page[data-page="Dashboard"]',
                titleKey: 'tutorial.step1Title',
                descKey: 'tutorial.step1Desc',
                position: 'center',
                fallbackTitle: 'Welcome to Your Dashboard',
                fallbackDesc: 'This is your main overview. See your attendance stats, streak, and today\'s classes at a glance.'
            },
            {
                target: '.app-nav',
                titleKey: 'tutorial.step2Title',
                descKey: 'tutorial.step2Desc',
                position: 'bottom',
                fallbackTitle: 'Navigation',
                fallbackDesc: 'Use these links to access Attendance, Reports, Total overview, Focus timer, and Settings.'
            },
            {
                target: '.nav-link[data-page="Home"]',
                titleKey: 'tutorial.step3Title',
                descKey: 'tutorial.step3Desc',
                position: 'bottom',
                fallbackTitle: 'Mark Attendance',
                fallbackDesc: 'Go to Attendance to mark your daily classes as Present, Absent, Late, or Permission.'
            },
            {
                target: '.nav-link[data-page="Settings"]',
                titleKey: 'tutorial.step4Title',
                descKey: 'tutorial.step4Desc',
                position: 'bottom',
                fallbackTitle: 'Customize & Manage',
                fallbackDesc: 'In Settings, add semesters and subjects, change themes, and personalize your experience with colors and backgrounds.'
            },
            {
                target: '#assistant-fab',
                titleKey: 'tutorial.step5Title',
                descKey: 'tutorial.step5Desc',
                position: 'top-left',
                fallbackTitle: 'Need Help?',
                fallbackDesc: 'Click the assistant button anytime to ask questions or get help with the app.'
            }
        ];

        window.tutorialManager = this;
    }

    shouldShowTutorial() {
        // Check localStorage for pending flag (set after profile completion)
        const tutorialPending = localStorage.getItem('tutorialPending');
        return tutorialPending === 'true';
    }

    async checkUserTutorialStatus(userId) {
        // Check if user has already completed tutorial (stored in Firestore)
        try {
            const userDocRef = doc(window.firebaseDb, FIREBASE_PATHS.userProfile(userId));
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                return userData.tutorialCompleted === true;
            }
            return false;
        } catch (error) {
            console.error('Error checking tutorial status:', error);
            return false;
        }
    }

    async startIfNeeded(userId) {
        if (this.isActive) return;

        // Check localStorage pending flag first
        if (!this.shouldShowTutorial()) return;

        // Check Firestore to see if this specific user already completed the tutorial
        const alreadyCompleted = await this.checkUserTutorialStatus(userId);
        if (alreadyCompleted) {
            localStorage.removeItem('tutorialPending');
            return;
        }

        // Start the tutorial
        this.userId = userId;
        this.start();
    }

    start() {
        if (this.isActive) return;

        // Clear the pending flag
        localStorage.removeItem('tutorialPending');

        this.isActive = true;
        this.currentStep = 0;
        this.createOverlay();
        this.showStep(0);
    }

    createOverlay() {
        // Create main overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'tutorial-overlay';
        this.overlay.innerHTML = `
      <div class="tutorial-backdrop"></div>
      <div class="tutorial-spotlight"></div>
      <div class="tutorial-tooltip">
        <div class="tutorial-tooltip-content">
          <h3 class="tutorial-title"></h3>
          <p class="tutorial-desc"></p>
        </div>
        <div class="tutorial-footer">
          <div class="tutorial-progress"></div>
          <div class="tutorial-buttons">
            <button class="btn tutorial-skip-btn">${this.getText('tutorial.skip', 'Skip Tutorial')}</button>
            <button class="btn btn-green tutorial-next-btn">${this.getText('tutorial.next', 'Next')}</button>
          </div>
        </div>
      </div>
    `;

        document.body.appendChild(this.overlay);

        // Add event listeners
        this.overlay.querySelector('.tutorial-skip-btn').addEventListener('click', () => this.skip());
        this.overlay.querySelector('.tutorial-next-btn').addEventListener('click', () => this.next());

        // Create progress dots
        this.updateProgress();
    }

    getText(key, fallback) {
        try {
            const text = i18nService.t(key);
            return text !== key ? text : fallback;
        } catch {
            return fallback;
        }
    }

    updateProgress() {
        const progressContainer = this.overlay.querySelector('.tutorial-progress');
        progressContainer.innerHTML = this.steps.map((_, index) =>
            `<span class="tutorial-dot ${index === this.currentStep ? 'active' : ''}" data-step="${index}"></span>`
        ).join('');

        // Allow clicking dots to navigate
        progressContainer.querySelectorAll('.tutorial-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const step = parseInt(dot.dataset.step);
                this.showStep(step);
            });
        });
    }

    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.steps.length) return;

        this.currentStep = stepIndex;
        const step = this.steps[stepIndex];
        const targetElement = document.querySelector(step.target);

        // Update tooltip content
        const title = this.getText(step.titleKey, step.fallbackTitle);
        const desc = this.getText(step.descKey, step.fallbackDesc);

        this.overlay.querySelector('.tutorial-title').textContent = title;
        this.overlay.querySelector('.tutorial-desc').textContent = desc;

        // Update button text for last step
        const nextBtn = this.overlay.querySelector('.tutorial-next-btn');
        if (stepIndex === this.steps.length - 1) {
            nextBtn.textContent = this.getText('tutorial.finish', 'Get Started!');
        } else {
            nextBtn.textContent = this.getText('tutorial.next', 'Next');
        }

        // Update progress dots
        this.updateProgress();

        // Position spotlight
        this.positionSpotlight(targetElement, step.position);
    }

    positionSpotlight(targetElement, position) {
        const spotlight = this.overlay.querySelector('.tutorial-spotlight');
        const tooltip = this.overlay.querySelector('.tutorial-tooltip');

        if (!targetElement) {
            // Fallback to center if target not found
            spotlight.style.display = 'none';
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
            return;
        }

        spotlight.style.display = 'block';

        const rect = targetElement.getBoundingClientRect();
        const padding = 10;

        // Position spotlight around target
        spotlight.style.top = `${rect.top - padding}px`;
        spotlight.style.left = `${rect.left - padding}px`;
        spotlight.style.width = `${rect.width + padding * 2}px`;
        spotlight.style.height = `${rect.height + padding * 2}px`;

        // Position tooltip based on specified position
        tooltip.style.transform = 'none';

        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let tooltipTop, tooltipLeft;

        switch (position) {
            case 'bottom':
                tooltipTop = rect.bottom + padding + 15;
                tooltipLeft = rect.left + rect.width / 2 - tooltipRect.width / 2;
                break;
            case 'top':
                tooltipTop = rect.top - padding - tooltipRect.height - 15;
                tooltipLeft = rect.left + rect.width / 2 - tooltipRect.width / 2;
                break;
            case 'top-left':
                tooltipTop = rect.top - tooltipRect.height - 15;
                tooltipLeft = rect.left - tooltipRect.width + rect.width;
                break;
            case 'left':
                tooltipTop = rect.top + rect.height / 2 - tooltipRect.height / 2;
                tooltipLeft = rect.left - tooltipRect.width - padding - 15;
                break;
            case 'right':
                tooltipTop = rect.top + rect.height / 2 - tooltipRect.height / 2;
                tooltipLeft = rect.right + padding + 15;
                break;
            case 'center':
            default:
                tooltipTop = rect.bottom + 30;
                tooltipLeft = viewportWidth / 2 - tooltipRect.width / 2;
                break;
        }

        // Keep tooltip within viewport
        tooltipLeft = Math.max(15, Math.min(tooltipLeft, viewportWidth - tooltipRect.width - 15));
        tooltipTop = Math.max(15, Math.min(tooltipTop, viewportHeight - tooltipRect.height - 15));

        tooltip.style.top = `${tooltipTop}px`;
        tooltip.style.left = `${tooltipLeft}px`;
    }

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.showStep(this.currentStep + 1);
        } else {
            this.complete();
        }
    }

    skip() {
        this.complete();
    }

    async complete() {
        this.isActive = false;

        // Save completion status to Firestore (per user account)
        if (this.userId) {
            try {
                await setDoc(doc(window.firebaseDb, FIREBASE_PATHS.userProfile(this.userId)), {
                    tutorialCompleted: true
                }, { merge: true });
            } catch (error) {
                console.error('Error saving tutorial completion:', error);
            }
        }

        // Animate out
        this.overlay.classList.add('tutorial-fade-out');

        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            this.overlay = null;
        }, 300);
    }

    // Utility to reset tutorial for current user (for testing)
    async reset(userId) {
        localStorage.removeItem('tutorialPending');
        if (userId) {
            try {
                await setDoc(doc(window.firebaseDb, FIREBASE_PATHS.userProfile(userId)), {
                    tutorialCompleted: false
                }, { merge: true });
                console.log('Tutorial reset for user:', userId);
            } catch (error) {
                console.error('Error resetting tutorial:', error);
            }
        }
    }
}

export default new TutorialManager();

