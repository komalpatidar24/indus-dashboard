import { useState, useEffect } from 'react';

/* ══════════════════════════════════════════════════════════════
   Frankfurter API  —  https://api.frankfurter.dev
   Free, no key, ~30 currencies, base = any ISO code
══════════════════════════════════════════════════════════════ */
const API_BASE = 'https://api.frankfurter.dev/v1';

/* All 30 currencies from Frankfurter API — https://api.frankfurter.dev/v1/currencies */
export const CURRENCIES = [
    { code: 'INR', symbol: '₹',   name: 'Indian Rupee'           },
    { code: 'USD', symbol: '$',   name: 'US Dollar'               },
    { code: 'EUR', symbol: '€',   name: 'Euro'                    },
    { code: 'GBP', symbol: '£',   name: 'British Pound'           },
    { code: 'JPY', symbol: '¥',   name: 'Japanese Yen'            },
    { code: 'AUD', symbol: 'A$',  name: 'Australian Dollar'       },
    { code: 'CAD', symbol: 'C$',  name: 'Canadian Dollar'         },
    { code: 'CHF', symbol: '₣',   name: 'Swiss Franc'             },
    { code: 'CNY', symbol: '¥',   name: 'Chinese Renminbi Yuan'   },
    { code: 'SGD', symbol: 'S$',  name: 'Singapore Dollar'        },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar'        },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar'      },
    { code: 'SEK', symbol: 'kr',  name: 'Swedish Krona'           },
    { code: 'NOK', symbol: 'kr',  name: 'Norwegian Krone'         },
    { code: 'DKK', symbol: 'kr',  name: 'Danish Krone'            },
    { code: 'MYR', symbol: 'RM',  name: 'Malaysian Ringgit'       },
    { code: 'THB', symbol: '฿',   name: 'Thai Baht'               },
    { code: 'KRW', symbol: '₩',   name: 'South Korean Won'        },
    { code: 'IDR', symbol: 'Rp',  name: 'Indonesian Rupiah'       },
    { code: 'PHP', symbol: '₱',   name: 'Philippine Peso'         },
    { code: 'BRL', symbol: 'R$',  name: 'Brazilian Real'          },
    { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso'            },
    { code: 'ZAR', symbol: 'R',   name: 'South African Rand'      },
    { code: 'TRY', symbol: '₺',   name: 'Turkish Lira'            },
    { code: 'PLN', symbol: 'zł',  name: 'Polish Złoty'            },
    { code: 'CZK', symbol: 'Kč',  name: 'Czech Koruna'            },
    { code: 'HUF', symbol: 'Ft',  name: 'Hungarian Forint'        },
    { code: 'RON', symbol: 'lei', name: 'Romanian Leu'            },
    { code: 'ILS', symbol: '₪',   name: 'Israeli New Shekel'      },
    { code: 'ISK', symbol: 'kr',  name: 'Icelandic Króna'         },
];

/* Fallback rates (1 INR → X) used when API is unreachable */
const FALLBACK = {
    INR: 1,       USD: 0.01190,  EUR: 0.01099,  GBP: 0.00940,
    JPY: 1.8182,  AUD: 0.01852,  CAD: 0.01639,  CHF: 0.01042,
    CNY: 0.08621, SGD: 0.01613,  HKD: 0.09302,  NZD: 0.02000,
    SEK: 0.12987, NOK: 0.12821,  DKK: 0.07299,  MYR: 0.05556,
    THB: 0.42373, KRW: 16.129,   IDR: 189.39,   PHP: 0.67568,
    BRL: 0.06250, MXN: 0.20408,  ZAR: 0.22222,  TRY: 0.39063,
    PLN: 0.04717, CZK: 0.27027,  HUF: 4.3478,   RON: 0.05495,
    ILS: 0.04348, ISK: 1.6393,
};

/* ── Module-level cache (shared across all dashboard instances) ── */
let _cache   = null;   // { rates: {code: rate}, fetchedAt: ms }
let _flight  = null;   // in-flight Promise

async function loadRates() {
    if (_flight) return _flight;
    /* Serve from cache if < 30 min old */
    if (_cache && Date.now() - _cache.fetchedAt < 30 * 60 * 1000) {
        return _cache.rates;
    }
    _flight = (async () => {
        try {
            /* Frankfurter returns rates relative to the base currency.
               We use INR as base so rates[USD] = how many USD per 1 INR */
            /* No symbols filter — fetch all 30 currencies with INR as base */
            const res = await fetch(
                `${API_BASE}/latest?base=INR`,
                { signal: AbortSignal.timeout(6000) }
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const rates = { INR: 1, ...json.rates };
            _cache = { rates, fetchedAt: Date.now() };
            return rates;
        } catch (err) {
            console.warn('[useCurrencyRates] API failed, using fallback:', err.message);
            return { ...FALLBACK };
        } finally {
            _flight = null;
        }
    })();
    return _flight;
}

/**
 * useCurrencyRates()
 * Returns { rates, loading, updatedAt, refreshRates }
 *
 * rates[code] = how many <code> units per 1 INR
 *   e.g. rates.USD ≈ 0.0119  →  1 INR = 0.0119 USD
 */
export function useCurrencyRates() {
    const [rates,     setRates]     = useState(_cache?.rates ?? FALLBACK);
    const [loading,   setLoading]   = useState(!_cache);
    const [updatedAt, setUpdatedAt] = useState(_cache?.fetchedAt ?? null);

    const fetch = () => {
        setLoading(true);
        loadRates().then(r => {
            setRates(r);
            setUpdatedAt(_cache?.fetchedAt ?? Date.now());
            setLoading(false);
        });
    };

    useEffect(() => {
        let alive = true;
        setLoading(true);
        loadRates().then(r => {
            if (!alive) return;
            setRates(r);
            setUpdatedAt(_cache?.fetchedAt ?? Date.now());
            setLoading(false);
        });
        return () => { alive = false; };
    }, []);

    return { rates, loading, updatedAt, refreshRates: fetch };
}

/**
 * convertFromINR(amountINR, toCurrencyCode, rates)
 */
export function convertFromINR(amount, code, rates) {
    if (code === 'INR' || !amount) return amount;
    return amount * (rates[code] ?? FALLBACK[code] ?? 1);
}

/**
 * formatCurrency(amountINR, currencyCode, rates)
 * Returns a compact, human-readable string.
 */
export function formatCurrency(amount, code, rates) {
    if (amount == null || amount === '—') return '—';
    const num = parseFloat(amount);
    if (isNaN(num)) return String(amount);

    const rate = rates?.[code] ?? FALLBACK[code] ?? 1;
    const v    = code === 'INR' ? num : num * rate;
    const sym  = CURRENCIES.find(c => c.code === code)?.symbol ?? code;
    const abs  = Math.abs(v);

    if (code === 'INR') {
        if (abs >= 1e7) return `${sym}${(v / 1e7).toFixed(2)} Cr`;
        if (abs >= 1e5) return `${sym}${(v / 1e5).toFixed(2)} L`;
        if (abs >= 1e3) return `${sym}${(v / 1e3).toFixed(1)} K`;
        return `${sym}${v.toLocaleString('en-IN')}`;
    }
    if (code === 'JPY') {
        if (abs >= 1e9) return `${sym}${(v / 1e9).toFixed(2)}B`;
        if (abs >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
        return `${sym}${Math.round(v).toLocaleString()}`;
    }
    if (abs >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sym}${(v / 1e3).toFixed(2)}K`;
    return `${sym}${v.toFixed(2)}`;
}
