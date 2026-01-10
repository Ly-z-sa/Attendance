// assets/prism-background.js
class PrismBackground {
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

    // Initialize prism crystals
    this.crystals = [];
    this.initCrystals();

      this.animate();
    } catch (error) {
      console.error('PrismBackground initialization failed:', error);
    }
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.initCrystals();
  }

  initCrystals() {
    this.crystals = [];
    const count = Math.min(15, Math.floor(this.canvas.width / 100));

    for (let i = 0; i < count; i++) {
      this.crystals.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 80 + 40,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.01,
        hue: Math.random() * 360,
        opacity: Math.random() * 0.15 + 0.05,
        sides: Math.floor(Math.random() * 3) + 3, // 3-5 sides
        floatOffset: Math.random() * Math.PI * 2,
        floatSpeed: Math.random() * 0.5 + 0.5
      });
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() * 0.001;

    // Deep space gradient background
    const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(0.5, '#0d0618');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    // Ambient light beams
    this.drawLightBeams(w, h, time);

    // Draw floating crystals
    this.crystals.forEach((crystal, i) => {
      crystal.rotation += crystal.rotationSpeed;
      const floatY = Math.sin(time * crystal.floatSpeed + crystal.floatOffset) * 20;

      this.drawCrystal(
        crystal.x,
        crystal.y + floatY,
        crystal.size,
        crystal.sides,
        crystal.rotation,
        crystal.hue + time * 10,
        crystal.opacity
      );
    });

    // Central prism with rainbow refraction
    this.drawMainPrism(w / 2, h / 2, time);
  }

  drawLightBeams(w, h, time) {
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + time * 0.1;
      const gradient = this.ctx.createLinearGradient(
        w / 2, h / 2,
        w / 2 + Math.cos(angle) * w,
        h / 2 + Math.sin(angle) * h
      );

      const hue = (i * 72 + time * 20) % 360;
      gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.1)`);
      gradient.addColorStop(0.5, `hsla(${hue}, 100%, 50%, 0.03)`);
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.moveTo(w / 2, h / 2);
      this.ctx.lineTo(w / 2 + Math.cos(angle - 0.2) * w, h / 2 + Math.sin(angle - 0.2) * h);
      this.ctx.lineTo(w / 2 + Math.cos(angle + 0.2) * w, h / 2 + Math.sin(angle + 0.2) * h);
      this.ctx.closePath();
      this.ctx.fill();
    }

    this.ctx.globalCompositeOperation = 'source-over';
  }

  drawCrystal(x, y, size, sides, rotation, hue, opacity) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(rotation);

    // Crystal body with gradient
    const gradient = this.ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, ${opacity})`);
    gradient.addColorStop(0.5, `hsla(${hue + 30}, 80%, 70%, ${opacity * 1.5})`);
    gradient.addColorStop(1, `hsla(${hue + 60}, 70%, 50%, ${opacity})`);

    this.ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size / 2;
      const py = Math.sin(angle) * size / 2;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();

    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Crystal edge glow
    this.ctx.strokeStyle = `hsla(${hue}, 100%, 80%, ${opacity * 2})`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawMainPrism(x, y, time) {
    const size = 120;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(time * 0.2);

    // Main triangle prism
    const h = size * Math.sqrt(3) / 2;

    // Prism faces with different colors
    const faces = [
      { start: 0, color1: 'rgba(255, 0, 128, 0.2)', color2: 'rgba(128, 0, 255, 0.1)' },
      { start: Math.PI * 2 / 3, color1: 'rgba(0, 255, 255, 0.2)', color2: 'rgba(0, 128, 255, 0.1)' },
      { start: Math.PI * 4 / 3, color1: 'rgba(255, 255, 0, 0.2)', color2: 'rgba(255, 128, 0, 0.1)' }
    ];

    faces.forEach(face => {
      this.ctx.save();
      this.ctx.rotate(face.start);

      const gradient = this.ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gradient.addColorStop(0, face.color1);
      gradient.addColorStop(1, face.color2);

      this.ctx.beginPath();
      this.ctx.moveTo(0, -h * 0.6);
      this.ctx.lineTo(-size / 2, h * 0.4);
      this.ctx.lineTo(size / 2, h * 0.4);
      this.ctx.closePath();

      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.restore();
    });

    // Inner glow
    const innerGlow = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.8);
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    innerGlow.addColorStop(0.5, 'rgba(200, 200, 255, 0.1)');
    innerGlow.addColorStop(1, 'transparent');

    this.ctx.fillStyle = innerGlow;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    this.ctx.fill();

    // Edge highlights
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -h * 0.6);
    this.ctx.lineTo(-size / 2, h * 0.4);
    this.ctx.lineTo(size / 2, h * 0.4);
    this.ctx.closePath();
    this.ctx.stroke();

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