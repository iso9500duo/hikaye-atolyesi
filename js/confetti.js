/**
 * HİKÂYE ATÖLYESİ - HAFİF VE AKICI KONFETİ EFEKTİ
 * Harici kütüphane gerektirmeyen saf Canvas konfeti motoru.
 */

export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#f43f5e'];
  const particles = [];
  const particleCount = 100;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height * 0.4 + (Math.random() - 0.5) * 100,
      w: Math.random() * 10 + 6,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -12 - 5,
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 10,
      gravity: 0.35,
      opacity: 1
    });
  }

  let animationFrame;
  let startTime = Date.now();

  function render() {
    ctx.clearRect(0, 0, width, height);
    const elapsed = Date.now() - startTime;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRotation;

      if (elapsed > 1800) {
        p.opacity -= 0.02;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < 3500 && particles.some(p => p.opacity > 0)) {
      animationFrame = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrame);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  render();
}
