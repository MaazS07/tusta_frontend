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
  const [availablePairs, setAvailablePairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('BTCUSDT');
  const [crosshairPosition, setCrosshairPosition] = useState(null);

  // Fetch available trading pairs from Binance
  useEffect(() => {
    const fetchAvailablePairs = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/exchangeInfo');
        const data = await response.json();
        
        const pairs = data.symbols
          .filter(symbol => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
          .map(symbol => symbol.symbol);
        
        setAvailablePairs(pairs);
      } catch (error) {
        console.error('Failed to fetch available pairs:', error);
        // Set some default pairs as fallback
        setAvailablePairs(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT']);
      }
    };

    fetchAvailablePairs();
  }, []);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${selectedPair}&interval=${timeframe}&limit=100`
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
  }, [timeframe, selectedPair]);

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

  const getIndexFromX = (x) => {
    if (!canvasRef.current || !data.length) return -1;
    const candleWidth = (canvasRef.current.width / data.length) * chartState.scale;
    const index = Math.floor((x - chartState.offset) / candleWidth);
    return index >= 0 && index < data.length ? index : -1;
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
        
        // Reset shapes and trend lines immediately
        setShapes([]);
        setTrendLines([]);
      } else {
        toast.error('Failed to send coordinates');
      }
    } catch (error) {
      // Making the backend response optional
      console.error('Failed to connect to backend server:', error);
      // Still set the selected range and open modal even if backend fails
      setSelectedRange({ 
        start: { date: startDate, price: startPrice },
        end: { date: endDate, price: endPrice }
      });
      setIsModalOpen(true);
      
      // Reset shapes and trend lines here too in case of backend failure
      setShapes([]);
      setTrendLines([]);
    }
  };

  const drawCrosshair = (ctx, x, y) => {
    const { width, height } = canvasRef.current;
    const chartHeight = height * 0.7;
    
    // Save current context state
    ctx.save();
    
    // Set dashed line style
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = chartState.theme === 'light' ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.5;
    
    // Draw vertical line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    // Draw horizontal line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    
    // If inside chart area, show price and date labels
    if (y <= chartHeight) {
      const price = getPriceFromY(y);
      const date = getDateFromX(x);
      const index = getIndexFromX(x);
      
      if (price && date && index >= 0) {
        // Draw price label on y-axis
        ctx.setLineDash([]);
        ctx.fillStyle = chartState.theme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(40, 40, 40, 0.8)';
        ctx.fillRect(0, y - 10, 60, 20);
        ctx.fillStyle = chartState.theme === 'light' ? '#ffffff' : '#e0e0e0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(price.toFixed(2), 30, y + 4);
        
        // Draw date label on x-axis
        ctx.fillStyle = chartState.theme === 'light' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(40, 40, 40, 0.8)';
        ctx.fillRect(x - 50, height - 20, 100, 20);
        ctx.fillStyle = chartState.theme === 'light' ? '#ffffff' : '#e0e0e0';
        ctx.textAlign = 'center';
        ctx.fillText(date.toLocaleString(), x, height - 7);
        
        // Draw tooltip with OHLC data near cursor
        if (index >= 0 && index < data.length) {
          const candle = data[index];
          const tooltipWidth = 120;
          const tooltipHeight = 80;
          let tooltipX = x + 10;
          let tooltipY = y + 10;
          
          // Adjust tooltip position if it would go off-screen
          if (tooltipX + tooltipWidth > width) tooltipX = x - tooltipWidth - 10;
          if (tooltipY + tooltipHeight > height) tooltipY = y - tooltipHeight - 10;
          
          // Draw tooltip background
          ctx.fillStyle = chartState.theme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(30, 30, 30, 0.9)';
          ctx.strokeStyle = chartState.theme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
          
          // Draw tooltip content
          ctx.fillStyle = chartState.theme === 'light' ? '#333333' : '#e0e0e0';
          ctx.textAlign = 'left';
          ctx.font = 'bold 11px Arial';
          ctx.fillText(selectedPair, tooltipX + 5, tooltipY + 15);
          ctx.font = '11px Arial';
          ctx.fillText(`O: ${candle.open.toFixed(2)}`, tooltipX + 5, tooltipY + 30);
          ctx.fillText(`H: ${candle.high.toFixed(2)}`, tooltipX + 5, tooltipY + 45);
          ctx.fillText(`L: ${candle.low.toFixed(2)}`, tooltipX + 5, tooltipY + 60);
          ctx.fillText(`C: ${candle.close.toFixed(2)}`, tooltipX + 5, tooltipY + 75);
        }
      }
    }
    
    // Restore context
    ctx.restore();
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

    // Draw price scales on Y-axis
    const prices = data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    
    ctx.fillStyle = colors.text;
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 5; i++) {
      const y = i * (chartHeight / 5);
      const price = maxPrice - (i / 5) * priceRange;
      ctx.fillText(price.toFixed(2), 5, y + 10);
    }

    // Draw candles
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

    // Draw time labels on X-axis
    ctx.fillStyle = colors.text;
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    // Only draw every nth label to avoid overcrowding
    const labelStep = Math.max(1, Math.floor(data.length / 10));
    
    for (let i = 0; i < data.length; i += labelStep) {
      const x = i * candleWidth + xOffset;
      if (x >= 0 && x <= width) {
        const date = data[i].time;
        const dateStr = date.toLocaleDateString();
        ctx.fillText(dateStr, x, height - 5);
      }
    }

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
    
    // Draw crosshair at current mouse position
    if (crosshairPosition && (currentTool === 'crosshair' || currentTool === 'select')) {
      drawCrosshair(ctx, crosshairPosition.x, crosshairPosition.y);
    }
  };

  useEffect(() => {
    drawChart();
  }, [data, chartState, selectionStart, mousePosition, shapes, trendLines, indicators, crosshairPosition, selectedPair]);

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
    
    // Update crosshair position
    setCrosshairPosition({ x, y });

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
        // Create temporary shape references
        const newShape = {
          id: Date.now(),
          type: currentTool,
          x: selectionStart.x,
          y: selectionStart.y,
          width: mousePosition.x - selectionStart.x,
          height: mousePosition.y - selectionStart.y
        };
        
        // Add shape temporarily for visual feedback
        setShapes([...shapes, newShape]);
        
        // Send coordinates to backend and reset shapes regardless of response
        sendCoordinatesToBackend(selectionStart, mousePosition)
          .catch(error => {
            // Silently catch error to make backend optional
            console.warn('Backend connection failed, but continuing with local operation');
            
            // Reset shapes here too in case of failure
            setShapes([]);
            setTrendLines([]);
          });
      } else if (currentTool === 'trendline') {
        // Create temporary trendline reference
        const newLine = {
          id: Date.now(),
          start: selectionStart,
          end: mousePosition
        };
        
        // Add trendline temporarily for visual feedback
        setTrendLines([...trendLines, newLine]);
        
        // Send coordinates to backend and reset trendlines regardless of response
        sendCoordinatesToBackend(selectionStart, mousePosition)
          .catch(error => {
            // Silently catch error to make backend optional
            console.warn('Backend connection failed, but continuing with local operation');
            
            // Reset trendlines here too in case of failure
            setShapes([]);
            setTrendLines([]);
          });
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

  const handlePairChange = (e) => {
    setSelectedPair(e.target.value);
    setIsLoading(true);
    setChartState(prev => ({
      ...prev,
      offset: 0,
      scale: 1
    }));
    
    // Reset any shapes or trendlines when changing pairs
    setShapes([]);
    setTrendLines([]);
  };

  const handleMouseLeave = () => {
    setCrosshairPosition(null);
    handleMouseUp();
  };

  return (
    <div className="relative h-[600px] w-full">
      <div className="flex items-center mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
        <label htmlFor="pair-select" className="mr-2 text-sm font-medium">Trading Pair:</label>
        <select 
          id="pair-select"
          value={selectedPair}
          onChange={handlePairChange}
          className="p-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availablePairs.length > 0 ? (
            availablePairs.map(pair => (
              <option key={pair} value={pair}>{pair}</option>
            ))
          ) : (
            <option value="BTCUSDT">BTCUSDT</option>
          )}
        </select>
        <div className="ml-4 text-sm">
          <span className="font-medium mr-1">Current:</span>
          {data.length > 0 ? (
            <span className={data[data.length - 1].close > data[data.length - 1].open ? 'text-green-500' : 'text-red-500'}>
              {data[data.length - 1].close.toFixed(2)} USD
            </span>
          ) : (
            'Loading...'
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="w-[100vw] h-[80vh] cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default ChartCanvas;