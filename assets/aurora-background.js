class AuroraBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none;';
    this.ctx = this.canvas.getContext('2d');

    document.body.appendChild(this.canvas);

    this.resizeCanvas();
    this.resizeHandler = () => this.resizeCanvas();
    window.addEventListener('resize', this.resizeHandler);

    this.animate();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const time = Date.now() * 0.001;

    this.ctx.clearRect(0, 0, w, h);

    // Night sky gradient
    const sky = this.ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#000000');
    sky.addColorStop(1, '#0c1c2e');
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 132.1) * 43758.5453) % w;
      const y = (Math.cos(i * 432.1) * 23421.123) % h;
      const size = Math.random() * 2;
      const alpha = Math.abs(Math.sin(time + i)) * 0.8;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(Math.abs(x), Math.abs(y), size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Aurora Layers
    this.drawAuroraLayer(time, h * 0.4, '#00ff99', 0.1);
    this.drawAuroraLayer(time + 10, h * 0.5, '#00ccff', 0.1);
    this.drawAuroraLayer(time + 20, h * 0.3, '#bb00ff', 0.05);
  }

  drawAuroraLayer(time, yBase, color, alpha) {
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.beginPath();

    const distinctPoints = 100;

    this.ctx.moveTo(0, this.canvas.height);

    for (let i = 0; i <= distinctPoints; i++) {
      const x = (i / distinctPoints) * this.canvas.width;
      // Complex wave function for organic look
      const noise = Math.sin(x * 0.01 + time) * Math.cos(x * 0.005 - time * 0.5);
      const y = yBase + noise * 100 + Math.sin(i * 0.1 + time) * 50;

      this.ctx.lineTo(x, y);
    }

    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();

    // Add glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 50;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
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