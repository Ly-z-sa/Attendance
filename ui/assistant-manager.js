// ui/assistant-manager.js
// Smart FAQ Chatbot with Fuzzy Matching
import i18nService from '../services/i18n-service.js';

class AssistantManager {
  constructor() {
    this.fab = null;
    this.overlay = null;
    this.isOpen = false;
    this.chatMessages = null;
    this.chatInput = null;

    // Comprehensive knowledge base about the entire website
    // Load knowledge base from i18n
    this.knowledgeBase = i18nService.t('trackie.faq');

    // Stop words to filter out (English and French)
    this.stopWords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
      'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here',
      'there', 'when', 'where', 'why', 'all', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'although', 'though', 'after', 'before',
      'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you', 'your', 'yours',
      'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'they', 'them',
      'whom', 'this', 'that', 'these', 'those', 'am',
      'please', 'want', 'like',
      // French stop words
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
      'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son', 'ma', 'ta', 'sa',
      'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
      'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
      'que', 'qui', 'quoi', 'dont', 'où', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
      'pour', 'par', 'sur', 'dans', 'en', 'vers', 'avec', 'sans', 'sous',
      // Spanish stop words
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'pero', 'si',
      'de', 'del', 'al', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre',
      'mi', 'tu', 'su', 'mis', 'tus', 'sus', 'yo', 'tú', 'él', 'ella', 'nosotros',
      'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'me', 'te', 'se', 'nos', 'os',
      'que', 'quien', 'cual', 'donde', 'cuando', 'como', 'cuanto',
      // Russian stop words
      'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все',
      'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы',
      'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет',
      'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если',
      'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь',
      // Chinese stop words (common particles)
      '的', '了', '和', '是', '就', '都', '而', '及', '与', '着', '或', '一个', '没有',
      '我们', '你们', '他们', '她们', '它', '它们', '我', '你', '他', '她',
      '在', '有', '么', '呢', '吧', '啊', '吗', '什么',
      // Khmer stop words (common particles/prepositions)
      'នៃ', 'ជា', 'និង', 'គឺ', 'ដែល', 'ក្នុង', 'លើ', 'ដោយ', 'ពី', 'ទៅ', 'បាន',
      'នូវ', 'ឯ', 'ដ៏', 'មាន', 'មិន', 'ថា', 'ហើយ', 'ក៏', 'តែ', 'នូវ'
    ]);

    // Greeting keys (translated via i18n)
    this.greetingKeys = ['trackie.greeting1', 'trackie.greeting2', 'trackie.greeting3'];

    // Fallback keys (translated via i18n)
    this.fallbackKeys = ['trackie.fallback1', 'trackie.fallback2', 'trackie.fallback3'];

    // Suggested question keys (translated via i18n)
    this.suggestedQuestionKeys = ['trackie.suggest1', 'trackie.suggest2', 'trackie.suggest3', 'trackie.suggest4'];
  }

  initialize() {
    this.fab = document.getElementById('assistant-fab');
    this.overlay = document.getElementById('assistant-overlay');
    this.chatMessages = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    const closeBtn = document.getElementById('assistant-close');
    const sendBtn = document.getElementById('chat-send');

    if (this.fab) {
      this.fab.addEventListener('click', () => this.toggleAssistant());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeAssistant());
    }

    // Close on overlay click (outside panel)
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.closeAssistant();
        }
      });
    }

    // Send button
    if (sendBtn) {
      sendBtn.addEventListener('click', () => this.handleUserInput());
    }

    // Enter to send
    if (this.chatInput) {
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleUserInput();
        }
      });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeAssistant();
      }
    });

    // Setup suggested question clicks
    this.setupSuggestedQuestions();

    // Setup contact link clicks
    this.setupContactLinks();

    // Hover effect for FAB to show reminder
    if (this.fab) {
      this.fab.addEventListener('mouseenter', () => {
        if (!this.isOpen && !this.isReminderVisible) {
          this.showReminder(false); // false = don't save timestamp, just show
        }
      });

      this.fab.addEventListener('mouseleave', () => {
        if (this.isReminderVisible && !this.reminderAutoShown) {
          this.hideReminder();
        }
      });
    }

    // Check for periodic reminder
    setTimeout(() => this.checkReminder(), 2000);
  }

  checkReminder() {
    const lastReminder = localStorage.getItem('lastAssistantReminderTime');
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (!lastReminder || (now - parseInt(lastReminder)) > FIVE_MINUTES) {
      this.showReminder(true);
    }
  }

  showReminder(autoShown = false) {
    const reminder = document.getElementById('assistant-reminder');
    if (reminder) {
      // Update the text to use translated version
      const reminderText = reminder.querySelector('.reminder-text');
      if (reminderText) {
        reminderText.textContent = i18nService.t('trackie.askTrackie');
      }

      reminder.classList.add('visible');
      this.isReminderVisible = true;

      if (autoShown) {
        this.reminderAutoShown = true;
        localStorage.setItem('lastAssistantReminderTime', Date.now().toString());

        // Auto hide after 5 seconds if auto-shown
        setTimeout(() => {
          if (this.isReminderVisible && this.reminderAutoShown) {
            this.hideReminder();
          }
        }, 5000);
      }
    }
  }

  hideReminder() {
    const reminder = document.getElementById('assistant-reminder');
    if (reminder) {
      reminder.classList.remove('visible');
      this.isReminderVisible = false;
      this.reminderAutoShown = false;
    }
  }

  setupContactLinks() {
    document.addEventListener('click', (e) => {
      const contactLink = e.target.closest('.contact-link');
      if (contactLink) {
        e.preventDefault();
        this.closeAssistant();
        // Navigate to Settings page
        const settingsTab = document.querySelector('[data-page="Settings"]');
        if (settingsTab) {
          settingsTab.click();
          // Scroll to the report problem section after a short delay
          setTimeout(() => {
            const reportSection = document.getElementById('report-problem-section') ||
              document.querySelector('.report-problem-card') ||
              document.querySelector('[class*="report"]');
            if (reportSection) {
              reportSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
              // Just scroll to bottom where contact usually is
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            }
          }, 300);
        }
      }
    });
  }

  setupSuggestedQuestions() {
    document.addEventListener('click', (e) => {
      const suggestionBtn = e.target.closest('.suggestion-btn');
      if (suggestionBtn) {
        const question = suggestionBtn.dataset.question;
        if (question && this.chatInput) {
          this.chatInput.value = question;
          this.handleUserInput();
        }
      }
    });
  }

  toggleAssistant() {
    if (this.isOpen) {
      this.closeAssistant();
    } else {
      this.openAssistant();
    }
  }

  openAssistant() {
    if (this.overlay) {
      this.overlay.classList.add('open');
      this.isOpen = true;

      // Show greeting if chat is empty
      if (this.chatMessages && this.chatMessages.children.length === 0) {
        this.showGreeting();
      }

      // Focus input
      setTimeout(() => {
        if (this.chatInput) this.chatInput.focus();
      }, 300);
    }
  }

  closeAssistant() {
    if (this.overlay) {
      this.overlay.classList.remove('open');
      this.isOpen = false;
    }
  }

  showGreeting() {
    const key = this.greetingKeys[Math.floor(Math.random() * this.greetingKeys.length)];
    this.addBotMessage(i18nService.t(key));
    this.showSuggestions();
  }

  showSuggestions() {
    if (!this.chatMessages) return;

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'chat-suggestions';
    const questions = this.suggestedQuestionKeys.map(k => i18nService.t(k));
    suggestionsDiv.innerHTML = `
      <div class="suggestions-label">${i18nService.t('trackie.tryAsking')}</div>
      <div class="suggestions-list">
        ${questions.map(q =>
      `<button class="suggestion-btn" data-question="${q}">${q}</button>`
    ).join('')}
      </div>
    `;
    this.chatMessages.appendChild(suggestionsDiv);
    this.scrollToBottom();
  }

  handleUserInput() {
    if (!this.chatInput || !this.chatMessages) return;

    const userText = this.chatInput.value.trim();
    if (!userText) return;

    // Clear input
    this.chatInput.value = '';

    // Remove any existing suggestions
    const existingSuggestions = this.chatMessages.querySelectorAll('.chat-suggestions');
    existingSuggestions.forEach(el => el.remove());

    // Add user message
    this.addUserMessage(userText);

    // Check for profanity
    if (this.checkProfanity(userText)) {
      this.showTypingIndicator();
      setTimeout(() => {
        this.removeTypingIndicator();
        this.addBotMessage(i18nService.t('trackie.profanity'));
      }, 500);
      return;
    }

    // Show typing indicator
    this.showTypingIndicator();

    // Find best match and respond
    setTimeout(() => {
      this.removeTypingIndicator();
      const response = this.findBestMatch(userText);
      this.addBotMessage(response);
    }, 500 + Math.random() * 500); // 500-1000ms delay for natural feel
  }

  addUserMessage(text) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble user';
    messageDiv.innerHTML = `<div class="bubble-content">${this.escapeHtml(text)}</div>`;
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  addBotMessage(text) {
    if (!this.chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-bubble bot';
    messageDiv.innerHTML = `
      <div class="bot-avatar">
        <img src="assets/new-bot-icon.png" alt="Trackie">
      </div>
      <div class="bubble-content">${this.formatMessage(text)}</div>
    `;
    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  showTypingIndicator() {
    if (!this.chatMessages) return;

    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-bubble bot typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
      <div class="bot-avatar">
        <img src="assets/new-bot-icon.png" alt="Trackie">
      </div>
      <div class="bubble-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
  }

  scrollToBottom() {
    if (this.chatMessages) {
      this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
  }

  // Fuzzy matching algorithm
  findBestMatch(userInput) {
    const tokens = this.tokenize(userInput);

    if (tokens.length === 0) {
      const key = this.fallbackKeys[Math.floor(Math.random() * this.fallbackKeys.length)];
      return i18nService.t(key);
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const qa of this.knowledgeBase) {
      let score = 0;

      // Check keyword matches
      for (const token of tokens) {
        for (const keyword of qa.keywords) {
          // Exact match
          if (keyword === token) {
            score += 10;
          }
          // Partial match (token contains keyword or vice versa)
          else if (keyword.includes(token) || token.includes(keyword)) {
            score += 5;
          }
          // Fuzzy match using Levenshtein distance
          else if (this.levenshteinDistance(keyword, token) <= 2) {
            score += 3;
          }
        }
      }

      // Check question text match
      const questionTokens = this.tokenize(qa.question);
      for (const token of tokens) {
        if (questionTokens.includes(token)) {
          score += 7;
        }
      }

      // Check answer text for additional context
      let answerText = qa.answer;
      if (Array.isArray(answerText)) {
        answerText = answerText.join(' ');
      }
      const answerTokens = this.tokenize(answerText);
      for (const token of tokens) {
        if (answerTokens.includes(token)) {
          score += 2;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = qa;
      }
    }

    // Return best match or fallback
    if (bestMatch && bestScore >= 5) {
      if (bestMatch.answerKey) {
        return i18nService.t(bestMatch.answerKey);
      }
      if (Array.isArray(bestMatch.answer)) {
        return bestMatch.answer[Math.floor(Math.random() * bestMatch.answer.length)];
      }
      return bestMatch.answer;
    } else {
      const key = this.fallbackKeys[Math.floor(Math.random() * this.fallbackKeys.length)];
      return i18nService.t(key);
    }
  }

  // Tokenize input: lowercase, remove punctuation, filter stop words
  // Enhanced for multi-language support (Chinese, Khmer, etc.)
  tokenize(text) {
    if (!text) return [];

    // Check if we have Intl.Segmenter support (modern browsers)
    // This is crucial for languages like Chinese and Khmer that don't use spaces consistently
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const currentLang = i18nService.getCurrentLanguage();
      // Use different granularity for different languages if needed
      const segmenter = new Intl.Segmenter(currentLang, { granularity: 'word' });
      const segments = segmenter.segment(text);

      const tokens = [];
      for (const { segment, isWordLike } of segments) {
        if (isWordLike) {
          const token = segment.toLowerCase();
          if (token.length > 0 && !this.stopWords.has(token)) {
            tokens.push(token);
          }
        }
      }

      // If we got tokens, return them.
      // Sometimes Segmenter might return empty for symbols, so checking length is good.
      if (tokens.length > 0) return tokens;
    }

    // Fallback or for languages that use spaces (en, fr, es, ru)
    // Using Unicode property escapes to handle all letters and numbers across scripts
    // \p{L} matches letters, \p{N} numbers, \p{M} combining marks (CRITICAL for Khmer/Thai/etc)
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0 && !this.stopWords.has(word));
  }

  // Levenshtein distance for typo tolerance
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;

    // Quick exit for short strings
    if (m === 0) return n;
    if (n === 0) return m;
    if (Math.abs(m - n) > 3) return 999; // Too different

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  }

  checkProfanity(text) {
    const badWords = ['fuck', 'shit', 'bitch', 'bastard', 'cunt', 'dick', 'cock', 'piss', 'whore', 'slut', 'asshole', 'motherfucker', 'wanker'];
    const lowerText = text.toLowerCase();
    return badWords.some(word => new RegExp(`\\b${word}\\b`, 'i').test(lowerText));
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatMessage(text) {
    // Convert newlines to <br> and escape HTML, but preserve contact links
    // First, temporarily replace contact links with a placeholder
    const linkPlaceholder = '___CONTACT_LINK___';
    const linkMatch = text.match(/<a href="#" class="contact-link">[^<]+<\/a>/g) || [];
    let processedText = text;

    linkMatch.forEach((link, i) => {
      processedText = processedText.replace(link, `${linkPlaceholder}${i}`);
    });

    // Escape HTML and convert newlines
    processedText = processedText
      .split('\n')
      .map(line => this.escapeHtml(line))
      .join('<br>');

    // Restore the contact links
    linkMatch.forEach((link, i) => {
      processedText = processedText.replace(`${linkPlaceholder}${i}`, link);
    });

    return processedText;
  }
}

export default new AssistantManager();