class FloatingLines {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none;';
    this.ctx = this.canvas.getContext('2d');

    document.body.appendChild(this.canvas);

    this.mouse = { x: -100, y: -100 };
    this.lines = [];

    this.resizeCanvas();
    this.initLines();

    this.resizeHandler = () => {
      this.resizeCanvas();
      this.initLines();
    };

    this.mousemoveHandler = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };

    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('mousemove', this.mousemoveHandler);

    this.animate();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initLines() {
    this.lines = [];
    const count = 15;
    for (let i = 0; i < count; i++) {
      this.lines.push({
        yConfig: Math.random() * this.canvas.height,
        amplitude: 30 + Math.random() * 50,
        speed: 0.002 + Math.random() * 0.003,
        frequency: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        color: i % 2 === 0 ? '#4facfe' : '#00f2fe',
        alpha: 0.1 + Math.random() * 0.3
      });
    }
  }

  draw() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const time = Date.now();

    this.ctx.clearRect(0, 0, width, height);

    // Background gradient typical of "tech" or "abstract"
    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f0c29');
    bgGradient.addColorStop(0.5, '#302b63');
    bgGradient.addColorStop(1, '#24243e');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, width, height);

    this.lines.forEach((line, index) => {
      this.ctx.beginPath();

      let prevX = 0;
      let prevY = line.yConfig;

      for (let x = 0; x <= width; x += 10) {
        // Base Sine Wave
        const baseY = line.yConfig + Math.sin(x * line.frequency + time * line.speed + line.phase) * line.amplitude;

        // Mouse interaction: push lines away
        const dist = Math.hypot(x - this.mouse.x, baseY - this.mouse.y);
        const maxDist = 200;
        let offsetY = 0;

        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          const direction = baseY < this.mouse.y ? -1 : 1;
          offsetY = force * 80 * direction;
        }

        const finalY = baseY + offsetY;

        if (x === 0) {
          this.ctx.moveTo(x, finalY);
        } else {
          // Smooth curve
          const xc = (prevX + x) / 2;
          const yc = (prevY + finalY) / 2;
          this.ctx.quadraticCurveTo(prevX, prevY, xc, yc);
        }

        prevX = x;
        prevY = finalY;

        // Draw Glowing Nodes occasionally
        if (index % 3 === 0 && x % 150 === 0) {
          this.ctx.save();
          this.ctx.fillStyle = '#fff';
          this.ctx.globalAlpha = line.alpha + 0.2;
          this.ctx.beginPath();
          this.ctx.arc(x, finalY, 2, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.shadowColor = line.color;
          this.ctx.shadowBlur = 10;
          this.ctx.fill();
          this.ctx.restore();
        }
      }

      this.ctx.strokeStyle = line.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = line.alpha;
      this.ctx.stroke();
    });
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