// services/i18n-service.js
import en from '../utils/translations/en.js';
import fr from '../utils/translations/fr.js';

class I18nService {
    constructor() {
        this.languages = { en, fr };
        this.currentLanguage = localStorage.getItem('app_language') || 'en';
    }

    setLanguage(lang) {
        if (this.languages[lang]) {
            this.currentLanguage = lang;
            localStorage.setItem('app_language', lang);
            // We'll need to trigger a re-render of the app
            window.location.reload();
        }
    }

    t(key, replacements = {}) {
        const keys = key.split('.');
        let value = this.languages[this.currentLanguage];

        for (const k of keys) {
            if (value && value[k]) {
                value = value[k];
            } else {
                return key; // Return the key if translation is missing
            }
        }

        if (typeof value === 'string') {
            Object.entries(replacements).forEach(([k, v]) => {
                value = value.replace(`{${k}}`, v);
            });
        }

        return value;
    }

    getDayTranslation(day) {
        if (!day) return '';
        const key = `days.${day.toLowerCase()}`;
        return this.t(key);
    }

    getRelativeTimeTranslation(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        date.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return this.t('common.today');
        if (diffDays === 1) return this.t('common.yesterday');
        if (diffDays < 7) return this.t('common.daysAgo', { count: diffDays });
        if (diffDays < 30) return this.t('common.weeksAgo', { count: Math.floor(diffDays / 7) });

        return this.formatDate(dateString, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDate(date, options = {}) {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
        return d.toLocaleDateString(this.currentLanguage === 'en' ? 'en-US' : 'fr-FR', options);
    }

    getCurrentLanguage() {
        return this.currentLanguage;
    }
}

export default new I18nService();
