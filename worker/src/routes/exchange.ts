import { Hono } from 'hono';
import type { Env } from '../types';

type Variables = { deviceId: string };

export const exchangeRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── Supported currencies ────────────────────────────────────────────
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CNY', 'NGN', 'CAD'] as const;

interface ExchangeRateResponse {
  rates: Record<string, number>;
  base: string;
  updated_at: string;
}

/**
 * GET /rates
 *
 * Fetches live exchange rates with GHS as the base currency.
 * Uses the free open.er-api.com endpoint (no API key required).
 * Caches response for 1 hour via Cache-Control headers.
 *
 * Returns: { rates: { USD: number, EUR: number, ... }, base: 'GHS', updated_at: string }
 * The rates represent how much 1 unit of each foreign currency costs in GHS.
 * e.g., rates.USD = 16.50 means 1 USD = 16.50 GHS.
 */
exchangeRoutes.get('/rates', async (c) => {
  try {
    // Fetch USD-based rates from free API
    const res = await fetch('https://open.er-api.com/v6/latest/USD');

    if (!res.ok) {
      return c.json({ error: 'Failed to fetch exchange rates' }, 502);
    }

    const data = (await res.json()) as {
      result: string;
      rates: Record<string, number>;
      time_last_update_utc: string;
    };

    if (data.result !== 'success' || !data.rates) {
      return c.json({ error: 'Invalid response from exchange rate provider' }, 502);
    }

    const usdToGhs = data.rates['GHS'];
    if (!usdToGhs || usdToGhs <= 0) {
      return c.json({ error: 'GHS rate not available' }, 502);
    }

    // Convert: for each currency, compute how many GHS per 1 unit of that currency
    // Formula: 1 CURRENCY = (usdToGhs / usdToCurrency) GHS
    const ghsRates: Record<string, number> = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      const usdToCurrency = data.rates[currency];
      if (usdToCurrency && usdToCurrency > 0) {
        // Round to 4 decimal places
        ghsRates[currency] = Math.round((usdToGhs / usdToCurrency) * 10000) / 10000;
      }
    }

    const response: ExchangeRateResponse = {
      rates: ghsRates,
      base: 'GHS',
      updated_at: data.time_last_update_utc || new Date().toISOString(),
    };

    return c.json(response, 200, {
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (err) {
    return c.json({ error: 'Exchange rate service unavailable' }, 503);
  }
});
