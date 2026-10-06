import React, { useState } from 'react';
import { Candle } from '../types/index.js';
import { useLanguage } from '../context/LanguageContext.js';

interface StockChartProps {
  candles: Candle[];
  symbol: string;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export const StockChart: React.FC<StockChartProps> = ({
  candles,
  symbol,
  selectedPeriod,
  onPeriodChange
}) => {
  const { formatCurrency } = useLanguage();
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const periods = ['1D', '1W', '1M', '3M', '6M', '1Y'];

  if (!candles || candles.length === 0) {
    return (
      <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        No price history available for {symbol}.
      </div>
    );
  }

  const width = 800;
  const height = 320;
  const paddingBottom = 40;
  const volumeHeight = 50;
  const priceHeight = height - paddingBottom - volumeHeight;

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);

  const minPrice = Math.min(...lows) * 0.99;
  const maxPrice = Math.max(...highs) * 1.01;
  const priceRange = maxPrice - minPrice || 1;

  const maxVolume = Math.max(...volumes) || 1;

  const getX = (index: number) => {
    if (candles.length === 1) return width / 2;
    return (index / (candles.length - 1)) * (width - 60) + 10;
  };

  const getY = (val: number) => {
    return priceHeight - ((val - minPrice) / priceRange) * priceHeight + 15;
  };

  const getVolY = (vol: number) => {
    const barH = (vol / maxVolume) * volumeHeight;
    return height - paddingBottom - barH;
  };

  // Build SVG Path for line chart
  const points = candles.map((c, i) => `${getX(i)},${getY(c.close)}`);
  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${getX(candles.length - 1)},${priceHeight + 15} L ${getX(0)},${priceHeight + 15} Z`;

  const isNetBullish = candles[candles.length - 1].close >= candles[0].close;
  const lineColor = isNetBullish ? 'var(--color-bull)' : 'var(--color-bear)';
  const areaGradientId = isNetBullish ? 'bullGrad' : 'bearGrad';

  const activeCandle = hoveredIndex !== null ? candles[hoveredIndex] : candles[candles.length - 1];

  return (
    <div style={{ width: '100%' }}>
      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {periods.map(p => (
            <button
              key={p}
              className={`btn btn-sm ${selectedPeriod === p ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onPeriodChange(p)}
              style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className={`btn btn-sm ${chartType === 'line' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setChartType('line')}
            title="Line / Area View"
          >
            Line
          </button>
          <button
            className={`btn btn-sm ${chartType === 'candle' ? 'btn-secondary' : 'btn-ghost'}`}
            onClick={() => setChartType('candle')}
            title="Candlestick View"
          >
            Candles
          </button>
        </div>
      </div>

      {/* Crosshair readout */}
      {activeCandle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.82rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <span>Date: <strong style={{ color: 'var(--text-main)' }}>{activeCandle.date}</strong></span>
          <span>O: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(activeCandle.open)}</strong></span>
          <span>H: <strong style={{ color: 'var(--color-bull)' }}>{formatCurrency(activeCandle.high)}</strong></span>
          <span>L: <strong style={{ color: 'var(--color-bear)' }}>{formatCurrency(activeCandle.low)}</strong></span>
          <span>C: <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(activeCandle.close)}</strong></span>
          <span>Vol: <strong style={{ color: 'var(--color-primary)' }}>{activeCandle.volume.toLocaleString()}</strong></span>
        </div>
      )}

      {/* SVG Canvas */}
      <div style={{ position: 'relative', width: '100%', height: '320px', background: 'rgba(8, 12, 20, 0.5)', borderRadius: 'var(--radius-md)', padding: '0.5rem', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          preserveAspectRatio="none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="bullGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="bearGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const price = minPrice + priceRange * (1 - pct);
            const y = priceHeight * pct + 15;
            return (
              <g key={idx}>
                <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                <text x={width - 5} y={y - 4} fill="rgba(255,255,255,0.3)" fontSize="10" textAnchor="end">
                  {price.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Volume Bars */}
          {candles.map((c, i) => {
            const x = getX(i);
            const y = getVolY(c.volume);
            const barW = Math.max(2, (width / candles.length) * 0.65);
            const isGreen = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - barW / 2}
                y={y}
                width={barW}
                height={height - paddingBottom - y}
                fill={isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
              />
            );
          })}

          {/* Price Graph */}
          {chartType === 'line' ? (
            <>
              <path d={areaPath} fill={`url(#${areaGradientId})`} />
              <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            // Candlesticks
            candles.map((c, i) => {
              const x = getX(i);
              const isUp = c.close >= c.open;
              const candleColor = isUp ? 'var(--color-bull)' : 'var(--color-bear)';
              const candleW = Math.max(3, (width / candles.length) * 0.7);
              
              const openY = getY(c.open);
              const closeY = getY(c.close);
              const highY = getY(c.high);
              const lowY = getY(c.low);
              const bodyTop = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={`candle-${i}`}>
                  {/* Wick */}
                  <line x1={x} y1={highY} x2={x} y2={lowY} stroke={candleColor} strokeWidth="1.2" />
                  {/* Body */}
                  <rect
                    x={x - candleW / 2}
                    y={bodyTop}
                    width={candleW}
                    height={bodyHeight}
                    fill={isUp ? candleColor : candleColor}
                    rx="1"
                  />
                </g>
              );
            })
          )}

          {/* Interactive invisible hover triggers across columns */}
          {candles.map((_, i) => {
            const x = getX(i);
            const colW = width / candles.length;
            return (
              <rect
                key={`hover-${i}`}
                x={x - colW / 2}
                y="0"
                width={colW}
                height={height}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIndex(i)}
              />
            );
          })}

          {/* Hover crosshair line */}
          {hoveredIndex !== null && (
            <line
              x1={getX(hoveredIndex)}
              y1="0"
              x2={getX(hoveredIndex)}
              y2={height - paddingBottom}
              stroke="rgba(56, 189, 248, 0.6)"
              strokeDasharray="2 2"
            />
          )}
        </svg>
      </div>
    </div>
  );
};
