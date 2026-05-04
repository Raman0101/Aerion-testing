import { Pool } from 'pg';

/**
 * Updates kline materialized view with new trade data
 */

// Create a pool of connections
const pool = new Pool({
    user: 'your_user',
    host: 'localhost',
    database: 'my_database',
    password: 'your_password',
    port: 5432,
});

type Interval = "1m" | "1h" | "1w";

/**
 * Returns the bucket start time based on interval
 */
function getBucketStartTime(date: Date, interval: Interval): Date {
    const d = new Date(date);

    switch (interval) {
        case "1m":
            d.setSeconds(0, 0);
            break;
        case "1h":
            d.setMinutes(0, 0, 0);
            break;
        case "1w":
            const day = d.getDay(); // 0 (Sun) - 6 (Sat)
            d.setDate(d.getDate() - day); // Set to previous Sunday
            d.setHours(0, 0, 0, 0);
            break;
    }

    return d;
}

/**
 * Updates the klines materialized view (1 hour interval) by inserting trade data
 */
export async function updateKlines(symbol: string, price: number, quantity: number, timestamp: Date, interval: Interval = "1m") {
    const client = await pool.connect();

    try {
        const bucketStartTime = getBucketStartTime(timestamp, interval); // Calculate bucket start time

        // Insert new trade data into tata_prices table (the base table for the materialized view)
        await client.query(`
            INSERT INTO tata_prices (time, price, volume, currency_code)
            VALUES ($1, $2, $3, $4);
        `, [
            bucketStartTime, // time
            price,           // price
            quantity,        // volume
            symbol           // currency_code
        ]);

        // Refresh the materialized view after inserting the new data
        await client.query('REFRESH MATERIALIZED VIEW klines_1h;');

        console.log('Klines updated successfully');
    } catch (error) {
        console.error('Error updating klines_1h:', error);
    } finally {
        client.release(); // Release the client back to the pool
    }
}

// Test with an example
updateKlines("TATA_INR", 100, 50, new Date());
