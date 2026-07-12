import React, { useEffect, useRef } from "react";

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  className?: string;
}

export function Barcode({ value, width = 2, height = 50, className }: BarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    
    // A VERY simple simulated barcode rendering using Canvas since we couldn't install bwip-js
    // This draws varying width vertical bars to simulate a barcode visually
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const canvas = canvasRef.current;
    
    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw
    ctx.fillStyle = '#000000';
    let x = 10;
    
    // Simple deterministic pattern based on the string
    for (let i = 0; i < value.length; i++) {
      const charCode = value.charCodeAt(i);
      const barWidth = (charCode % 3) + 1;
      const spaceWidth = ((charCode * 7) % 3) + 1;
      
      ctx.fillRect(x, 5, barWidth * width, height - 20);
      x += (barWidth + spaceWidth) * width;
    }
    
    // Text below
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(value, canvas.width / 2, height - 2);
    
  }, [value, width, height]);

  // Make canvas slightly wider than needed to ensure it fits
  const canvasWidth = value ? value.length * 10 * width + 20 : 200;

  return (
    <canvas 
      ref={canvasRef} 
      width={canvasWidth} 
      height={height} 
      className={className}
      style={{ maxWidth: '100%' }}
    />
  );
}
