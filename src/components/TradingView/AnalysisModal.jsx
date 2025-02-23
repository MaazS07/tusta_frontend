import React from 'react';
import { format } from 'date-fns';
import { Trash2, Download, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { calculateVolatility, calculateTrades } from '../utils/chartUtils';

const AnalysisModal = ({ selectedRange, setIsModalOpen, data }) => {  // Added data prop
  if (!selectedRange.start || !selectedRange.end) return null;

  // Convert dates if they're strings
  const startDate = selectedRange.start instanceof Date ? selectedRange.start : new Date(selectedRange.start.date);
  const endDate = selectedRange.end instanceof Date ? selectedRange.end : new Date(selectedRange.end.date);

  const selectedData = data.filter(d => 
    d.time >= startDate && d.time <= endDate
  );

  const analysis = {
    highestPrice: Math.max(...selectedData.map(d => d.high)),
    lowestPrice: Math.min(...selectedData.map(d => d.low)),
    averagePrice: selectedData.reduce((acc, d) => acc + d.close, 0) / selectedData.length,
    totalVolume: selectedData.reduce((acc, d) => acc + d.volume, 0),
    priceChange: ((selectedData[selectedData.length - 1].close - selectedData[0].close) / selectedData[0].close) * 100,
    volatility: calculateVolatility(selectedData),
    trades: calculateTrades(selectedData)
  };

  const exportAnalysis = () => {
    const csvContent = `
Time Period,${format(startDate, 'PPp')} - ${format(endDate, 'PPp')}
Highest Price,$${analysis.highestPrice}
Lowest Price,$${analysis.lowestPrice}
Average Price,$${analysis.averagePrice}
Price Change,${analysis.priceChange}%
Volatility,${analysis.volatility}%
Total Volume,${analysis.totalVolume} BTC
Total Trades,${analysis.trades.total}
Buy Volume,${analysis.trades.buyVolume} BTC
Sell Volume,${analysis.trades.sellVolume} BTC
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-analysis-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Analysis exported successfully');
  };

  const saveAnalysis = () => {
    localStorage.setItem('savedAnalysis', JSON.stringify({
      ...analysis,
      timestamp: new Date().toISOString(),
      range: {
        start: startDate,
        end: endDate
      }
    }));
    toast.success('Analysis saved successfully');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-900">Advanced Analysis</h3>
            <div className="flex gap-2">
              <button 
                onClick={exportAnalysis}
                className="p-2 rounded-full hover:bg-gray-100"
                title="Export Analysis"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          <p className="text-gray-600 mt-2">
            {format(startDate, 'PPp')} - {format(endDate, 'PPp')}
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <AnalysisCard 
              title="Price Range"
              data={[
                { label: 'Highest', value: `$${analysis.highestPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                { label: 'Lowest', value: `$${analysis.lowestPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                { label: 'Average', value: `$${analysis.averagePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` }
              ]}
            />
            <AnalysisCard 
              title="Performance"
              data={[
                { 
                  label: 'Price Change', 
                  value: `${analysis.priceChange.toFixed(2)}%`,
                  className: analysis.priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                },
                { label: 'Volatility', value: `${analysis.volatility.toFixed(2)}%` },
                { label: 'Volume', value: `${analysis.totalVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })} BTC` }
              ]}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-500">Trading Activity</h4>
              <Info size={16} className="text-gray-400" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StatCard 
                label="Total Trades"
                value={analysis.trades.total}
              />
              <StatCard 
                label="Buy Volume"
                value={`${analysis.trades.buyVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                className="text-green-600"
              />
              <StatCard 
                label="Sell Volume"
                value={`${analysis.trades.sellVolume.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                className="text-red-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
            >
              Close
            </button>
            <button
              onClick={saveAnalysis}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Analysis
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AnalysisCard = ({ title, data }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <Info size={16} className="text-gray-400" />
    </div>
    <div className="mt-2 space-y-2">
      {data.map(({ label, value, className }) => (
        <div key={label} className="flex justify-between">
          <span className="text-gray-600">{label}</span>
          <span className={`font-semibold ${className || ''}`}>{value}</span>
        </div>
      ))}
    </div>
  </div>
);

const StatCard = ({ label, value, className }) => (
  <div>
    <p className="text-gray-600">{label}</p>
    <p className={`text-2xl font-semibold ${className || ''}`}>{value}</p>
  </div>
);

export default AnalysisModal;