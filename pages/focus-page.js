import { ICONS } from '../utils/icons.js';
import { sanitizeInput } from '../utils/sanitizer.js';
import toastManager from '../ui/toast-manager.js';
import modalManager from '../ui/modal-manager.js';
import {
    collection,
    addDoc,
    deleteDoc,
    updateDoc,
    setDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { FIREBASE_PATHS } from '../utils/constants.js';

class FocusPage {
    constructor() {
        this.container = null;
        this.timeLeft = 25 * 60;
        this.totalTime = 25 * 60;
        this.interval = null;
        this.isRunning = false;
        this.mode = 'Focus';
        this.stats = { sessions: 0, minutes: 0, completed: 0 };
        this.tasks = [];
        this.soundOn = true;
        this.customTime = 25;
        this.circumference = 2 * Math.PI * 120; // r=120

        // Firebase
        this.db = null;
        this.userId = null;
        this.unsubscribeTasks = null;
        this.unsubscribeStats = null;

        // UI State
        this.showCompleted = false;
        this.quoteInterval = null;

        this.quotes = [
            "The secret of getting ahead is getting started.",
            "Focus on being productive instead of busy.",
            "Don't watch the clock; do what it does. Keep going.",
            "Success is the sum of small efforts repeated day in and day out.",
            "The future depends on what you do today.",
            "Concentrate all your thoughts upon the work in hand.",
            "You don't have to be great to start, but you have to start to be great.",
            "Action is the foundational key to all success.",
            "Believe you can and you're halfway there.",
            "Quality is not an act, it is a habit.",
            "It always seems impossible until it's done.",
            "Your limitation—it's only your imagination.",
            "Push yourself, because no one else is going to do it for you.",
            "Great things never come from comfort zones.",
            "Dream it. Wish it. Do it.",
            "Success doesn’t just find you. You have to go out and get it.",
            "The harder you work for something, the greater you’ll feel when you achieve it.",
            "Dream bigger. Do bigger.",
            "Don’t stop when you’re tired. Stop when you’re done.",
            "Wake up with determination. Go to bed with satisfaction."
        ];
    }

    initialize() {
        if (window.authService) {
            this.db = window.authService.db;
            this.userId = window.authService.userId;

            if (this.db && this.userId) {
                this.listenToTasks();
                this.listenToStats();
            }
        }
    }

    listenToStats() {
        if (!this.db || !this.userId) return;

        const docRef = doc(this.db, FIREBASE_PATHS.focusStats(this.userId));
        this.unsubscribeStats = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                this.stats.sessions = data.sessions || 0;
                this.stats.minutes = data.minutes || 0;
                this.updateStatsUI();
            }
        }, (error) => {
            console.error("Error loading focus stats:", error);
        });
    }

    listenToTasks() {
        if (!this.db || !this.userId) return;

        const q = query(
            collection(this.db, FIREBASE_PATHS.tasks(this.userId)),
            orderBy('createdAt', 'desc')
        );

        this.unsubscribeTasks = onSnapshot(q, (snapshot) => {
            this.tasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            this.refreshTaskList();
            this.updateStats(); // Recalculate stats based on loaded data
        }, (error) => {
            console.error("Error loading tasks:", error);
            toastManager.error("Failed to load tasks.");
        });
    }

    cleanup() {
        if (this.unsubscribeTasks) {
            this.unsubscribeTasks();
            this.unsubscribeTasks = null;
        }
        if (this.unsubscribeStats) {
            this.unsubscribeStats();
            this.unsubscribeStats = null;
        }
        if (this.quoteInterval) {
            clearInterval(this.quoteInterval);
            this.quoteInterval = null;
        }
    }

    render() {
        this.container = document.getElementById('focus-content');
        if (!this.container) return;

        // Re-initialize if missing (e.g. reload)
        if (!this.db && window.authService) {
            this.initialize();
        }

        this.container.innerHTML = `
            <div class="focus-grid">
                <div class="timer-section">
                    <!-- Quote at Top -->
                    <div class="quote-card-top">
                        <p id="quote-text-top">"${this.quotes[0]}"</p>
                    </div>

                    <!-- 3-Way Toggle Switch with Glider -->
                    <div class="focus-toggle-container" style="--toggle-index: 0">
                        <div class="toggle-glider"></div>
                        <button class="focus-toggle-btn ${this.mode === 'Focus' ? 'active' : ''}" data-mode="Focus" data-time="25" data-index="0">Focus</button>
                        <button class="focus-toggle-btn ${this.mode === 'Short Break' ? 'active' : ''}" data-mode="Short Break" data-time="5" data-index="1">Short Break</button>
                        <button class="focus-toggle-btn ${this.mode === 'Long Break' ? 'active' : ''}" data-mode="Long Break" data-time="15" data-index="2">Long Break</button>
                    </div>

                    <div class="timer-container-circle">
                        <svg class="progress-ring" width="300" height="300">
                            <circle class="progress-ring__circle-bg" stroke="var(--light-grey)" stroke-width="8" fill="transparent" r="120" cx="150" cy="150"/>
                            <circle class="progress-ring__circle" stroke="var(--primary)" stroke-width="8" fill="transparent" r="120" cx="150" cy="150"/>
                        </svg>
                        <div class="time-value-overlay">
                            <div id="timer-display" class="timer-text-large">${this.formatTime(this.timeLeft)}</div>
                            <div class="status-text-small" id="timer-status">${this.isRunning ? 'Focusing...' : 'Ready'}</div>
                        </div>
                    </div>

                    <div class="timer-controls">
                        <button class="btn btn-primary control-btn-large" id="start-btn">${this.isRunning ? 'Pause' : 'Start'}</button>
                        <button class="btn btn-secondary control-btn-large" id="reset-btn">Reset</button>
                        <button class="icon-btn-small" id="sound-toggle" title="Toggle Sound">
                            ${this.soundOn ? ICONS.BELL : ICONS.BELL_OFF}
                        </button>
                    </div>

                    <div class="custom-time-input">
                        <span>Custom (min):</span>
                        <input type="number" id="custom-min" value="${this.customTime}" min="1" max="120" class="mini-input">
                        <button class="btn-small" id="set-custom-btn">Set</button>
                    </div>
                </div>

                <div class="focus-sidebar">
                    <div class="focus-card">
                        <div class="card-title">Session Stats</div>
                        <div class="focus-stats-grid">
                            <div class="stat-item">
                                <div class="stat-val" id="stat-sessions">${this.stats.sessions}</div>
                                <div class="stat-lbl">Sessions</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-val" id="stat-minutes">${this.stats.minutes}</div>
                                <div class="stat-lbl">Minutes</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-val" id="stat-completed">${this.stats.completed}</div>
                                <div class="stat-lbl">Tasks Done</div>
                            </div>
                        </div>
                    </div>

                    <!-- Input Card -->
                    <div class="focus-card">
                        <div class="card-title">Add Task</div>
                        <div class="task-input-wrap">
                            <input type="text" class="task-input" id="task-input" placeholder="What's on your mind?">
                            <button class="btn-icon-only" id="add-task-btn" title="Add Task">${ICONS.PLUS}</button>
                        </div>
                    </div>
                    
                    <!-- Task Controls -->
                    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
                        <button class="btn-text-only" id="toggle-completed-btn" style="color: var(--grey-text); font-size: 14px; background: none; border: none; cursor: pointer;">
                            ${this.showCompleted ? 'Hide Completed' : 'Show Completed'}
                        </button>
                    </div>

                    <!-- Separate Task Cards -->
                    <div id="focus-task-list" class="focus-task-container">
                        ${this.renderTaskList()}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();

        // Initialize ring
        const circle = this.container.querySelector('.progress-ring__circle');
        if (circle) {
            circle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
            circle.style.strokeDashoffset = this.circumference;
            this.updateDisplay(); // Init initial state
        }

        this.startQuoteRotation();
    }

    bindEvents() {
        // Mode switching (Refined 3-way toggle w/ Glider)
        this.container.querySelectorAll('.focus-toggle-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                const time = parseInt(e.target.dataset.time);
                const index = parseInt(e.target.dataset.index);
                this.setMode(time, mode, index);
            });
        });

        // Controls
        const startBtn = document.getElementById('start-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.toggleTimer());

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

        // Sound toggle
        const soundBtn = document.getElementById('sound-toggle');
        if (soundBtn) soundBtn.addEventListener('click', () => {
            this.soundOn = !this.soundOn;
            soundBtn.innerHTML = this.soundOn ? ICONS.BELL : ICONS.BELL_OFF;
        });

        // Custom time
        const setCustomBtn = document.getElementById('set-custom-btn');
        if (setCustomBtn) setCustomBtn.addEventListener('click', () => {
            const input = document.getElementById('custom-min');
            const min = parseInt(input.value);
            if (min > 0 && min <= 180) {
                this.customTime = min;
                this.setMode(min, 'Custom');
            } else {
                toastManager.info('Please enter a time between 1 and 180 minutes.');
            }
        });

        // Tasks
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) addTaskBtn.addEventListener('click', () => this.addTask());

        const taskInput = document.getElementById('task-input');
        if (taskInput) taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Show/Hide Completed
        const toggleBtn = document.getElementById('toggle-completed-btn');
        if (toggleBtn) toggleBtn.addEventListener('click', () => {
            this.showCompleted = !this.showCompleted;
            toggleBtn.textContent = this.showCompleted ? 'Hide Completed' : 'Show Completed';
            this.refreshTaskList();
        });

        // Task list delegation
        const list = document.getElementById('focus-task-list');
        if (list) list.addEventListener('click', (e) => {
            const item = e.target.closest('.focus-task-card');
            if (!item) return;
            const id = item.dataset.id; // String ID from Firestore

            if (e.target.closest('.task-checkbox')) {
                this.toggleTask(id);
            } else if (e.target.closest('.delete-task-btn')) {
                this.deleteTask(id);
            }
        });
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    setMode(min, modeName, index = 0) {
        if (this.isRunning) this.stopTimer();
        this.mode = modeName;
        this.timeLeft = min * 60;
        this.totalTime = min * 60;

        this.updateDisplay();
        this.updateStatus('Ready');

        // Update slider position
        const container = this.container.querySelector('.focus-toggle-container');
        if (container && index !== undefined) {
            container.style.setProperty('--toggle-index', index);
        } else if (container) {
            // Fallback if index not provided (e.g. from custom default)
            const btn = container.querySelector(`[data-mode="${modeName}"]`);
            if (btn) {
                container.style.setProperty('--toggle-index', btn.dataset.index);
            }
        }

        // Update active buttons
        const modes = this.container.querySelectorAll('.focus-toggle-btn');
        modes.forEach(b => {
            b.classList.toggle('active', b.dataset.mode === modeName);
            // Custom mode clears active state visual on buttons so they don't conflict with slider
            if (modeName === 'Custom') b.classList.remove('active');
        });
    }

    updateDisplay() {
        const display = document.getElementById('timer-display');
        if (display) display.textContent = this.formatTime(this.timeLeft);

        const circle = this.container.querySelector('.progress-ring__circle');
        if (circle) {
            const offset = this.circumference - (this.timeLeft / this.totalTime) * this.circumference;
            circle.style.strokeDashoffset = offset;
        }


    }

    updateStatus(text) {
        const status = document.getElementById('timer-status');
        if (status) status.textContent = text;
    }

    toggleTimer() {
        if (this.isRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
    }

    startTimer() {
        this.isRunning = true;
        document.getElementById('start-btn').textContent = 'Pause';
        this.updateStatus('Keep Focus');

        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    stopTimer() {
        this.isRunning = false;
        clearInterval(this.interval);
        const btn = document.getElementById('start-btn');
        if (btn) btn.textContent = 'Start';
        this.updateStatus('Paused');

    }

    resetTimer() {
        this.stopTimer();
        this.timeLeft = this.totalTime;
        this.updateDisplay();
        this.updateStatus('Ready');
    }

    completeSession() {
        this.stopTimer();

        if (this.mode === 'Focus' || this.mode === 'Custom') {
            const extraMins = Math.floor(this.totalTime / 60);
            this.saveFocusStats(extraMins);
        }

        if (this.soundOn) this.playBeep();

        const msg = this.mode === 'Focus' || this.mode === 'Custom' ? 'Time for a break!' : 'Ready to focus again?';
        this.updateStatus('Session Done');
        toastManager.success(msg);

        if (Notification.permission === 'granted') {
            new Notification('Focus Timer', { body: msg, icon: 'assets/att-logo.png' });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }

    async saveFocusStats(extraMins) {
        if (!this.db || !this.userId) return;

        try {
            await setDoc(doc(this.db, FIREBASE_PATHS.focusStats(this.userId)), {
                sessions: (this.stats.sessions || 0) + 1,
                minutes: (this.stats.minutes || 0) + extraMins,
                updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Error saving focus stats:", e);
        }
    }

    updateStats() {
        // Calculate completed from loaded tasks
        const completedCount = this.tasks.filter(t => t.done).length;
        this.stats.completed = completedCount;
        this.updateStatsUI();
    }

    updateStatsUI() {
        const sess = document.getElementById('stat-sessions');
        const mins = document.getElementById('stat-minutes');
        const comp = document.getElementById('stat-completed');

        if (sess) sess.textContent = this.stats.sessions;
        if (mins) mins.textContent = this.stats.minutes;
        if (comp) comp.textContent = this.stats.completed;
    }

    playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800; // Hz
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    showRandomQuote() {
        const quote = this.quotes[Math.floor(Math.random() * this.quotes.length)];
        const el = document.getElementById('quote-text-top');
        if (el) {
            // Simple fade effect
            el.style.opacity = '0';
            setTimeout(() => {
                el.textContent = `"${quote}"`;
                el.style.opacity = '1';
            }, 300);
        }
    }

    startQuoteRotation() {
        if (this.quoteInterval) clearInterval(this.quoteInterval);

        // Show one immediately (already handled in setMode or random call, but good to ensure)
        // this.showRandomQuote(); 

        // Rotate every 60 seconds
        this.quoteInterval = setInterval(() => {
            this.showRandomQuote();
        }, 60000);
    }

    // Task Methods
    async addTask() {
        const input = document.getElementById('task-input');
        const text = input.value.trim();
        if (!text) return;

        if (!this.db || !this.userId) {
            toastManager.error("Please sign in to save tasks.");
            return;
        }

        try {
            await addDoc(collection(this.db, FIREBASE_PATHS.tasks(this.userId)), {
                text,
                done: false,
                createdAt: serverTimestamp()
            });
            input.value = '';
            // No need to manually adding to list, onSnapshot will handle it
        } catch (e) {
            console.error("Add task error:", e);
            toastManager.error("Failed to add task.");
        }
    }

    async toggleTask(id) {
        if (!this.db || !this.userId) return;

        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        try {
            await updateDoc(doc(this.db, FIREBASE_PATHS.taskDoc(this.userId, id)), {
                done: !task.done
            });
        } catch (e) {
            console.error("Toggle task error:", e);
            toastManager.error("Failed to update task.");
        }
    }

    async deleteTask(id) {
        if (!this.db || !this.userId) return;

        const confirmed = await modalManager.confirm('Delete Task', 'Are you sure you want to delete this task?');
        if (!confirmed) return;

        try {
            await deleteDoc(doc(this.db, FIREBASE_PATHS.taskDoc(this.userId, id)));
        } catch (e) {
            console.error("Delete task error:", e);
            toastManager.error("Failed to delete task.");
        }
    }

    refreshTaskList() {
        const list = document.getElementById('focus-task-list');
        if (list) list.innerHTML = this.renderTaskList();
    }

    renderTaskList() {
        let visibleTasks = this.tasks;

        if (!this.showCompleted) {
            visibleTasks = visibleTasks.filter(t => !t.done);
        }

        if (visibleTasks.length === 0) {
            if (this.tasks.length > 0 && !this.showCompleted) {
                return `<li class="focus-task-msg empty-task-msg">All tasks completed! Click "Show Completed" to see them.</li>`;
            }
            return `<li class="focus-task-msg empty-task-msg">No tasks yet. Add one to focus on!</li>`;
        }

        return visibleTasks.map(t => `
            <div class="focus-task-card ${t.done ? 'completed' : ''}" data-id="${t.id}">
                <div class="task-checkbox" role="button">
                    ${t.done ? ICONS.CHECK : ''}
                </div>
                <div class="task-text">${sanitizeInput(t.text)}</div>
                <button class="delete-task-btn" title="Delete">${ICONS.CLOSE}</button>
            </div>
        `).join('');
    }
}

export default new FocusPage();
