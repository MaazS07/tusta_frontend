export const drawShape = (ctx, shape) => {
    ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
    ctx.fillStyle = 'rgba(100, 149, 237, 0.2)';
    ctx.lineWidth = 1;
  
    if (shape.type === 'rectangle') {
      ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
      ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    } else if (shape.type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.width / 2,
        shape.y + shape.height / 2,
        Math.abs(shape.width / 2),
        Math.abs(shape.height / 2),
        0, 0, 2 * Math.PI
      );
      ctx.fill();
      ctx.stroke();
    }
  };
  
  export const drawTrendLine = (ctx, line) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.end.x, line.end.y);
    ctx.stroke();
  };
  
  export const isPointInShape = (x, y, shape) => {
    if (shape.type === 'rectangle') {
      return x >= shape.x && 
             x <= shape.x + shape.width && 
             y >= shape.y && 
             y <= shape.y + shape.height;
    } else if (shape.type === 'ellipse') {
      const centerX = shape.x + shape.width / 2;
      const centerY = shape.y + shape.height / 2;
      const normalizedX = (x - centerX) / (shape.width / 2);
      const normalizedY = (y - centerY) / (shape.height / 2);
      return (normalizedX * normalizedX + normalizedY * normalizedY) <= 1;
    }
    return false;
  };
  
  export const drawLine = (ctx, data, width, height, minPrice, priceRange, candleWidth, xOffset, color) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
  
    data.forEach((value, i) => {
      if (value === null) return;
      
      const x = i * candleWidth + xOffset + candleWidth / 2;
      const y = height - ((value - minPrice) / priceRange) * height;
      
      if (i === 0 || data[i - 1] === null) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  };