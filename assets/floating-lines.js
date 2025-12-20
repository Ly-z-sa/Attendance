class FloatingLines {
  constructor(container, options = {}) {
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
  
  drawBackground() {
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Create gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#2f4ba2');
    gradient.addColorStop(0.5, '#000000');
    gradient.addColorStop(1, '#e947f5');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }
  
  drawWaves() {
    const time = (Date.now() - this.startTime) / 1000;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground();
    
    // Draw complex wave lines with rotation and twirling
    const waveConfigs = [
      { count: 6, yBase: height * 0.8, amplitude: 40, frequency: 0.008, speed: 0.4, alpha: 0.2, twist: 0.3 },
      { count: 10, yBase: height * 0.5, amplitude: 60, frequency: 0.006, speed: 0.2, alpha: 0.6, twist: 0.5 },
      { count: 4, yBase: height * 0.2, amplitude: 35, frequency: 0.01, speed: 0.6, alpha: 0.15, twist: 0.8 }
    ];
    
    waveConfigs.forEach((config, layerIndex) => {
      for (let i = 0; i < config.count; i++) {
        const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
        const t = i / Math.max(config.count - 1, 1);
        
        if (layerIndex === 0) {
          gradient.addColorStop(0, '#e947f5');
          gradient.addColorStop(0.5, '#ff6b9d');
          gradient.addColorStop(1, '#c44569');
        } else if (layerIndex === 1) {
          gradient.addColorStop(0, '#2f4ba2');
          gradient.addColorStop(0.5, '#4834d4');
          gradient.addColorStop(1, '#e947f5');
        } else {
          gradient.addColorStop(0, '#00d2d3');
          gradient.addColorStop(0.5, '#2f4ba2');
          gradient.addColorStop(1, '#ff9ff3');
        }
        
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = Math.random() * 2 + 1;
        this.ctx.globalAlpha = config.alpha;
        this.ctx.beginPath();
        
        const offset = i * 0.7 + time * config.speed;
        const rotationOffset = Math.sin(time * 0.1 + i) * config.twist;
        
        for (let x = 0; x <= width; x += 2) {
          const baseY = config.yBase + Math.sin(x * config.frequency + offset) * config.amplitude;
          
          // Add twirling effect
          const twirl = Math.sin(x * 0.003 + time * 0.5 + i * 0.2) * 20;
          const spiral = Math.cos(x * 0.002 + time * 0.3 + i * 0.5) * 15;
          
          // Rotation around center
          const centerX = x - width / 2;
          const centerY = baseY - height / 2;
          const rotatedX = centerX * Math.cos(rotationOffset) - centerY * Math.sin(rotationOffset) + width / 2;
          const rotatedY = centerX * Math.sin(rotationOffset) + centerY * Math.cos(rotationOffset) + height / 2;
          
          const finalY = rotatedY + twirl + spiral;
          
          if (x === 0) {
            this.ctx.moveTo(rotatedX, finalY);
          } else {
            this.ctx.lineTo(rotatedX, finalY);
          }
        }
        
        this.ctx.stroke();
      }
    });
    
    this.ctx.globalAlpha = 1;
  }
  
  animate() {
    this.drawWaves();
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