import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Income, Expense, Currency } from '../types';
import { firestoreService } from '../services/firestoreService';
import { formatCurrency } from '../constants';
import { geminiService } from '../services/geminiService';

// =============================================================================
// CHART COMPONENTS
// =============================================================================

interface TooltipData {
  x: number;
  y: number;
  content: React.ReactNode;
}

const LineChart: React.FC<{ data: { labels: string[]; datasets: { label: string; data: number[]; color: string }[] }; currency: Currency }> = ({ data, currency }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const chartWidth = 500;
  const chartHeight = 300;
  const padding = 50;

  const maxValue = Math.max(...data.datasets.flatMap(ds => ds.data), 0);
  const yAxisMax = maxValue > 0 ? Math.ceil(maxValue / 1000) * 1000 : 1000;

  const xStep = data.labels.length > 1 ? (chartWidth - 2 * padding) / (data.labels.length - 1) : 0;

  const points = data.datasets.map(dataset =>
    dataset.data.map((value, index) => ({
      x: padding + (index * xStep),
      y: chartHeight - padding - (value / yAxisMax) * (chartHeight - 2 * padding),
    }))
  );

  const pathData = points.map(datasetPoints =>
    datasetPoints.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x} ${p.y}`).join(' ')
  );

  const yAxisLabels = Array.from({ length: 6 }, (_, i) => yAxisMax - i * (yAxisMax / 5));

  const handleMouseOver = (e: React.MouseEvent<SVGCircleElement>, datasetIndex: number, pointIndex: number) => {
    const content = (
      <>
        <div className="font-bold">{data.labels[pointIndex]}</div>
        <div>
          <span style={{ color: data.datasets[datasetIndex].color }}>●</span> {data.datasets[datasetIndex].label}: {formatCurrency(data.datasets[datasetIndex].data[pointIndex], currency)}
        </div>
      </>
    );
    setTooltip({ x: e.clientX, y: e.clientY, content });
  };

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#4a5568" />
        {yAxisLabels.map((label, i) => (
          <g key={i}>
            <text x={padding - 10} y={padding + i * (chartHeight - 2 * padding) / 5} textAnchor="end" alignmentBaseline="middle" fill="#a0aec0" fontSize="10">
              {label / 1000}k
            </text>
            <line x1={padding} x2={chartWidth - padding} y1={padding + i * (chartHeight - 2 * padding) / 5} stroke="#374151" strokeDasharray="2" />
          </g>
        ))}
        {/* X-axis */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#4a5568" />
        {data.labels.map((label, i) => (
          <text key={i} x={padding + i * xStep} y={chartHeight - padding + 20} textAnchor="middle" fill="#a0aec0" fontSize="10">
            {label}
          </text>
        ))}

        {/* Data lines */}
        {pathData.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={data.datasets[i].color} strokeWidth="2" />
        ))}
        {/* Data points with tooltips */}
        {points.map((datasetPoints, dsIndex) =>
          datasetPoints.map((p, pIndex) => (
            <circle
              key={`${dsIndex}-${pIndex}`}
              cx={p.x}
              cy={p.y}
              r="4"
              fill={data.datasets[dsIndex].color}
              stroke="#1f2937"
              strokeWidth="2"
              onMouseOver={(e) => handleMouseOver(e, dsIndex, pIndex)}
              onMouseOut={() => setTooltip(null)}
            />
          ))
        )}
      </svg>
      {tooltip && (
        <div className="absolute bg-gray-900 text-white p-2 rounded-md shadow-lg text-sm" style={{ left: tooltip.x + 15, top: tooltip.y + 15, pointerEvents: 'none' }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[]; currency: Currency }> = ({ data, currency }) => {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  const handleMouseOver = (e: React.MouseEvent<SVGPathElement | SVGCircleElement>, item: { label: string; value: number }) => {
    const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
    const content = (
      <>
        <div className="font-bold">{item.label}</div>
        <div>{formatCurrency(item.value, currency)} ({percentage}%)</div>
      </>
    );
    setTooltip({ x: e.clientX, y: e.clientY, content });
  };

  if (total === 0) {
    return (
      <div className="flex justify-center items-center h-full text-gray-400">
        No expense data for this period.
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 relative">
      <svg width="200" height="200" viewBox="0 0 200 200">
        <g transform="rotate(-90 100 100)">
          {data.map((item, index) => {
            const percentage = item.value / total;
            const strokeDasharray = `${percentage * circumference} ${circumference}`;
            const transform = `rotate(${accumulatedAngle * 360}, 100, 100)`;
            accumulatedAngle += percentage;
            return (
              <circle
                key={index}
                cx="100" cy="100" r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={strokeDasharray}
                transform={transform}
                onMouseOver={(e) => handleMouseOver(e, item)}
                onMouseOut={() => setTooltip(null)}
              />
            );
          })}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fill="#fff" fontSize="16" fontWeight="bold">
          Total
        </text>
        <text x="50%" y="50%" textAnchor="middle" dy="1.5em" fill="#a0aec0" fontSize="12">
          {formatCurrency(total, currency)}
        </text>
      </svg>
      <div className="text-sm">
        {data.map((item, index) => (
          <div key={index} className="flex items-center mb-1">
            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      {tooltip && (
        <div className="absolute bg-gray-900 text-white p-2 rounded-md shadow-lg text-sm" style={{ left: tooltip.x + 15, top: tooltip.y + 15, pointerEvents: 'none' }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const FinancialReports: React.FC<{ currency: Currency }> = ({ currency }) => {
  const [income, setIncome] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<number | null>(30); // 7, 30, 90, null (all time)

  // AI Forecast State
  const [forecast, setForecast] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  const handleGenerateForecast = async () => {
    setIsForecasting(true);
    setForecast(null);
    try {
      const result = await geminiService.generateRevenueForecast(income, expenses);
      setForecast(result);
    } catch (error) {
      console.error("Failed to generate forecast:", error);
      setForecast("Не вдалося згенерувати прогноз. Будь ласка, спробуйте пізніше.");
    } finally {
      setIsForecasting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [incomeData, expenseData] = await Promise.all([
          firestoreService.getIncome(),
          firestoreService.getExpenses(),
        ]);
        setIncome(incomeData);
        setExpenses(expenseData);
      } catch (error) {
        console.error("Failed to fetch financial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    const endDate = new Date();
    const startDate = new Date();

    // Explicitly check for number type to avoid TS errors in arithmetic operations involving null/undefined
    if (typeof dateRange === 'number') {
      startDate.setDate(endDate.getDate() - dateRange);
    } else {
      startDate.setFullYear(1970); // All time
    }

    // Convert to timestamps for safe numeric comparison
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const filteredIncome = income.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });

    const filteredExpenses = expenses.filter(item => {
      const itemTime = new Date(item.date).getTime();
      return itemTime >= startTime && itemTime <= endTime;
    });

    return {
      filteredIncome,
      filteredExpenses,
    };
  }, [income, expenses, dateRange]);

  const lineChartData = useMemo(() => {
    const { filteredIncome, filteredExpenses } = filteredData;
    const allDates = [...filteredIncome.map(i => i.date), ...filteredExpenses.map(e => e.date)];
    const uniqueDates = [...new Set(allDates)].sort();

    if (uniqueDates.length === 0) return { labels: [], datasets: [] };

    const incomeByDate = filteredIncome.reduce((acc: Record<string, number>, item: Income) => {
      acc[item.date] = (acc[item.date] || 0) + Number(item.amount);
      return acc;
    }, {} as Record<string, number>);

    const expensesByDate = filteredExpenses.reduce((acc: Record<string, number>, item: Expense) => {
      const uPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const current = acc[item.date] || 0;
      acc[item.date] = current + (uPrice * qty);
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: uniqueDates,
      datasets: [
        { label: 'Income', data: uniqueDates.map(date => incomeByDate[date] || 0), color: '#34d399' },
        { label: 'Expenses', data: uniqueDates.map(date => expensesByDate[date] || 0), color: '#f87171' },
      ]
    };
  }, [filteredData]);

  const pieChartData = useMemo(() => {
    const { filteredExpenses } = filteredData;
    const expensesByCategory = filteredExpenses.reduce<Record<string, number>>((acc, item) => {
      const uPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.quantity) || 0;
      const cat = item.category || 'Other';
      const current = acc[cat] || 0;
      acc[cat] = current + (uPrice * qty);
      return acc;
    }, {});

    const colors = ['#6366f1', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#84cc16'];
    return Object.entries(expensesByCategory)
      .map(([label, value], index) => ({
        label,
        value,
        color: colors[index % colors.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  if (loading) {
    return <div className="text-center p-8">Loading financial reports...</div>;
  }

  const PeriodButton: React.FC<{ period: number | null, label: string }> = ({ period, label }) => (
    <button
      onClick={() => setDateRange(period)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === period ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 p-4 rounded-lg flex flex-wrap items-center gap-4">
        <h2 className="text-xl font-bold">Date Range</h2>
        <div className="flex gap-2">
          <PeriodButton period={7} label="Last 7 Days" />
          <PeriodButton period={30} label="Last 30 Days" />
          <PeriodButton period={90} label="Last 90 Days" />
          <PeriodButton period={null} label="All Time" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Income vs. Expense Trend</h3>
          {lineChartData.labels.length > 1 ? (
            <LineChart data={lineChartData} currency={currency} />
          ) : (
            <div className="flex justify-center items-center h-full text-gray-400 min-h-[300px]">
              Not enough data for a trend line.
            </div>
          )}
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Expense Breakdown by Category</h3>
          <DonutChart data={pieChartData} currency={currency} />
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;