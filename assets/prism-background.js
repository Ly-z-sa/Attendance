class PrismBackground {
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
  
  drawPrism() {
    const time = (Date.now() - this.startTime) / 1000;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    this.ctx.clearRect(0, 0, width, height);
    
    // Dark background
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, width, height);
    
    // Create multiple rotating prisms
    for (let i = 0; i < 3; i++) {
      const scale = 0.8 - i * 0.2;
      const rotation = time * 0.3 + i * Math.PI / 3;
      const size = Math.min(width, height) * 0.15 * scale;
      
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(rotation);
      
      // Draw prism faces with different colors
      const faces = [
        { color: `hsl(${280 + i * 30}, 80%, 60%)`, offset: { x: -size * 0.3, y: -size * 0.2 } },
        { color: `hsl(${320 + i * 30}, 70%, 50%)`, offset: { x: size * 0.3, y: -size * 0.2 } },
        { color: `hsl(${240 + i * 30}, 90%, 70%)`, offset: { x: 0, y: size * 0.4 } }
      ];
      
      faces.forEach((face, faceIndex) => {
        const gradient = this.ctx.createRadialGradient(
          face.offset.x, face.offset.y, 0,
          face.offset.x, face.offset.y, size
        );
        gradient.addColorStop(0, face.color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = 0.6 + Math.sin(time + faceIndex) * 0.2;
        
        // Draw triangular face
        this.ctx.beginPath();
        this.ctx.moveTo(face.offset.x, face.offset.y - size * 0.6);
        this.ctx.lineTo(face.offset.x - size * 0.5, face.offset.y + size * 0.3);
        this.ctx.lineTo(face.offset.x + size * 0.5, face.offset.y + size * 0.3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add glow effect
        this.ctx.shadowColor = face.color;
        this.ctx.shadowBlur = 20;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      });
      
      this.ctx.restore();
    }
    
    // Add floating particles
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * width;
      const y = (Math.cos(time * 0.3 + i * 0.1) * 0.5 + 0.5) * height;
      const size = Math.sin(time + i) * 2 + 3;
      
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsl(${300 + i * 10}, 80%, 60%)`);
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = 0.4;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.globalAlpha = 1;
  }
  
  animate() {
    this.drawPrism();
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