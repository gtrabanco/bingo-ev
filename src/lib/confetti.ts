// Electric car confetti animation (no dependencies).
const CARS = ['🚗', '⚡', '🔋', '🏎️'];

interface Particle {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export function echarConfetti(): void {
  const particles: Particle[] = [];
  const count = 50;

  // Spawn particles across the viewport.
  for (let i = 0; i < count; i++) {
    particles.push({
      emoji: CARS[Math.floor(Math.random() * CARS.length)]!,
      x: Math.random() * window.innerWidth,
      y: -20,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      life: 1,
    });
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const elements = particles.map((p) => {
    const el = document.createElement('div');
    el.textContent = p.emoji;
    el.style.position = 'fixed';
    el.style.fontSize = '24px';
    el.style.pointerEvents = 'none';
    el.style.userSelect = 'none';
    container.appendChild(el);
    return el;
  });

  const animate = () => {
    let anyAlive = false;
    particles.forEach((p, i) => {
      p.y += p.vy;
      p.x += p.vx;
      p.vy += 0.1; // gravity
      p.life -= 0.01;
      if (p.life > 0) anyAlive = true;

      const el = elements[i]!;
      el.style.left = `${p.x}px`;
      el.style.top = `${p.y}px`;
      el.style.opacity = String(Math.max(0, p.life));
    });

    if (anyAlive) {
      requestAnimationFrame(animate);
    } else {
      container.remove();
    }
  };

  animate();
}
