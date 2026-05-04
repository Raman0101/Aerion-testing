import {
    ColorType,
    createChart as createLightWeightChart,
    CrosshairMode,
    ISeriesApi,
    UTCTimestamp,
} from "lightweight-charts";

export class ChartManager {
    private candleSeries: ISeriesApi<"Candlestick">;
    private chart: any;
    private allCandles: Map<number, any> = new Map();

    constructor(
        ref: any,
        initialData: any[],
        layout: { background: string; color: string }
    ) {
        const chart = createLightWeightChart(ref, {
            autoSize: true,
            overlayPriceScales: {
                ticksVisible: true,
                borderVisible: true,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
                visible: true,
                ticksVisible: true,
                entireTextOnly: true,
            },
            grid: {
                horzLines: {
                    visible: false,
                },
                vertLines: {
                    visible: false,
                },
            },
            layout: {
                background: {
                    type: ColorType.Solid,
                    color: layout.background,
                },
                textColor: "white",
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });
        this.chart = chart;
        this.candleSeries = chart.addCandlestickSeries({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderDownColor: "#ef5350",
            borderUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            wickUpColor: "#26a69a",
        });

        // Convert and store initial data
        const convertedData = initialData.map((data) => {
            const timeInSeconds = Math.floor(data.timestamp / 1000);
            this.allCandles.set(timeInSeconds, {
                time: timeInSeconds as UTCTimestamp,
                open: data.open,
                high: data.high,
                low: data.low,
                close: data.close,
            });
            return this.allCandles.get(timeInSeconds);
        });

        if (convertedData.length > 0) {
            this.candleSeries.setData(convertedData);
            // Auto-scale the chart to fit all data
            this.chart.timeScale().fitContent();
        }
    }

    public update(updatedCandle: any) {
        // Ensure we're working with numeric timestamp in seconds
        const timeInSeconds = typeof updatedCandle.time === 'number' 
            ? updatedCandle.time 
            : Math.floor(updatedCandle.time / 1000);

        const candleData = {
            time: timeInSeconds as UTCTimestamp,
            close: Number(updatedCandle.close),
            low: Number(updatedCandle.low),
            high: Number(updatedCandle.high),
            open: Number(updatedCandle.open),
        };

        // Store or update the candle
        this.allCandles.set(timeInSeconds, candleData);

        // Update the chart with the new candle
        this.candleSeries.update(candleData);

        // Keep the most recent candle visible
        this.chart.timeScale().scrollToPosition(10, false);
    }

    public destroy() {
        this.chart.remove();
    }
}
