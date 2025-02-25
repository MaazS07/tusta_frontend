import React, { useState, useEffect } from 'react';
import ChartCanvas from './ChartCanvas';
import AnalysisModal from './AnalysisModal';
import IndicatorButtons from './IndicatorButtons';
import TimeframeSelector from './TimeframeSelector';
import ToolBar from './ToolBar';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Trading = () => {
  const [timeframe, setTimeframe] = useState('1h');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null });
  const [currentTool, setCurrentTool] = useState('crosshair');
  const [chartData, setChartData] = useState([]); // Lifted up data state
  const [isLoading, setIsLoading] = useState(true); // Lifted up loading state
  const [indicators, setIndicators] = useState({
    showMA: false,
    showBB: false,
    showRSI: false
  });
  const [chartState, setChartState] = useState({
    scale: 1,
    offset: 0,
    isDragging: false,
    dragStart: null,
    showVolume: true,
    theme: 'light'
  });

  // Lifted up data fetching logic
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
        
        setChartData(processedData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[98%] mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">BINANACE_Chart</h1>
            <div className="text-sm text-gray-600">
              Use tools below for analysis
            </div>
          </div>
          
          <TimeframeSelector timeframe={timeframe} setTimeframe={setTimeframe} />
        </div>

        <ToolBar 
          currentTool={currentTool} 
          setCurrentTool={setCurrentTool}
          indicators={indicators}
          setIndicators={setIndicators}
          chartState={chartState}
          setChartState={setChartState}
        />

        <ChartCanvas
          timeframe={timeframe}
          currentTool={currentTool}
          indicators={indicators}
          chartState={chartState}
          setChartState={setChartState}
          setSelectedRange={setSelectedRange}
          setIsModalOpen={setIsModalOpen}
          data={chartData} // Pass down data
          isLoading={isLoading} // Pass down loading state
        />
      </div>

      {isModalOpen && (
        <AnalysisModal 
          selectedRange={selectedRange}
          setIsModalOpen={setIsModalOpen}
          data={chartData} // Pass the data to AnalysisModal
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Trading;