import axios from "axios";

const BASE_URL = "https://finnhub.io/api/v1";

type FinnhubQuoteResponse = {
    c: number;
    d: number | null;
    dp: number | null;
    h: number;
    l: number;
    o: number;
    pc: number;
    t: number;
};

export const getStockQuote = async (symbol: string) => {

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error("Missing FINNHUB_API_KEY env var");
    }

    try {
        const response = await axios.get<FinnhubQuoteResponse>(`${BASE_URL}/quote`, {
            params: {
                symbol,
                token: apiKey,
            },
        });

        console.log("finnhub status:", response.status);
        console.log("finnhub api:", response.data);

        if (response.data?.c === 0 && response.data?.t === 0) {
            throw new Error(
                `Empty Finnhub quote for symbol '${symbol}'. This usually means an invalid symbol/exchange format (e.g. try AAPL, TSLA, or RELIANCE.NS) or no data.`
            );
        }

        return response.data;
    } catch (err: any) {
        const status = err?.response?.status;
        const body = err?.response?.data;
        console.error("finnhub request failed:", { status, body });
        throw err;
    }
}
