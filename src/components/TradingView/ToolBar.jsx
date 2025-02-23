import React from 'react';
import { Move, Square, Circle, TrendingUp, Settings } from 'lucide-react';

const ToolBar = ({ 
  currentTool, 
  setCurrentTool, 
  indicators, 
  setIndicators,
  chartState,
  setChartState
}) => {
  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200">
        <h1 className='text-black text-3xl'> Maaz Saboowala </h1>
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setCurrentTool('crosshair')}
          className={`p-2 rounded ${currentTool === 'crosshair' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          title="Crosshair"
        >
          <Move size={16} />
        </button>
        <button
          onClick={() => setCurrentTool('rectangle')}
          className={`p-2 rounded ${currentTool === 'rectangle' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
          title="Rectangle"
        >
          <Square size={16} />
        </button>
        <button
          onClick={() => setCurrentTool('ellipse')}
          className={`p-2 rounded ${currentTool === 'ellipse' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}title="Circle"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={() => setCurrentTool('trendline')}
            className={`p-2 rounded ${currentTool === 'trendline' ? 'bg-white shadow' : 'hover:bg-gray-200'}`}
            title="Trend Line"
          >
            <TrendingUp size={16} />
          </button>
        </div>
  
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => setIndicators(prev => ({ ...prev, showMA: !prev.showMA }))}
            className={`px-3 py-1 rounded text-sm ${indicators.showMA ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
          >
            MA
          </button>
          <button
            onClick={() => setIndicators(prev => ({ ...prev, showBB: !prev.showBB }))}
            className={`px-3 py-1 rounded text-sm ${indicators.showBB ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
          >
            BB
          </button>
          <button
            onClick={() => setIndicators(prev => ({ ...prev, showRSI: !prev.showRSI }))}
            className={`px-3 py-1 rounded text-sm ${indicators.showRSI ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
          >
            RSI
          </button>
        </div>
  
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={() => setChartState(prev => ({ ...prev, showVolume: !prev.showVolume }))}
            className={`px-3 py-1 rounded text-sm ${chartState.showVolume ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}
          >
            Volume
          </button>
          <button
            onClick={() => setChartState(prev => ({ 
              ...prev, 
              theme: prev.theme === 'light' ? 'dark' : 'light'
            }))}
            className="p-2 rounded hover:bg-gray-100"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    );
  };
  
  export default ToolBar;