import { Client } from 'pg';
import { Router } from "express";

const pgClient = new Client({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});
pgClient.connect();

export const klineRouter = Router();

klineRouter.get("/", async (req, res) => {
    const { symbol, interval, startTime, endTime } = req.query;

    // Validate required parameters
    if (!symbol || !interval) {
        return res.status(400).json({ error: 'Missing required parameters: symbol and interval' });
    }

    let query;
    switch (interval) {
        case '1m':
            query = `SELECT * FROM klines_1m WHERE bucket >= $1 AND bucket <= $2 AND symbol = $3 ORDER BY bucket ASC`;
            break;
        case '1h':
            query = `SELECT * FROM klines_1h WHERE bucket >= $1 AND bucket <= $2 AND symbol = $3 ORDER BY bucket ASC`;
            break;
        case '1w':
            query = `SELECT * FROM klines_1w WHERE bucket >= $1 AND bucket <= $2 AND symbol = $3 ORDER BY bucket ASC`;
            break;
        default:
            return res.status(400).json({ error: 'Invalid interval. Use: 1m, 1h, or 1w' });
    }

    try {
        //@ts-ignore
        const startTimestamp = startTime ? new Date(Number(startTime) * 1000) : new Date(Date.now() - 3600 * 1000); // last 1 hour
        const endTimestamp = endTime ? new Date(Number(endTime) * 1000) : new Date();

        const result = await pgClient.query(query, [startTimestamp, endTimestamp, symbol]);
        res.json(result.rows.map((x: any) => ({
            close: x.close,
            end: x.bucket,
            high: x.high,
            low: x.low,
            open: x.open,
            quoteVolume: x.quoteVolume,
            start: x.start,
            trades: x.trades,
            volume: x.volume,
        })));
    } catch (err) {
        console.error('Klines query error:', err);
        res.status(500).json({ error: 'Failed to fetch klines data', details: String(err) });
    }
});