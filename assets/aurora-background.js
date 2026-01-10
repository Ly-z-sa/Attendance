// assets/aurora-background.js
class AuroraBackground {
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
      this.resizeHandler = () => this.resizeCanvas();
      window.addEventListener('resize', this.resizeHandler);

      // Initialize stars
      this.stars = [];
      this.initStars();

      this.animate();
    } catch (error) {
      console.error('Aurora background initialization failed:', error);
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initStars();
  }

  initStars() {
    this.stars = [];
    const count = Math.min(150, Math.floor((this.canvas.width * this.canvas.height) / 10000));

    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.6,
        size: Math.random() * 2 + 0.5,
        twinkleSpeed: Math.random() * 3 + 1,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() * 0.001;

    // Night sky gradient
    const sky = this.ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#000510');
    sky.addColorStop(0.3, '#051025');
    sky.addColorStop(0.7, '#0a1a35');
    sky.addColorStop(1, '#0d2040');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, w, h);

    // Draw twinkling stars
    this.drawStars(time);

    // Aurora layers - horizontal waves flowing across the sky
    this.drawAuroraWave(time, h * 0.15, '#00ff88', 0.12, 0);
    this.drawAuroraWave(time * 0.8 + 2, h * 0.25, '#00aaff', 0.10, 1);
    this.drawAuroraWave(time * 0.6 + 4, h * 0.10, '#aa44ff', 0.08, 2);
    this.drawAuroraWave(time * 1.1 + 1, h * 0.20, '#00ffaa', 0.09, 3);
  }

  drawStars(time) {
    this.stars.forEach(star => {
      const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5 + 0.5;
      const alpha = 0.3 + twinkle * 0.7;

      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.fill();

      // Star glow for larger stars
      if (star.size > 1.5) {
        const glow = this.ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 4);
        glow.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.3})`);
        glow.addColorStop(1, 'transparent');
        this.ctx.fillStyle = glow;
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });
  }

  drawAuroraWave(time, yBase, color, baseAlpha, layerIndex) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    // Create horizontal flowing aurora ribbons
    const ribbonHeight = 80 + Math.sin(time * 0.3 + layerIndex) * 30;

    // Gradient for the aurora ribbon (vertical fade)
    const gradient = this.ctx.createLinearGradient(0, yBase - ribbonHeight, 0, yBase + ribbonHeight);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, color + '60');
    gradient.addColorStop(0.5, color + '90');
    gradient.addColorStop(0.7, color + '60');
    gradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = gradient;
    this.ctx.globalAlpha = baseAlpha;

    // Draw the wavy ribbon shape - flowing HORIZONTALLY
    this.ctx.beginPath();

    const segments = 100;

    // Top edge of ribbon - waves flowing left to right
    this.ctx.moveTo(0, h);
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * w;

      // Multiple sine waves for organic look - horizontal flow
      const wave1 = Math.sin(x * 0.005 + time * 0.5) * 40;
      const wave2 = Math.sin(x * 0.01 - time * 0.3) * 25;
      const wave3 = Math.sin(x * 0.003 + time * 0.2) * 60;

      const y = yBase + wave1 + wave2 + wave3;

      if (i === 0) {
        this.ctx.moveTo(x, y - ribbonHeight);
      } else {
        this.ctx.lineTo(x, y - ribbonHeight);
      }
    }

    // Bottom edge of ribbon
    for (let i = segments; i >= 0; i--) {
      const x = (i / segments) * w;

      const wave1 = Math.sin(x * 0.005 + time * 0.5) * 40;
      const wave2 = Math.sin(x * 0.01 - time * 0.3) * 25;
      const wave3 = Math.sin(x * 0.003 + time * 0.2) * 60;

      const y = yBase + wave1 + wave2 + wave3;

      this.ctx.lineTo(x, y + ribbonHeight);
    }

    this.ctx.closePath();
    this.ctx.fill();

    // Add glow effect
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 30;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.restore();
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