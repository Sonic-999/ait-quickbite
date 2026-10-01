import React, { useRef, useEffect, useState } from 'react';

export default function CameraFeedView({
  occupancyCount = 74,
  capacity = 120,
  showBBoxes = true,
  showPrivacyBlur = true,
  showTripwire = true,
  onStudentAdd,
  onStudentExit
}) {
  const canvasRef = useRef(null);
  const [hoverCoord, setHoverCoord] = useState(null);

  // Simulation state in ref for 60fps render
  const simRef = useRef({
    people: [],
    ripples: [],
    particles: [],
    floatingTexts: [],
    tableHighlights: {},
    gateEntryTrigger: 0,
    gateExitTrigger: 0,
    time: 0,
    width: 800,
    height: 500,
  });

  // Architectural Dining Tables in normalized coordinates [0..1]
  const tables = [
    { id: 1, x: 0.28, y: 0.40, w: 0.16, h: 0.20, label: 'Table 01' },
    { id: 2, x: 0.50, y: 0.40, w: 0.16, h: 0.20, label: 'Table 02' },
    { id: 3, x: 0.72, y: 0.40, w: 0.16, h: 0.20, label: 'Table 03' },
    { id: 4, x: 0.28, y: 0.68, w: 0.16, h: 0.20, label: 'Table 04' },
    { id: 5, x: 0.50, y: 0.68, w: 0.16, h: 0.20, label: 'Table 05' },
    { id: 6, x: 0.72, y: 0.68, w: 0.16, h: 0.20, label: 'Table 06' },
  ];

  // Helper to create a technical node entity
  const createPerson = (id, startAtEntrance = true, customTarget = null) => {
    let targetX, targetY;
    let targetTableId = null;

    if (customTarget) {
      targetX = customTarget.x;
      targetY = customTarget.y;
      targetTableId = customTarget.tableId || null;
    } else {
      if (Math.random() < 0.70) {
        // Table seating zone
        const tbl = tables[Math.floor(Math.random() * tables.length)];
        targetTableId = tbl.id;
        const seatAngle = Math.random() * Math.PI * 2;
        const seatDist = 0.05 + Math.random() * 0.03;
        targetX = tbl.x + tbl.w / 2 + Math.cos(seatAngle) * seatDist;
        targetY = tbl.y + tbl.h / 2 + Math.sin(seatAngle) * seatDist;
      } else {
        // Serving line or main corridor
        targetX = 0.26 + Math.random() * 0.52;
        targetY = 0.20 + Math.random() * 0.07;
      }
    }

    const startX = startAtEntrance ? 0.06 : 0.22 + Math.random() * 0.58;
    const startY = startAtEntrance ? 0.48 + (Math.random() - 0.5) * 0.16 : 0.32 + Math.random() * 0.48;

    return {
      id: id || Math.floor(Math.random() * 900 + 100),
      x: startX,
      y: startY,
      targetX,
      targetY,
      targetTableId,
      speed: 0.0018 + Math.random() * 0.0014,
      trail: [],
      dwellTime: 240 + Math.random() * 400,
      state: startAtEntrance ? 'entering' : 'seated',
      phase: Math.random() * Math.PI * 2, // For subtle organic swaying
    };
  };

  // Synchronize avatar count with target occupancyCount
  useEffect(() => {
    const sim = simRef.current;
    // Scale visual nodes: 8 to 28 visible nodes
    const targetVisualCount = Math.max(8, Math.min(28, Math.round(occupancyCount * 0.23)));

    if (sim.people.length < targetVisualCount) {
      const toAdd = targetVisualCount - sim.people.length;
      for (let i = 0; i < toAdd; i++) {
        sim.people.push(createPerson(100 + sim.people.length + i, true));
        sim.gateEntryTrigger = 12;
      }
    } else if (sim.people.length > targetVisualCount) {
      const toRemove = sim.people.length - targetVisualCount;
      let removed = 0;
      for (let p of sim.people) {
        if (p.state !== 'exiting' && removed < toRemove) {
          p.state = 'exiting';
          p.targetX = 0.95;
          p.targetY = 0.48 + (Math.random() - 0.5) * 0.16;
          p.speed = 0.0032;
          removed++;
        }
      }
    }
  }, [occupancyCount]);

  // Handle floor and interactive object clicks
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Check bounds within room
    if (clickX < 0.04 || clickX > 0.96 || clickY < 0.12 || clickY > 0.92) return;

    const sim = simRef.current;

    // 1. Check if user clicked near ENTRY gate (left)
    if (clickX <= 0.10 && clickY >= 0.32 && clickY <= 0.68) {
      sim.gateEntryTrigger = 25;
      sim.ripples.push({
        x: 0.06,
        y: clickY,
        radius: 0,
        maxRadius: 36,
        alpha: 1,
        color: '34, 197, 94', // Emerald green
      });
      sim.floatingTexts.push({
        x: 0.08,
        y: clickY,
        text: '+1 ENTRY GATE',
        alpha: 1,
        color: '#16A34A',
      });
      sim.people.push(createPerson(Math.floor(Math.random() * 800 + 200), true));
      if (onStudentAdd) onStudentAdd();
      return;
    }

    // 2. Check if user clicked near EXIT gate (right)
    if (clickX >= 0.90 && clickY >= 0.32 && clickY <= 0.68) {
      sim.gateExitTrigger = 25;
      sim.ripples.push({
        x: 0.94,
        y: clickY,
        radius: 0,
        maxRadius: 36,
        alpha: 1,
        color: '239, 68, 68', // Rose red
      });
      sim.floatingTexts.push({
        x: 0.92,
        y: clickY,
        text: '-1 EXIT GATE',
        alpha: 1,
        color: '#DC2626',
      });
      // Guide nearest active person to exit
      const activePersons = sim.people.filter(p => p.state !== 'exiting');
      if (activePersons.length > 0) {
        const p = activePersons[0];
        p.state = 'exiting';
        p.targetX = 0.95;
        p.targetY = clickY;
        p.speed = 0.0035;
      }
      if (onStudentExit) onStudentExit();
      return;
    }

    // 3. Check if user clicked on a Table
    let clickedTable = null;
    for (const tbl of tables) {
      if (
        clickX >= tbl.x &&
        clickX <= tbl.x + tbl.w &&
        clickY >= tbl.y &&
        clickY <= tbl.y + tbl.h
      ) {
        clickedTable = tbl;
        break;
      }
    }

    if (clickedTable) {
      // Table click trigger
      sim.tableHighlights[clickedTable.id] = 1.0;
      sim.ripples.push({
        x: clickedTable.x + clickedTable.w / 2,
        y: clickedTable.y + clickedTable.h / 2,
        radius: 0,
        maxRadius: 42,
        alpha: 1,
        color: '79, 70, 229',
      });
      sim.floatingTexts.push({
        x: clickedTable.x + clickedTable.w / 2,
        y: clickedTable.y + clickedTable.h / 2,
        text: `SEAT AT ${clickedTable.label.toUpperCase()}`,
        alpha: 1,
        color: '#4F46E5',
      });

      // Spawn a new person walking to that table
      const seatAngle = Math.random() * Math.PI * 2;
      const seatDist = 0.05 + Math.random() * 0.03;
      const seatX = clickedTable.x + clickedTable.w / 2 + Math.cos(seatAngle) * seatDist;
      const seatY = clickedTable.y + clickedTable.h / 2 + Math.sin(seatAngle) * seatDist;

      sim.people.push(createPerson(Math.floor(Math.random() * 800 + 200), true, {
        x: seatX,
        y: seatY,
        tableId: clickedTable.id
      }));
      sim.gateEntryTrigger = 15;
      if (onStudentAdd) onStudentAdd();
      return;
    }

    // 4. General Floor Click: Multi-ring shockwave & particle burst
    sim.ripples.push({
      x: clickX,
      y: clickY,
      radius: 0,
      maxRadius: 38,
      alpha: 1,
      color: '79, 70, 229',
    });
    sim.ripples.push({
      x: clickX,
      y: clickY,
      radius: 0,
      maxRadius: 24,
      alpha: 0.8,
      color: '2, 132, 199', // Sky blue second ring
    });

    // Spawn 6 small particle burst dots
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      sim.particles.push({
        x: clickX,
        y: clickY,
        vx: Math.cos(angle) * 0.0016,
        vy: Math.sin(angle) * 0.0016,
        alpha: 1,
        radius: 2,
      });
    }

    // Add floating text
    sim.floatingTexts.push({
      x: clickX,
      y: clickY,
      text: '+1 WAYPOINT SUMMON',
      alpha: 1,
      color: '#4F46E5',
    });

    // Spawn a person heading towards this exact coordinate
    sim.people.push(createPerson(Math.floor(Math.random() * 800 + 200), true, { x: clickX, y: clickY }));
    sim.gateEntryTrigger = 14;

    if (onStudentAdd) onStudentAdd();
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setHoverCoord({ x, y });
  };

  // 60FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const w = (canvas.width = canvas.parentElement.clientWidth);
      const h = (canvas.height = canvas.parentElement.clientHeight);
      simRef.current.width = w;
      simRef.current.height = h;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const sim = simRef.current;
    if (sim.people.length === 0) {
      const initialCount = Math.max(8, Math.min(26, Math.round(occupancyCount * 0.23)));
      for (let i = 0; i < initialCount; i++) {
        sim.people.push(createPerson(100 + i, false));
      }
    }

    const render = () => {
      sim.time += 0.025;
      const w = sim.width;
      const h = sim.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Architectural CAD Blueprint Floor Base (Pure White / Soft Slate)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);

      // Fine Technical Blueprint Grid
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Outer room perimeter border with dimension corner ticks
      const rx = w * 0.06;
      const ry = h * 0.12;
      const rw = w * 0.88;
      const rh = h * 0.80;

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(rx, ry, rw, rh);

      // Corner L-markers
      const tick = 8;
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      // Top-Left
      ctx.beginPath(); ctx.moveTo(rx - 2, ry + tick); ctx.lineTo(rx - 2, ry - 2); ctx.lineTo(rx + tick, ry - 2); ctx.stroke();
      // Top-Right
      ctx.beginPath(); ctx.moveTo(rx + rw + 2 - tick, ry - 2); ctx.lineTo(rx + rw + 2, ry - 2); ctx.lineTo(rx + rw + 2, ry + tick); ctx.stroke();
      // Bottom-Left
      ctx.beginPath(); ctx.moveTo(rx - 2, ry + rh - tick); ctx.lineTo(rx - 2, ry + rh + 2); ctx.lineTo(rx + tick, ry + rh + 2); ctx.stroke();
      // Bottom-Right
      ctx.beginPath(); ctx.moveTo(rx + rw + 2 - tick, ry + rh + 2); ctx.lineTo(rx + rw + 2, ry + rh + 2); ctx.lineTo(rx + rw + 2, ry + rh + 2 - tick); ctx.stroke();

      // 2. Serving Counter (Top Zone)
      const counterX = w * 0.22;
      const counterY = h * 0.14;
      const counterW = w * 0.56;
      const counterH = h * 0.08;

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(counterX, counterY, counterW, counterH);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(counterX, counterY, counterW, counterH);

      // Stanchion queue dividers
      ctx.strokeStyle = '#E2E8F0';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(counterX, counterY + counterH + 8);
      ctx.lineTo(counterX + counterW, counterY + counterH + 8);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#64748B';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SERVING COUNTER & HOT BUFFET LINE', counterX + counterW / 2, counterY + counterH / 2 + 3);

      // 3. Architectural Dining Tables with Interactive Seating
      tables.forEach((tbl) => {
        const tx = tbl.x * w;
        const ty = tbl.y * h;
        const tw = tbl.w * w;
        const th = tbl.h * h;

        // Check if highlighted by user click
        const hl = sim.tableHighlights[tbl.id] || 0;
        if (hl > 0) {
          ctx.strokeStyle = `rgba(79, 70, 229, ${hl})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(tx - 3, ty - 3, tw + 6, th + 6, 8);
          ctx.stroke();
          sim.tableHighlights[tbl.id] -= 0.02;
        }

        // Draw Chairs around table
        ctx.fillStyle = '#F1F5F9';
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;

        const chairSize = 7;
        // North & South chairs
        [0.25, 0.5, 0.75].forEach(frac => {
          // North
          ctx.beginPath();
          ctx.arc(tx + tw * frac, ty - chairSize / 2, chairSize / 2, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
          // South
          ctx.beginPath();
          ctx.arc(tx + tw * frac, ty + th + chairSize / 2, chairSize / 2, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        });

        // Table surface
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 6);
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Subtle table ID & capacity indicator
        ctx.fillStyle = '#64748B';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`T${tbl.id}`, tx + tw / 2, ty + th / 2 - 2);

        ctx.fillStyle = '#94A3B8';
        ctx.font = '8px "Inter", sans-serif';
        ctx.fillText('6 Seats', tx + tw / 2, ty + th / 2 + 10);
      });

      // 4. Doorway Sensors with Animated Traveling Laser Energy
      if (showTripwire) {
        // Entry Gate (Left)
        const entX = w * 0.06;
        const isEntryActive = sim.gateEntryTrigger > 0;
        if (sim.gateEntryTrigger > 0) sim.gateEntryTrigger--;

        // Animated traveling line dash
        ctx.strokeStyle = isEntryActive ? '#16A34A' : 'rgba(22, 163, 74, 0.65)';
        ctx.lineWidth = isEntryActive ? 2.5 : 1.5;
        ctx.lineDashOffset = -sim.time * 25;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(entX, h * 0.35);
        ctx.lineTo(entX, h * 0.65);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        ctx.fillStyle = '#16A34A';
        ctx.font = '10px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ENTRY TRIPWIRE', entX + 8, h * 0.38);

        // Exit Gate (Right)
        const exitX = w * 0.94;
        const isExitActive = sim.gateExitTrigger > 0;
        if (sim.gateExitTrigger > 0) sim.gateExitTrigger--;

        ctx.strokeStyle = isExitActive ? '#DC2626' : 'rgba(220, 38, 38, 0.65)';
        ctx.lineWidth = isExitActive ? 2.5 : 1.5;
        ctx.lineDashOffset = sim.time * 25;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(exitX, h * 0.35);
        ctx.lineTo(exitX, h * 0.65);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        ctx.fillStyle = '#DC2626';
        ctx.textAlign = 'right';
        ctx.fillText('EXIT TRIPWIRE', exitX - 8, h * 0.38);
      }

      // 5. User Click Expanding Shockwave Ripples
      sim.ripples.forEach((r) => {
        r.radius += 1.4;
        r.alpha -= 0.032;
        if (r.alpha > 0) {
          ctx.strokeStyle = `rgba(${r.color || '79, 70, 229'}, ${r.alpha * 0.75})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(r.x * w, r.y * h, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      sim.ripples = sim.ripples.filter(r => r.alpha > 0);

      // 6. Micro-particle bursts
      sim.particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;
        if (p.alpha > 0) {
          ctx.fillStyle = `rgba(79, 70, 229, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, p.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      sim.particles = sim.particles.filter(p => p.alpha > 0);

      // 7. Floating Click Badges
      sim.floatingTexts.forEach((ft) => {
        ft.y -= 0.0008; // Rise upward
        ft.alpha -= 0.024;
        if (ft.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.alpha);
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = ft.color || '#4F46E5';
          ctx.fillText(ft.text, ft.x * w, ft.y * h - 14);
          ctx.restore();
        }
      });
      sim.floatingTexts = sim.floatingTexts.filter(ft => ft.alpha > 0);

      // 8. Moving People Nodes with Organic Physics & Smooth Direction Trails
      sim.people.forEach((p) => {
        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Natural swaying oscillation
        p.phase += 0.06;
        const sway = Math.sin(p.phase) * 0.0002;

        if (dist > 0.012) {
          p.x += (dx / dist) * p.speed + sway;
          p.y += (dy / dist) * p.speed;
        } else {
          if (p.state === 'entering') {
            p.state = 'seated';
          } else if (p.state === 'exiting') {
            sim.gateExitTrigger = 15;
            p.x = 0.06;
            p.y = 0.48 + (Math.random() - 0.5) * 0.16;
            p.state = 'entering';
            p.targetX = 0.28 + Math.random() * 0.45;
            p.targetY = 0.35 + Math.random() * 0.4;
            p.trail = [];
            if (onStudentExit) onStudentExit();
          } else {
            p.dwellTime--;
            if (p.dwellTime <= 0) {
              p.dwellTime = 260 + Math.random() * 320;
              if (Math.random() < 0.28) {
                p.state = 'exiting';
                p.targetX = 0.95;
                p.targetY = 0.48 + (Math.random() - 0.5) * 0.16;
                p.speed = 0.003;
              } else {
                const tbl = tables[Math.floor(Math.random() * tables.length)];
                p.targetX = tbl.x + tbl.w / 2 + (Math.random() - 0.5) * 0.07;
                p.targetY = tbl.y + tbl.h / 2 + (Math.random() - 0.5) * 0.07;
              }
            }
          }
        }

        const px = p.x * w;
        const py = p.y * h;

        p.trail.push({ x: px, y: py });
        if (p.trail.length > 9) p.trail.shift();

        // Smooth Opacity Trail
        if (p.trail.length > 2) {
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.18)';
          ctx.lineWidth = 1.75;
          ctx.beginPath();
          p.trail.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }

        // Seated Idle Breathing Ring
        if (p.state === 'seated') {
          const breath = (Math.sin(sim.time * 2 + p.id) + 1) * 0.5;
          ctx.strokeStyle = `rgba(79, 70, 229, ${0.15 + breath * 0.15})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, 5 + breath * 2.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Person Node Dot (Crisp Electric Indigo)
        ctx.fillStyle = '#4F46E5';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Privacy Blur Box (Subdued frosted square on light canvas)
        if (showPrivacyBlur) {
          const bsize = 13;
          ctx.fillStyle = 'rgba(79, 70, 229, 0.08)';
          ctx.fillRect(px - bsize / 2, py - bsize / 2, bsize, bsize);
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.35)';
          ctx.lineWidth = 0.75;
          ctx.strokeRect(px - bsize / 2, py - bsize / 2, bsize, bsize);
        }

        // Minimalist Bounding Reticle (Clean dark slate corners)
        if (showBBoxes) {
          const bw = 17;
          const bh = 21;
          const bx = px - bw / 2;
          const by = py - bh / 2;

          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 0.85;
          // Thin 4 corners
          const c = 3.5;
          ctx.beginPath();
          ctx.moveTo(bx, by + c); ctx.lineTo(bx, by); ctx.lineTo(bx + c, by);
          ctx.moveTo(bx + bw - c, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + c);
          ctx.moveTo(bx + bw, by + bh - c); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw - c, by + bh);
          ctx.moveTo(bx + c, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx, by + bh - c);
          ctx.stroke();
        }
      });

      // 9. Architectural CAD Legend Footer
      ctx.fillStyle = '#475569';
      ctx.font = '10px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('AIT PUNE • DINING HALL 01 (FLOOR PLAN SCHEMATIC)', w * 0.07, h * 0.95);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#16A34A';
      ctx.fillText('● HARDWARE ONLINE', w * 0.93, h * 0.95);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [showBBoxes, showPrivacyBlur, showTripwire]);

  return (
    <div
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[380px] sm:h-[450px] rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs cursor-crosshair select-none group"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left Floating Instruction Pill */}
      <div className="absolute top-3 left-3 pointer-events-none flex items-center gap-2">
        <span className="text-xs text-slate-700 font-medium bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          Click anywhere to summon • Click tables to seat
        </span>
      </div>

      {/* Top Right Coordinate & Telemetry Pill */}
      <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-2">
        <span className="text-[11px] font-mono text-slate-600 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
          {hoverCoord ? `X:${hoverCoord.x}% Y:${hoverCoord.y}% • ` : ''}30 FPS FP16
        </span>
      </div>

      {/* Subtle Hint Tooltips on Gates */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-mono uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
          Click to enter
        </span>
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[9px] font-mono uppercase bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200 shadow-2xs">
          Click to exit
        </span>
      </div>
    </div>
  );
}
