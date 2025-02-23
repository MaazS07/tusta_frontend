import React from 'react';

const TimeframeSelector = ({ timeframe, setTimeframe }) => {
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

  return (
    <div className="flex gap-2">
      {timeframes.map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf)}
          className={`px-4 py-2 rounded ${
            timeframe === tf
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {tf}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;