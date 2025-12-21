class PrismBackground {
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
    const time = Date.now() * 0.0005;

    this.ctx.clearRect(0, 0, w, h);

    // Deep Space Background
    const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
    gradient.addColorStop(0, '#1a0b2e');
    gradient.addColorStop(1, '#000000');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    // Ambient Glows
    this.drawBlob(w * 0.2, h * 0.3, 300, '#43187c', 0.15);
    this.drawBlob(w * 0.8, h * 0.7, 400, '#75187c', 0.15);

    this.ctx.translate(w / 2, h / 2);

    // Layered Prisms
    this.drawTriangle(time, 200, '#00ffff', 0.1);
    this.drawTriangle(-time * 1.5, 180, '#ff00ff', 0.1);
    this.drawTriangle(time * 0.5, 300, '#ffffff', 0.05);

    // Complex geometric shape composed of lines
    this.ctx.beginPath();
    this.ctx.strokeStyle = `hsl(${time * 50}, 70%, 50%)`;
    this.ctx.lineWidth = 1;
    this.ctx.globalAlpha = 0.3;
    const vertices = 6;
    const radius = 150 + Math.sin(time) * 20;

    for (let i = 0; i <= vertices; i++) {
      const angle = (Math.PI * 2 / vertices) * i + time;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);

      // Connect to opposite
      const oppAngle = angle + Math.PI;
      this.ctx.lineTo(Math.cos(oppAngle) * (radius / 2), Math.sin(oppAngle) * (radius / 2));
    }
    this.ctx.stroke();

    this.ctx.resetTransform();
  }

  drawBlob(x, y, r, color, alpha) {
    this.ctx.globalCompositeOperation = 'screen';
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    this.ctx.fillStyle = g;
    this.ctx.globalAlpha = alpha;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalCompositeOperation = 'source-over';
  }

  drawTriangle(angle, size, color, alpha) {
    this.ctx.save();
    this.ctx.rotate(angle);
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    this.ctx.beginPath();
    const h = size * (Math.sqrt(3) / 2);
    this.ctx.moveTo(0, -h / 2 * 1.5); // Top
    this.ctx.lineTo(-size / 2, h / 2 * 0.5); // Bottom Left
    this.ctx.lineTo(size / 2, h / 2 * 0.5); // Bottom Right
    this.ctx.closePath();

    this.ctx.fill();
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