class AuroraBackground {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; pointer-events: none;';
    this.ctx = this.canvas.getContext('2d');
    this.startTime = Date.now();
    
    document.body.appendChild(this.canvas);
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.animate();
  }
  
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  drawAurora() {
    const time = (Date.now() - this.startTime) / 1000;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.ctx.clearRect(0, 0, width, height);
    
    // Dark night sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#0a0a1a');
    skyGradient.addColorStop(0.7, '#1a1a2e');
    skyGradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = skyGradient;
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw aurora layers
    for (let layer = 0; layer < 4; layer++) {
      const yOffset = height * 0.2 + layer * height * 0.15;
      const amplitude = 80 + layer * 30;
      const frequency = 0.003 + layer * 0.001;
      const speed = 0.5 + layer * 0.2;
      const alpha = 0.3 - layer * 0.05;
      
      this.ctx.globalAlpha = alpha;
      
      // Create aurora gradient
      const gradient = this.ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude);
      const hue1 = 120 + Math.sin(time * 0.3 + layer) * 60; // Green to cyan
      const hue2 = 280 + Math.cos(time * 0.2 + layer) * 40; // Purple to pink
      
      gradient.addColorStop(0, `hsla(${hue1}, 80%, 60%, 0)`);
      gradient.addColorStop(0.3, `hsla(${hue1}, 90%, 70%, 0.8)`);
      gradient.addColorStop(0.7, `hsla(${hue2}, 85%, 65%, 0.6)`);
      gradient.addColorStop(1, `hsla(${hue2}, 70%, 50%, 0)`);
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      
      // Draw flowing aurora shape
      for (let x = 0; x <= width; x += 5) {
        const wave1 = Math.sin(x * frequency + time * speed) * amplitude * 0.6;
        const wave2 = Math.sin(x * frequency * 1.5 + time * speed * 0.7) * amplitude * 0.4;
        const y = yOffset + wave1 + wave2;
        
        if (x === 0) {
          this.ctx.moveTo(x, y - amplitude);
        } else {
          this.ctx.lineTo(x, y - amplitude);
        }
      }
      
      for (let x = width; x >= 0; x -= 5) {
        const wave1 = Math.sin(x * frequency + time * speed) * amplitude * 0.6;
        const wave2 = Math.sin(x * frequency * 1.5 + time * speed * 0.7) * amplitude * 0.4;
        const y = yOffset + wave1 + wave2;
        this.ctx.lineTo(x, y + amplitude);
      }
      
      this.ctx.closePath();
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = `hsl(${hue1}, 80%, 60%)`;
      this.ctx.shadowBlur = 30;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
    
    // Add twinkling stars
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 0.1) * 0.5 + 0.5) * width;
      const y = (Math.cos(i * 0.13) * 0.3 + 0.2) * height;
      const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
      const size = twinkle * 2 + 0.5;
      
      this.ctx.globalAlpha = twinkle * 0.8;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1;
  }
  
  animate() {
    this.drawAurora();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    window.removeEventListener('resize', () => this.resizeCanvas());
  }
}