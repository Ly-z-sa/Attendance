// ui/click-effect-manager.js
import { CLICK_EFFECTS } from '../utils/constants.js';

class ClickEffectManager {
    constructor() {
        this.currentEffect = 'spark';
        this.effectInstance = null;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.animationId = null;
    }

    initialize() {
        this.currentEffect = localStorage.getItem('clickEffect') || 'spark';
        this.applyEffect(this.currentEffect);
        this.setupPersonalizationListener();
    }

    setupPersonalizationListener() {
        const clickEffectDropdown = document.getElementById('click-effect-dropdown');
        if (clickEffectDropdown) {
            clickEffectDropdown.addEventListener('change', (e) => {
                this.applyEffect(e.currentTarget.dataset.value);
            });
        }
    }

    applyEffect(effect) {
        this.currentEffect = effect;
        localStorage.setItem('clickEffect', effect);

        // Cleanup previous effect
        this.cleanup();

        // Apply new effect
        if (effect !== 'none') {
            this.initCanvas();
            this.bindClickHandler();
        }

        // Update dropdown display if exists
        const display = document.getElementById('click-effect-display');
        if (display) {
            display.textContent = CLICK_EFFECTS[effect] || 'Spark ✨';
        }
    }

    initCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999;';
        this.ctx = this.canvas.getContext('2d');
        document.body.appendChild(this.canvas);
        this.resizeCanvas();

        window.addEventListener('resize', () => this.resizeCanvas());
        this.animate();
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
    }

    bindClickHandler() {
        this.clickHandler = (e) => this.handleClick(e);
        document.addEventListener('click', this.clickHandler);
    }

    handleClick(e) {
        const x = e.clientX;
        const y = e.clientY;

        switch (this.currentEffect) {
            case 'spark':
                this.createSparks(x, y);
                break;
            case 'ripple':
                this.createRipple(x, y);
                break;
            case 'confetti':
                this.createConfetti(x, y);
                break;
            case 'hearts':
                this.createHearts(x, y);
                break;
        }
    }

    createSparks(x, y) {
        const sparkCount = 10;
        const sparkColor = '#CD853F';
        for (let i = 0; i < sparkCount; i++) {
            this.particles.push({
                type: 'spark',
                x, y,
                angle: (2 * Math.PI * i) / sparkCount,
                startTime: performance.now(),
                duration: 500,
                color: sparkColor,
                radius: 20,
                size: 12
            });
        }
    }

    createRipple(x, y) {
        this.particles.push({
            type: 'ripple',
            x, y,
            startTime: performance.now(),
            duration: 600,
            maxRadius: 50,
            color: 'rgba(70, 130, 180, 0.6)'
        });
    }

    createConfetti(x, y) {
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da'];
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                type: 'confetti',
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: Math.random() * -8 - 4,
                gravity: 0.3,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.4,
                startTime: performance.now(),
                duration: 1200,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 4
            });
        }
    }

    createHearts(x, y) {
        const colors = ['#ff6b6b', '#ff8787', '#ffa8a8', '#e64980'];
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                type: 'heart',
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * -3 - 2,
                startTime: performance.now(),
                duration: 1000,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 12 + 8
            });
        }
    }

    animate() {
        if (!this.ctx) return;

        const timestamp = performance.now();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles = this.particles.filter(p => {
            const elapsed = timestamp - p.startTime;
            if (elapsed >= p.duration) return false;

            const progress = elapsed / p.duration;

            switch (p.type) {
                case 'spark':
                    this.drawSpark(p, progress);
                    break;
                case 'ripple':
                    this.drawRipple(p, progress);
                    break;
                case 'confetti':
                    this.drawConfetti(p, progress, elapsed);
                    break;
                case 'heart':
                    this.drawHeart(p, progress, elapsed);
                    break;
            }

            return true;
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    drawSpark(p, progress) {
        const eased = progress * (2 - progress);
        const distance = eased * p.radius;
        const lineLength = p.size * (1 - eased);

        const x1 = p.x + distance * Math.cos(p.angle);
        const y1 = p.y + distance * Math.sin(p.angle);
        const x2 = p.x + (distance + lineLength) * Math.cos(p.angle);
        const y2 = p.y + (distance + lineLength) * Math.sin(p.angle);

        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawRipple(p, progress) {
        const radius = progress * p.maxRadius;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 3 * (1 - progress);
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }

    drawConfetti(p, progress, elapsed) {
        const dt = 16;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.rotation);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = 1 - progress;
        this.ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        this.ctx.restore();
        this.ctx.globalAlpha = 1;
    }

    drawHeart(p, progress, elapsed) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;

        const size = p.size * (1 - progress * 0.5);

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = 1 - progress;

        this.ctx.beginPath();
        this.ctx.moveTo(0, size / 4);
        this.ctx.bezierCurveTo(-size / 2, -size / 4, -size, size / 4, 0, size);
        this.ctx.bezierCurveTo(size, size / 4, size / 2, -size / 4, 0, size / 4);
        this.ctx.fill();

        this.ctx.restore();
        this.ctx.globalAlpha = 1;
    }

    getEffect() {
        return this.currentEffect;
    }

    getEffectName(effect = this.currentEffect) {
        return CLICK_EFFECTS[effect] || 'Spark ✨';
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
            this.ctx = null;
        }
        this.particles = [];
    }
}

export default new ClickEffectManager();
