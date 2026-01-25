class LunarNewYearBackground {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.items = [];
        this.fireworks = [];
        this.animationId = null;
        this.itemCount = 40;
        this.lastFireworkTime = 0;
        this.textPoints = [];

        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'lunar-bg-canvas';
        this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1;';
        this.ctx = this.canvas.getContext('2d');

        document.body.insertBefore(this.canvas, document.body.firstChild);

        this.initTextPoints(); // Pre-calculate text positions

        this.resizeCanvas();
        this.createItems();

        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.initTextPoints(); // Recalculate on resize if needed (responsive font size)
        });
        this.animate();
    }

    initTextPoints() {
        // Create an off-screen canvas to sample text pixels
        const oc = document.createElement('canvas');
        const octx = oc.getContext('2d');
        const fontSize = Math.min(window.innerWidth / 10, 80); // Responsive font size

        oc.width = fontSize * 10; // Enough width for "HAPPY NEW YEAR"
        oc.height = fontSize * 2;

        octx.font = `bold ${fontSize}px Arial`;
        octx.fillStyle = '#000';
        octx.textAlign = 'center';
        octx.textBaseline = 'middle';
        octx.fillText("HAPPY NEW YEAR", oc.width / 2, oc.height / 2);

        const imageData = octx.getImageData(0, 0, oc.width, oc.height);
        this.textPoints = [];

        // Sample pixels
        // Step size 4 for performance (don't need every single pixel)
        for (let y = 0; y < oc.height; y += 4) {
            for (let x = 0; x < oc.width; x += 4) {
                if (imageData.data[(y * oc.width + x) * 4 + 3] > 128) {
                    this.textPoints.push({
                        x: x - oc.width / 2,
                        y: y - oc.height / 2
                    });
                }
            }
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        if (this.items.length === 0) {
            this.createItems();
        }
    }

    createItems() {
        this.items = [];
        for (let i = 0; i < this.itemCount; i++) {
            this.items.push(this.createItem());
        }
    }

    createItem() {
        const typeRoll = Math.random();
        let type = 'lantern';
        let size = Math.random() * 0.5 + 0.6; // Base size

        if (typeRoll > 0.90) {
            type = 'horse';
            size *= 1.2;
        }
        else if (typeRoll > 0.6) {
            type = 'coin';
            size *= 0.8;
        }

        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height - this.canvas.height,
            speed: Math.random() * 1.0 + 0.5,
            wiggle: Math.random() * 2,
            wiggleSpeed: Math.random() * 0.03 + 0.01,
            wiggleOffset: Math.random() * Math.PI * 2,
            size: size,
            type: type,
            opacity: Math.random() * 0.4 + 0.6,
            rotation: (Math.random() - 0.5) * 0.2
        };
    }

    createFirework(isText = false) {
        const x = isText ? this.canvas.width / 2 : Math.random() * (this.canvas.width * 0.8) + this.canvas.width * 0.1;
        const y = this.canvas.height;

        // Shoot higher: Target between 10% and 60% of screen height
        // If text, aim for center-ish (30%)
        const targetY = isText
            ? this.canvas.height * 0.3
            : Math.random() * (this.canvas.height * 0.5) + this.canvas.height * 0.1;

        const colors = ['#FF0000', '#FFD700', '#FF4500', '#FF1493', '#00FF7F', '#00FFFF'];
        const color = isText ? '#FFD700' : colors[Math.floor(Math.random() * colors.length)];

        return {
            x: x,
            y: y,
            targetY: targetY,
            color: color,
            speed: isText ? 15 : (7 + Math.random() * 5), // Text shoots faster
            particles: [],
            state: 'rising',
            type: isText ? 'text' : 'normal'
        };
    }

    createExplosion(firework) {
        if (firework.type === 'text') {
            // Text Explosion
            // Use random subset of text points if too many, or all if feasible
            // Limit to ~500 particles for performance? 
            // My sample step 4 might generate ~300-500 points depending on resolution. Use all.
            this.textPoints.forEach(pt => {
                firework.particles.push({
                    x: firework.x, // Start at center
                    y: firework.y,
                    // Target position relative to center
                    tx: pt.x,
                    ty: pt.y,
                    vx: (Math.random() - 0.5) * 10, // Initial explosion velocity (random)
                    vy: (Math.random() - 0.5) * 10,
                    alpha: 1,
                    decay: 0.005, // Slow fade for text
                    color: '#FFD700', // Gold text
                    isTextParticle: true,
                    lerp: 0 // Progress to target
                });
            });

        } else {
            // Normal Explosion
            const particleCount = 40 + Math.random() * 30;
            for (let i = 0; i < particleCount; i++) {
                const angle = (Math.PI * 2 / particleCount) * i;
                const velocity = 2 + Math.random() * 4;
                firework.particles.push({
                    x: firework.x,
                    y: firework.y,
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                    alpha: 1,
                    decay: 0.008 + Math.random() * 0.015,
                    color: firework.color,
                    trail: []
                });
            }
        }
    }

    drawLantern(ctx) {
        // Main body glow
        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 30);
        gradient.addColorStop(0, '#FF4D4D');
        gradient.addColorStop(0.6, '#E60000');
        gradient.addColorStop(1, '#8B0000');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, 28, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ribs 
        ctx.strokeStyle = 'rgba(100, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 32, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 9, 32, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Gold Caps
        const goldGradient = ctx.createLinearGradient(-18, 0, 18, 0);
        goldGradient.addColorStop(0, '#B8860B');
        goldGradient.addColorStop(0.5, '#FFD700');
        goldGradient.addColorStop(1, '#B8860B');

        ctx.fillStyle = goldGradient;
        ctx.fillRect(-18, -34, 36, 6);
        ctx.fillRect(-18, 29, 36, 6);

        // Hanger
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -34);
        ctx.lineTo(0, -45);
        ctx.stroke();

        // Tassels 
        ctx.strokeStyle = '#E60000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = -6; i <= 6; i += 3) {
            ctx.moveTo(i, 35);
            ctx.quadraticCurveTo(i * 1.5, 50, i * 0.5, 60 + Math.random() * 5);
        }
        ctx.stroke();

        // Text
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.fillText('福', 0, 0);
        ctx.shadowBlur = 0;
    }

    drawHorse(ctx) {
        // Gold Medallion
        ctx.shadowColor = '#DAA520';
        ctx.shadowBlur = 10;

        const rim = ctx.createRadialGradient(0, 0, 20, 0, 0, 25);
        rim.addColorStop(0, '#DAA520');
        rim.addColorStop(0.5, '#FFFACD');
        rim.addColorStop(1, '#B8860B');

        ctx.fillStyle = rim;
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const inner = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
        inner.addColorStop(0, '#D62828');
        inner.addColorStop(1, '#8B0000');
        ctx.fillStyle = inner;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px "Microsoft YaHei", "Kaiti", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('馬', 0, 1);
    }

    drawCoin(ctx) {
        const gradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 15);
        gradient.addColorStop(0, '#FFE87C');
        gradient.addColorStop(0.5, '#FFD700');
        gradient.addColorStop(1, '#B8860B');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        const s = 4;
        ctx.rect(-s, -s, s * 2, s * 2);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
    }

    drawItem(item) {
        this.ctx.save();
        this.ctx.globalAlpha = item.opacity;
        this.ctx.translate(item.x, item.y);

        const currentRotation = item.rotation + Math.sin(item.y * 0.01) * 0.1;
        this.ctx.rotate(currentRotation);

        this.ctx.scale(item.size, item.size);

        if (item.type === 'horse') {
            this.drawHorse(this.ctx);
        } else if (item.type === 'coin') {
            this.drawCoin(this.ctx);
        } else {
            this.drawLantern(this.ctx);
        }

        this.ctx.restore();
    }

    drawFirework(firework) {
        this.ctx.save();

        if (firework.state === 'rising') {
            this.ctx.fillStyle = firework.color;
            this.ctx.shadowColor = firework.color;
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2);
            this.ctx.fill();

            // Trail
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(firework.x, firework.y + 6, 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        } else if (firework.state === 'exploding') {
            firework.particles.forEach(p => {
                this.ctx.globalAlpha = p.alpha;
                this.ctx.fillStyle = p.color;

                // Extra sparkle for text particles
                if (p.isTextParticle) {
                    this.ctx.shadowColor = '#FFD700';
                    this.ctx.shadowBlur = 5 * Math.random();
                }

                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.isTextParticle ? 1.5 : 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        this.ctx.restore();
    }

    animate(timestamp) {
        if (!timestamp) timestamp = 0;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // --- Draw falling items ---
        this.items.forEach(item => {
            item.y += item.speed;
            item.x += Math.sin(item.y * item.wiggleSpeed + item.wiggleOffset) * 0.5;

            if (item.y > this.canvas.height + 100) {
                const newItem = this.createItem();
                Object.assign(item, newItem);
                item.y = -60;
            }
            this.drawItem(item);
        });

        // --- Firework Spawning ---
        // Normal random fireworks
        if (timestamp - this.lastFireworkTime > 1500 && Math.random() > 0.02) {
            // Occasional TEXT firework (5% chance if canvas wide enough)
            if (this.canvas.width > 600 && Math.random() < 0.05) {
                this.fireworks.push(this.createFirework(true));
            } else {
                this.fireworks.push(this.createFirework(false));
            }
            this.lastFireworkTime = timestamp;
        }

        // --- Firework Animation ---
        for (let i = this.fireworks.length - 1; i >= 0; i--) {
            const fw = this.fireworks[i];

            if (fw.state === 'rising') {
                fw.y -= fw.speed;
                fw.speed *= 0.98;

                if (fw.y <= fw.targetY || fw.speed < 1) {
                    fw.state = 'exploding';
                    this.createExplosion(fw);
                }
            } else if (fw.state === 'exploding') {
                let activeParticles = false;

                if (fw.type === 'text') {
                    // TEXT Particle Logic
                    fw.particles.forEach(p => {
                        // 1. Initial explosion drift (velocity decays)
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vx *= 0.9;
                        p.vy *= 0.9;

                        // 2. Attraction to target text position
                        // Target is (fw.x + p.tx, fw.targetY + p.ty)
                        const targetX = fw.x + p.tx;
                        const targetY = fw.targetY + p.ty;

                        // Lerp towards target
                        p.x += (targetX - p.x) * 0.1;
                        p.y += (targetY - p.y) * 0.1;

                        p.alpha -= p.decay;
                        if (p.alpha > 0) activeParticles = true;
                    });

                } else {
                    // NORMAL Particle Logic
                    fw.particles.forEach(p => {
                        p.x += p.vx;
                        p.y += p.vy;
                        p.vy += 0.05; // Gravity
                        p.vx *= 0.95;
                        p.vy *= 0.95;
                        p.alpha -= p.decay;
                        if (p.alpha > 0) activeParticles = true;
                    });
                }

                if (!activeParticles) {
                    this.fireworks.splice(i, 1);
                    continue;
                }
            }

            this.drawFirework(fw);
        }

        this.animationId = requestAnimationFrame((ts) => this.animate(ts));
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }
    }
}
