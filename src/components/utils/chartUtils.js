export const calculateMA = (data, period) => {
    return data.map((_, index) => {
      if (index < period - 1) return null;
      const slice = data.slice(index - period + 1, index + 1);
      return slice.reduce((sum, candle) => sum + candle.close, 0) / period;
    });
  };
  
  export const calculateBollingerBands = (data, period = 20, stdDev = 2) => {
    const ma = calculateMA(data, period);
    return data.map((_, index) => {
      if (index < period - 1) return { upper: null, middle: ma[index], lower: null };
      const slice = data.slice(index - period + 1, index + 1);
      const avg = ma[index];
      const std = Math.sqrt(
        slice.reduce((sum, candle) => sum + Math.pow(candle.close - avg, 2), 0) / period
      );
      return {
        upper: avg + stdDev * std,
        middle: avg,
        lower: avg - stdDev * std
      };
    });
  };
  
  export const calculateVolatility = (data) => {
    const returns = data.slice(1).map((d, i) => 
      (d.close - data[i].close) / data[i].close
    );
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  };
  
  export const calculateTrades = (data) => {
    const buyVolume = data.reduce((acc, d) => 
      d.close > d.open ? acc + d.volume : acc, 0
    );
    const sellVolume = data.reduce((acc, d) => 
      d.close <= d.open ? acc + d.volume : acc, 0
    );
    return {
      total: data.length,
      buyVolume,
      sellVolume
    };
  };