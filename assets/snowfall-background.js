// assets/snowfall-background.js
class SnowfallBackground {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.snowflakes = [];
        this.animationId = null;
        this.snowflakeCount = 100;

        this.init();
    }

    init() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'snowfall-canvas';
        this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 0;';
        this.ctx = this.canvas.getContext('2d');

        // Insert at the very beginning of body
        document.body.insertBefore(this.canvas, document.body.firstChild);

        this.resizeCanvas();
        this.createSnowflakes();

        window.addEventListener('resize', () => this.resizeCanvas());
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Recreate snowflakes on resize
        if (this.snowflakes.length === 0) {
            this.createSnowflakes();
        }
    }

    createSnowflakes() {
        this.snowflakes = [];
        for (let i = 0; i < this.snowflakeCount; i++) {
            this.snowflakes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 4 + 1,
                speed: Math.random() * 2 + 0.5,
                wind: Math.random() * 1 - 0.5,
                opacity: Math.random() * 0.7 + 0.3,
                type: Math.random() > 0.7 ? 'star' : 'circle'
            });
        }
    }

    drawSnowflake(flake) {
        this.ctx.save();
        this.ctx.globalAlpha = flake.opacity;
        this.ctx.fillStyle = '#fff';

        if (flake.type === 'star') {
            // Draw a small star/sparkle
            this.ctx.beginPath();
            const spikes = 4;
            const outerRadius = flake.radius;
            const innerRadius = flake.radius * 0.5;

            for (let i = 0; i < spikes * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI) / spikes - Math.PI / 2;
                const x = flake.x + radius * Math.cos(angle);
                const y = flake.y + radius * Math.sin(angle);

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }

            this.ctx.closePath();
            this.ctx.fill();
        } else {
            // Draw a circle
            this.ctx.beginPath();
            this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Batch drawing operations
        this.ctx.fillStyle = '#fff';
        
        this.snowflakes.forEach(flake => {
            // Update position
            flake.y += flake.speed;
            flake.x += flake.wind;

            // Add slight wobble using pre-calculated offset
            flake.x += Math.sin(flake.y * 0.02) * 0.5;

            // Reset snowflake if it goes off screen
            if (flake.y > this.canvas.height + 10) {
                flake.y = -10;
                flake.x = flake.x % this.canvas.width;
            }

            if (flake.x > this.canvas.width + 10) {
                flake.x = -10;
            } else if (flake.x < -10) {
                flake.x = this.canvas.width + 10;
            }

            // Draw snowflake with minimal state changes
            this.ctx.globalAlpha = flake.opacity;
            this.ctx.beginPath();
            this.ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalAlpha = 1;
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    // amazonq-ignore-next-line
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        if (this.canvas) {
            this.canvas.remove();
            this.canvas = null;
        }

        this.snowflakes = [];
    }
}
