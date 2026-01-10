class ParticlesBackground {
    constructor() {
        try {
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none;';
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Canvas 2D context not supported');
            }
            
            this.particles = [];
            this.mouse = { x: null, y: null, radius: 150 };

            document.body.appendChild(this.canvas);

            this.resizeCanvas();
            this.initParticles();

            this.resizeHandler = () => {
                this.resizeCanvas();
                this.initParticles();
            };

            this.mousemoveHandler = (e) => {
                this.mouse.x = e.x;
                this.mouse.y = e.y;
            };

            window.addEventListener('resize', this.resizeHandler);
            window.addEventListener('mousemove', this.mousemoveHandler);

            this.animate();
        } catch (error) {
            console.error('ParticlesBackground initialization failed:', error);
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initParticles() {
        this.particles = [];
        let numberOfParticles = (this.canvas.width * this.canvas.height) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            const size = (Math.random() * 3) + 1;
            const x = (Math.random() * ((this.canvas.width - size * 2) - (size * 2)) + size * 2);
            const y = (Math.random() * ((this.canvas.height - size * 2) - (size * 2)) + size * 2);
            const directionX = (Math.random() * 2) - 1;
            const directionY = (Math.random() * 2) - 1;
            const color = 'rgba(255, 255, 255, 0.5)';

            this.particles.push({ x, y, directionX, directionY, size, color });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw background gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a2a6c');
        gradient.addColorStop(0.5, '#b21f1f');
        gradient.addColorStop(1, '#fdbb2d');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            let p = this.particles[i];

            // Update position
            if (p.x > this.canvas.width || p.x < 0) {
                p.directionX = -p.directionX;
            }
            if (p.y > this.canvas.height || p.y < 0) {
                p.directionY = -p.directionY;
            }

            // Mouse interaction
            if (this.mouse.x !== null && this.mouse.y !== null) {
                let dx = this.mouse.x - p.x;
                let dy = this.mouse.y - p.y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.mouse.radius + p.size) {
                    if (this.mouse.x < p.x && p.x < this.canvas.width - p.size * 10) {
                        p.x += 2;
                    }
                    if (this.mouse.x > p.x && p.x > p.size * 10) {
                        p.x -= 2;
                    }
                    if (this.mouse.y < p.y && p.y < this.canvas.height - p.size * 10) {
                        p.y += 2;
                    }
                    if (this.mouse.y > p.y && p.y > p.size * 10) {
                        p.y -= 2;
                    }
                }
            }

            p.x += p.directionX;
            p.y += p.directionY;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2, false);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();

            // Draw lines
            this.connect(i);
        }
    }

    connect(a) {
        for (let b = a; b < this.particles.length; b++) {
            let distance = ((this.particles[a].x - this.particles[b].x) * (this.particles[a].x - this.particles[b].x))
                + ((this.particles[a].y - this.particles[b].y) * (this.particles[a].y - this.particles[b].y));

            if (distance < (this.canvas.width / 7) * (this.canvas.height / 7)) {
                let opacityValue = 1 - (distance / 20000);
                this.ctx.strokeStyle = 'rgba(255, 255, 255,' + opacityValue + ')';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
                this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
                this.ctx.stroke();
            }
        }
    }

    animate() {
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('mousemove', this.mousemoveHandler);
    }
}

class MatrixBackground {
    constructor() {
        try {
            this.canvas = document.createElement('canvas');
            this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none;';
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Canvas 2D context not supported');
            }

            document.body.appendChild(this.canvas);

            this.resizeCanvas();
            this.initMatrix();

            this.resizeHandler = () => {
                this.resizeCanvas();
                this.initMatrix();
            };

            window.addEventListener('resize', this.resizeHandler);
            this.animate();
        } catch (error) {
            console.error('MatrixBackground initialization failed:', error);
        }
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    initMatrix() {
        this.characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        this.fontSize = 16;
        this.columns = this.canvas.width / this.fontSize;
        this.drops = [];

        for (let x = 0; x < this.columns; x++) {
            this.drops[x] = 1;
        }
    }

    draw() {
        // Translucent black background to create trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#0F0'; // Green text
        this.ctx.font = this.fontSize + 'px monospace';

        for (let i = 0; i < this.drops.length; i++) {
            const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
            this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

            if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
                this.drops[i] = 0;
            }

            this.drops[i]++;
        }
    }

    animate() {
        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
        window.removeEventListener('resize', this.resizeHandler);
    }
}
