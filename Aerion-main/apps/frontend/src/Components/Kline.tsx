import { useEffect, useRef } from "react";
import { ChartManager } from "../utils/ChartManager";
import { getKlines } from "../utils";
import { KLine } from "../types";

interface CurrentCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function TradeView({
  market,
  price,
}: {
  market: string;
  price: string;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartManagerRef = useRef<ChartManager | null>(null);
  const currentCandleRef = useRef<CurrentCandle | null>(null);
  const lastClosedCandleTimeRef = useRef<number | null>(null);
  const lastPriceRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize chart with historical data
  useEffect(() => {
    const init = async () => {
      let klineData: KLine[] = [];

      try {
        klineData = await getKlines(
          market,
          "1m",
          Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 7) / 1000),
          Math.floor(Date.now() / 1000)
        );
      } catch (e) {
        console.error("Error fetching Klines:", e);
      }

      if (chartRef.current) {
        if (chartManagerRef.current) {
          chartManagerRef.current.destroy();
        }

        const parsedData = klineData
          ?.map((x) => ({
            open: parseFloat(x.open),
            high: parseFloat(x.high),
            low: parseFloat(x.low),
            close: parseFloat(x.close),
            timestamp: new Date(x.end).getTime(),
          }))
          .sort((a, b) => a.timestamp - b.timestamp) || [];

        const chartManager = new ChartManager(chartRef.current, parsedData, {
          background: "#0e0f14",
          color: "white",
        });

        chartManagerRef.current = chartManager;

        // Set last closed candle time
        if (parsedData.length > 0) {
          lastClosedCandleTimeRef.current = parsedData[parsedData.length - 1].timestamp / 1000;
        }

        // Initialize current candle
        currentCandleRef.current = null;
      }
    };

    init();
  }, [market]);

  // Update chart with real-time price data
  useEffect(() => {
    const chartManager = chartManagerRef.current;
    if (!chartManager || !price) return;

    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return;

    lastPriceRef.current = numericPrice;
    updateChartWithPrice(numericPrice);
  }, [price]);

  // Periodic timer to move candles forward in time
  useEffect(() => {
    const chartManager = chartManagerRef.current;
    if (!chartManager) return;

    const updateTimer = setInterval(() => {
      const chartManager = chartManagerRef.current;
      if (!chartManager) return;

      const lastPrice = lastPriceRef.current;
      if (lastPrice > 0) {
        updateChartWithPrice(lastPrice);
      }
    }, 1000); // Update every second

    timerRef.current = updateTimer;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const updateChartWithPrice = (numericPrice: number) => {
    const chartManager = chartManagerRef.current;
    if (!chartManager) return;

    const now = Math.floor(Date.now() / 1000); // time in SECONDS
    const currentMinuteStart = Math.floor(now / 60) * 60;

    // If no current candle exists, create one
    if (!currentCandleRef.current) {
      currentCandleRef.current = {
        time: currentMinuteStart,
        open: numericPrice,
        high: numericPrice,
        low: numericPrice,
        close: numericPrice,
      };
      chartManager.update(currentCandleRef.current);
      return;
    }

    const currentCandle = currentCandleRef.current;

    // Check if we need to close current candle and start a new one
    if (currentMinuteStart > currentCandle.time) {
      // Close current candle
      lastClosedCandleTimeRef.current = currentCandle.time;

      // Start new candle
      currentCandleRef.current = {
        time: currentMinuteStart,
        open: numericPrice,
        high: numericPrice,
        low: numericPrice,
        close: numericPrice,
      };
      chartManager.update(currentCandleRef.current);
    } else {
      // Update current candle with new price
      currentCandle.close = numericPrice;
      currentCandle.high = Math.max(currentCandle.high, numericPrice);
      currentCandle.low = Math.min(currentCandle.low, numericPrice);

      chartManager.update(currentCandle);
    }
  };

  return (
    <div
      ref={chartRef}
      style={{ height: "520px", width: "100%", marginTop: 4 }}
    />
  );
}
