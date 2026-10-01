import React, { useRef, useEffect } from 'react';

export default function HeroCanvas({ occupancyCount = 74, capacity = 120 }) {
  const canvasRef = useRef(null);
  const clickRipplesRef = useRef([]);

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    clickRipplesRef.current.push({
      x,
      y,
      radius: 0,
      alpha: 1,
      particles: Array.from({ length: 6 }, () => ({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: (Math.random() - 0.5) * 2.5,
        life: 1
      }))
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth);
    let height = (canvas.height = canvas.parentElement.clientHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Floor dimensions in 2.5D architectural plane
    const fw = 220;
    const fh = 140;

    // Moving student nodes
    const peopleCount = Math.min(28, Math.max(10, Math.floor(occupancyCount * 0.3)));
    const people = [];

    for (let i = 0; i < peopleCount; i++) {
      people.push({
        id: i + 1,
        x: (Math.random() - 0.5) * fw * 1.5,
        y: (Math.random() - 0.5) * fh * 1.4,
        targetX: (Math.random() - 0.5) * fw * 1.4,
        targetY: (Math.random() - 0.5) * fh * 1.3,
        speed: 0.3 + Math.random() * 0.4,
        trail: [],
        timer: Math.random() * 120,
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Technical coordinate grid on white
      const gridSize = 48;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Isometric Architectural Projection
      const cx = width > 1024 ? width * 0.65 : width * 0.52;
      const cy = height * 0.54;

      const isoX = (x, y) => cx + (x - y) * 1.3;
      const isoY = (x, y, z = 0) => cy + (x + y) * 0.65 - z;

      ctx.save();

      // Architectural Floor Boundary
      ctx.beginPath();
      ctx.moveTo(isoX(-fw, -fh), isoY(-fw, -fh));
      ctx.lineTo(isoX(fw, -fh), isoY(fw, -fh));
      ctx.lineTo(isoX(fw, fh), isoY(fw, fh));
      ctx.lineTo(isoX(-fw, fh), isoY(-fw, fh));
      ctx.closePath();

      // Flat crisp white/slate fill
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Interior zones: Serving Line (Top edge)
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(isoX(-160, -fh + 18), isoY(-160, -fh + 18, 8));
      ctx.lineTo(isoX(160, -fh + 18), isoY(160, -fh + 18, 8));
      ctx.stroke();

      // Dining Tables Grid
      const tables = [
        { x: -90, y: -45 }, { x: 0, y: -45 }, { x: 90, y: -45 },
        { x: -90, y: 35 }, { x: 0, y: 35 }, { x: 90, y: 35 }
      ];

      tables.forEach((t) => {
        const tw = 24;
        const th = 14;
        ctx.beginPath();
        ctx.moveTo(isoX(t.x - tw, t.y - th), isoY(t.x - tw, t.y - th, 4));
        ctx.lineTo(isoX(t.x + tw, t.y - th), isoY(t.x + tw, t.y - th, 4));
        ctx.lineTo(isoX(t.x + tw, t.y + th), isoY(t.x + tw, t.y + th, 4));
        ctx.lineTo(isoX(t.x - tw, t.y + th), isoY(t.x - tw, t.y + th, 4));
        ctx.closePath();
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Entry Door (Left)
      const entX = -fw;
      ctx.strokeStyle = '#16A34A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(isoX(entX, -30), isoY(entX, -30));
      ctx.lineTo(isoX(entX, 30), isoY(entX, 30));
      ctx.stroke();

      // Exit Door (Right)
      const exitX = fw;
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(isoX(exitX, -30), isoY(exitX, -30));
      ctx.lineTo(isoX(exitX, 30), isoY(exitX, 30));
      ctx.stroke();

      // Render Moving People as Clean Indigo Nodes with Opacity Trails
      people.forEach((p) => {
        p.timer += 1;
        if (p.timer > 180 || (Math.abs(p.x - p.targetX) < 4 && Math.abs(p.y - p.targetY) < 4)) {
          p.timer = 0;
          if (Math.random() > 0.7) {
            p.targetX = fw + 10;
          } else {
            p.targetX = (Math.random() - 0.5) * fw * 1.4;
            p.targetY = (Math.random() - 0.5) * fh * 1.3;
          }
        }

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 1) {
          p.x += (dx / d) * p.speed;
          p.y += (dy / d) * p.speed;
        }

        if (p.x > fw + 5) {
          p.x = -fw - 5;
          p.y = (Math.random() - 0.5) * 35;
          p.targetX = (Math.random() - 0.5) * 60;
          p.targetY = (Math.random() - 0.5) * 60;
          p.trail = [];
        }

        const px = isoX(p.x, p.y);
        const py = isoY(p.x, p.y, 2);

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 8) p.trail.shift();

        // Smooth Opacity Trail
        if (p.trail.length > 2) {
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          p.trail.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }

        // Person Node
        ctx.fillStyle = '#4F46E5';
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle Door Labels
      ctx.fillStyle = '#64748B';
      ctx.font = '10px "Inter", sans-serif';
      ctx.fillText('Entry', isoX(-fw, 34), isoY(-fw, 34));
      ctx.fillText('Exit', isoX(fw - 30, 34), isoY(fw - 30, 34));

      ctx.restore();

      // Click Ripples with Dual Expanding Ring & Micro-Particles
      clickRipplesRef.current.forEach((r) => {
        r.radius += 2.2;
        r.alpha -= 0.028;
        if (r.alpha > 0) {
          // Primary shockwave ring
          ctx.strokeStyle = `rgba(79, 70, 229, ${r.alpha * 0.8})`;
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
          ctx.stroke();

          // Secondary inner echoing ring
          if (r.radius > 8) {
            ctx.strokeStyle = `rgba(99, 102, 241, ${r.alpha * 0.45})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Particles
          if (r.particles) {
            r.particles.forEach((p) => {
              p.x += p.vx;
              p.y += p.vy;
              p.life -= 0.035;
              if (p.life > 0) {
                ctx.fillStyle = `rgba(99, 102, 241, ${p.life * 0.7})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        }
      });
      clickRipplesRef.current = clickRipplesRef.current.filter((r) => r.alpha > 0);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [occupancyCount, capacity]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      className="w-full h-full block opacity-90 cursor-pointer"
    />
  );
}
