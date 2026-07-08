import { TWO_PI } from "./fractals";

export type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number };

export function emitParticles(particles: Particle[], x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TWO_PI;
    const speed = 0.5 + Math.random() * 2.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.5 + Math.random() * 1.5,
      size: 1 + Math.random() * 3,
    });
  }
  if (particles.length > 300) particles.splice(0, particles.length - 300);
}

export function updateAndDrawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  color: string,
  opacity: number
) {
  const dt = 1 / 60;
  ctx.save();
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= dt / p.maxLife;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life * opacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, TWO_PI);
    ctx.fill();
  }
  ctx.restore();
}
