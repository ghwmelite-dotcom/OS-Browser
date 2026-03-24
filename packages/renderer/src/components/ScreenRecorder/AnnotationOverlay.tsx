import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Square,
  Type,
  Pen,
  Droplets,
  Undo2,
  Trash2,
  Download,
} from 'lucide-react';
import { useRecorderStore } from '../../store/recorder';

// ── Types ──────────────────────────────────────────────────────────────
type Tool = 'arrow' | 'rectangle' | 'text' | 'freehand' | 'blur';

interface Point {
  x: number;
  y: number;
}

interface DrawnShape {
  tool: Tool;
  color: string;
  lineWidth: number;
  points: Point[]; // start/end for arrow & rect, full path for freehand
  text?: string; // for text tool
}

const PRESET_COLORS = ['#EF4444', '#3B82F6', '#22C55E', '#FACC15', '#FFFFFF', '#000000'];

const AnnotationOverlay: React.FC = () => {
  const { isAnnotating } = useRecorderStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('freehand');
  const [color, setColor] = useState('#EF4444');
  const [shapes, setShapes] = useState<DrawnShape[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentShape = useRef<DrawnShape | null>(null);
  const LINE_WIDTH = 2;

  // ── Redraw everything ────────────────────────────────────────────────
  const redraw = useCallback(
    (extra?: DrawnShape) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const allShapes = extra ? [...shapes, extra] : shapes;
      for (const shape of allShapes) {
        ctx.strokeStyle = shape.color;
        ctx.fillStyle = shape.color;
        ctx.lineWidth = shape.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (shape.tool) {
          case 'freehand': {
            if (shape.points.length < 2) break;
            ctx.beginPath();
            ctx.moveTo(shape.points[0].x, shape.points[0].y);
            for (let i = 1; i < shape.points.length; i++) {
              ctx.lineTo(shape.points[i].x, shape.points[i].y);
            }
            ctx.stroke();
            break;
          }
          case 'arrow': {
            if (shape.points.length < 2) break;
            const [start, end] = [shape.points[0], shape.points[shape.points.length - 1]];
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const headLen = 14;

            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();

            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(
              end.x - headLen * Math.cos(angle - Math.PI / 6),
              end.y - headLen * Math.sin(angle - Math.PI / 6),
            );
            ctx.lineTo(
              end.x - headLen * Math.cos(angle + Math.PI / 6),
              end.y - headLen * Math.sin(angle + Math.PI / 6),
            );
            ctx.closePath();
            ctx.fill();
            break;
          }
          case 'rectangle': {
            if (shape.points.length < 2) break;
            const [s, e] = [shape.points[0], shape.points[shape.points.length - 1]];
            ctx.strokeRect(s.x, s.y, e.x - s.x, e.y - s.y);
            break;
          }
          case 'text': {
            if (!shape.text || shape.points.length === 0) break;
            ctx.font = '16px Inter, system-ui, sans-serif';
            ctx.fillText(shape.text, shape.points[0].x, shape.points[0].y);
            break;
          }
          case 'blur': {
            // Simulated blur: semi-transparent rectangles layered
            if (shape.points.length < 2) break;
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = '#888';
            for (let i = 1; i < shape.points.length; i++) {
              ctx.fillRect(shape.points[i].x - 8, shape.points[i].y - 8, 16, 16);
            }
            ctx.restore();
            break;
          }
        }
      }
    },
    [shapes],
  );

  // ── Resize canvas to viewport ────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  // ── Mouse handlers ───────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'text') {
      const pos = getPos(e);
      const text = prompt('Enter annotation text:');
      if (text) {
        setShapes((prev) => [
          ...prev,
          { tool: 'text', color, lineWidth: LINE_WIDTH, points: [pos], text },
        ]);
      }
      return;
    }

    setIsDrawing(true);
    const pos = getPos(e);
    currentShape.current = {
      tool,
      color,
      lineWidth: LINE_WIDTH,
      points: [pos],
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentShape.current) return;
    const pos = getPos(e);

    if (tool === 'freehand' || tool === 'blur') {
      currentShape.current.points.push(pos);
    } else {
      // For arrow & rectangle: keep start, update end
      currentShape.current.points = [currentShape.current.points[0], pos];
    }
    redraw(currentShape.current);
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentShape.current) return;
    setIsDrawing(false);
    setShapes((prev) => [...prev, currentShape.current!]);
    currentShape.current = null;
  };

  // ── Actions ──────────────────────────────────────────────────────────
  const undo = () => setShapes((prev) => prev.slice(0, -1));
  const clearAll = () => setShapes([]);

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `annotation-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Redraw whenever shapes change
  useEffect(() => {
    redraw();
  }, [shapes, redraw]);

  if (!isAnnotating) return null;

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'freehand', icon: Pen, label: 'Freehand' },
    { id: 'blur', icon: Droplets, label: 'Blur' },
  ];

  return (
    <>
      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          cursor: 'crosshair',
          pointerEvents: 'auto',
        }}
      />

      {/* Tools toolbar */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 15, 20, 0.92)',
          backdropFilter: 'blur(12px)',
          borderRadius: 12,
          padding: '6px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Tool buttons */}
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            title={label}
            style={{
              ...toolBtnStyle,
              background: tool === id ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)',
              color: tool === id ? '#EF4444' : '#fff',
            }}
          >
            <Icon size={16} />
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Color picker */}
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c,
              border: color === c ? '2px solid #fff' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
            }}
          />
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

        {/* Undo */}
        <button onClick={undo} title="Undo" style={toolBtnStyle}>
          <Undo2 size={16} />
        </button>

        {/* Clear all */}
        <button onClick={clearAll} title="Clear all" style={toolBtnStyle}>
          <Trash2 size={16} />
        </button>

        {/* Export */}
        <button onClick={exportImage} title="Save as PNG" style={toolBtnStyle}>
          <Download size={16} />
        </button>
      </div>
    </>
  );
};

const toolBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: 8,
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 150ms',
};

export default AnnotationOverlay;
