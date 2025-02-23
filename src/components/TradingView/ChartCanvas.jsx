import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { drawShape, drawTrendLine, drawLine, isPointInShape } from '../utils/drawingUtils';
import { calculateMA, calculateBollingerBands } from '../utils/chartUtils';

const ChartCanvas = ({ 
  timeframe, 
  currentTool, 
  indicators, 
  chartState, 
  setChartState,
  setSelectedRange,
  setIsModalOpen 
}) => {
  const canvasRef = useRef(null);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectionStart, setSelectionStart] = useState(null);
  const [mousePosition, setMousePosition] = useState(null);
  const [shapes, setShapes] = useState([]);
  const [trendLines, setTrendLines] = useState([]);
  const [selectedShape, setSelectedShape] = useState(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${timeframe}&limit=100`
        );
        const rawData = await response.json();
        
        const processedData = rawData.map(d => ({
          time: new Date(d[0]),
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));
        
        setData(processedData);
        setIsLoading(false);
      } catch (error) {
        toast.error('Failed to fetch data');
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const getDateFromX = (x) => {
    if (!canvasRef.current || !data.length) return null;
    const candleWidth = (canvasRef.current.width / data.length) * chartState.scale;
    const index = Math.floor((x - chartState.offset) / candleWidth);
    return index >= 0 && index < data.length ? data[index].time : null;
  };

  const getPriceFromY = (y) => {
    if (!canvasRef.current || !data.length) return null;
    const chartHeight = canvasRef.current.height * 0.7;
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    
    return maxPrice - (y / chartHeight) * priceRange;
  };

  const sendCoordinatesToBackend = async (startPoint, endPoint) => {
    const startDate = getDateFromX(startPoint.x);
    const endDate = getDateFromX(endPoint.x);
    const startPrice = getPriceFromY(startPoint.y);
    const endPrice = getPriceFromY(endPoint.y);

    if (!startDate || !endDate) return;

    try {
      const response = await fetch('http://localhost:5000/trendline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start: {
            date: startDate.toISOString(),
            price: startPrice
          },
          end: {
            date: endDate.toISOString(),
            price: endPrice
          }
        }),
      });

      const data = await response.json();
      
      if (response.ok) { 
        toast.success('Coordinates sent successfully');
        setSelectedRange({ 
          start: { date: startDate, price: startPrice },
          end: { date: endDate, price: endPrice }
        });
        setIsModalOpen(true);

        // Reset shapes and trend lines after modal is opened
        setShapes([]);
        setTrendLines([]);
      } else {
        toast.error('Failed to send coordinates');
      }
    } catch (error) {
      toast.error('Failed to connect to server');
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;

    const ctx = canvas.getContext('2d'); 
    const { width, height } = canvas.getBoundingClientRect();
    
    canvas.width = width;
    canvas.height = height;

    // Chart area calculations
    const chartHeight = height * 0.7;
    const volumeHeight = height * 0.2;
    const spacing = height * 0.1;

    // Theme colors
    const colors = chartState.theme === 'light' ? {
      background: '#ffffff',
      grid: '#f0f0f0',
      text: '#333333',
      bullish: '#26a69a',
      bearish: '#ef5350'
    } : {
      background: '#1a1a1a',
      grid: '#2a2a2a',
      text: '#e0e0e0',
      bullish: '#4caf50',
      bearish: '#f44336'
    };

    // Clear and set background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 0.5;

    // Vertical grid
    for (let i = 0; i <= 10; i++) {
      const x = i * (width / 10);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }

    // Horizontal grid
    for (let i = 0; i <= 5; i++) {
      const y = i * (chartHeight / 5);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw candles
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const candleWidth = (width / data.length) * chartState.scale;
    const xOffset = chartState.offset;

    data.forEach((candle, i) => {
      const x = i * candleWidth + xOffset;
      if (x < -candleWidth || x > width) return;

      const bodyTop = chartHeight - ((Math.max(candle.open, candle.close) - minPrice) / priceRange) * chartHeight;
      const bodyBottom = chartHeight - ((Math.min(candle.open, candle.close) - minPrice) / priceRange) * chartHeight;
      const wickTop = chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
      const wickBottom = chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;

      // Draw wick
      ctx.beginPath();
      ctx.strokeStyle = candle.close >= candle.open ? colors.bullish : colors.bearish;
      ctx.lineWidth = 1;
      ctx.moveTo(x + candleWidth / 2, wickTop);
      ctx.lineTo(x + candleWidth / 2, wickBottom);
      ctx.stroke();

      // Draw candle body
      ctx.fillStyle = candle.close >= candle.open ? colors.bullish : colors.bearish;
      const bodyWidth = Math.max(candleWidth * 0.8, 1);
      ctx.fillRect(x + (candleWidth - bodyWidth) / 2, bodyTop, bodyWidth, bodyBottom - bodyTop);
    });

    // Draw technical indicators
    if (indicators.showMA) {
      const ma20 = calculateMA(data, 20);
      drawLine(ctx, ma20, width, chartHeight, minPrice, priceRange, candleWidth, xOffset, '#2196F3');
    }

    if (indicators.showBB) {
      const bb = calculateBollingerBands(data);
      drawLine(ctx, bb.map(b => b.upper), width, chartHeight, minPrice, priceRange, candleWidth, xOffset, '#9C27B0');
      drawLine(ctx, bb.map(b => b.lower), width, chartHeight, minPrice, priceRange, candleWidth, xOffset, '#9C27B0');
    }

    // Draw volume
    if (chartState.showVolume) {
      const volumes = data.map(d => d.volume);
      const maxVolume = Math.max(...volumes);
      
      data.forEach((candle, i) => {
        const x = i * candleWidth + xOffset;
        if (x < -candleWidth || x > width) return;

        const volumeHeight = (candle.volume / maxVolume) * (height * 0.2);
        const y = height - volumeHeight;

        ctx.fillStyle = candle.close >= candle.open ? 
          'rgba(38, 166, 154, 0.3)' : 
          'rgba(239, 83, 80, 0.3)';
        ctx.fillRect(x, y, candleWidth * 0.8, volumeHeight);
      });
    }

    // Draw shapes
    shapes.forEach(shape => {
      drawShape(ctx, shape);
    });

    // Draw trend lines
    trendLines.forEach(line => {
      drawTrendLine(ctx, line);
    });

    // Draw selection overlay
    if (selectionStart !== null && mousePosition !== null) {
      ctx.fillStyle = 'rgba(100, 149, 237, 0.2)';
      ctx.strokeStyle = 'rgba(100, 149, 237, 0.8)';
      ctx.lineWidth = 1;
      
      const width = mousePosition.x - selectionStart.x;
      const height = mousePosition.y - selectionStart.y;
      
      if (currentTool === 'rectangle') {
        ctx.fillRect(selectionStart.x, selectionStart.y, width, height);
        ctx.strokeRect(selectionStart.x, selectionStart.y, width, height);
      } else if (currentTool === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(
          selectionStart.x + width / 2,
          selectionStart.y + height / 2,
          Math.abs(width / 2),
          Math.abs(height / 2),
          0, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.stroke();
      } else if (currentTool === 'trendline') {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 140, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.moveTo(selectionStart.x, selectionStart.y);
        ctx.lineTo(mousePosition.x, mousePosition.y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    drawChart();
  }, [data, chartState, selectionStart, mousePosition, shapes, trendLines, indicators]);

  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentTool === 'select') {
      const clickedShape = shapes.find(shape => isPointInShape(x, y, shape));
      if (clickedShape) {
        setSelectedShape(clickedShape);
        return;
      }
    }

    if (['rectangle', 'ellipse', 'trendline'].includes(currentTool)) {
      setSelectionStart({ x, y });
    } else if (currentTool === 'crosshair') {
      setChartState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x, offset: prev.offset }
      }));
    }
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (selectedShape && currentTool === 'select') {
      // Move selected shape
      setShapes(shapes.map(shape => 
        shape.id === selectedShape.id
          ? { ...shape, x: x - shape.width / 2, y: y - shape.height / 2 }
          : shape
      ));
    } else if (selectionStart !== null) {
      setMousePosition({ x, y });
    } else if (chartState.isDragging) {
      const diff = x - chartState.dragStart.x;
      setChartState(prev => ({
        ...prev,
        offset: prev.dragStart.offset + diff
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (selectionStart !== null && mousePosition !== null) {
      if (['rectangle', 'ellipse'].includes(currentTool)) {
        const newShape = {
          id: Date.now(),
          type: currentTool,
          x: selectionStart.x,
          y: selectionStart.y,
          width: mousePosition.x - selectionStart.x,
          height: mousePosition.y - selectionStart.y
        };
        setShapes([...shapes, newShape]);
        sendCoordinatesToBackend(selectionStart, mousePosition);
      } else if (currentTool === 'trendline') {
        const newLine = {
          id: Date.now(),
          start: selectionStart,
          end: mousePosition
        };
        setTrendLines([...trendLines, newLine]);
        sendCoordinatesToBackend(selectionStart, mousePosition);
      }
    }
    
    setSelectionStart(null);
    setMousePosition(null);
    setSelectedShape(null);
    setChartState(prev => ({ ...prev, isDragging: false, dragStart: null }));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const newScale = chartState.scale * (e.deltaY > 0 ? 0.9 : 1.1);
    setChartState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(5, newScale))
    }));
  };

  return (
    <div className="relative h-[600px] w-full
    ">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}
      <canvas
  ref={canvasRef}
  className="w-[90vw] h-[80vh] cursor-crosshair"
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  onWheel={handleWheel}
  style={{ touchAction: 'none' }}  // Add this line
/>
    </div>
  );
};

export default ChartCanvas;