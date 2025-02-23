import React from 'react';

const IndicatorButtons = ({ indicators, setIndicators }) => {
  const buttons = [
    { key: 'showMA', label: 'MA' },
    { key: 'showBB', label: 'BB' },
    { key: 'showRSI', label: 'RSI' }
  ];

  return (
    <div className="flex gap-2">
      {buttons.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setIndicators(prev => ({ ...prev, [key]: !prev[key] }))}
          className={`px-3 py-1 rounded text-sm ${
            indicators[key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default IndicatorButtons;