import axios from "axios";

const BASE_URL = "https://finnhub.io/api/v1";

type FinnhubQuoteResponse = {
    c: number;
    d: number;
    dp: number;
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

    const response = await axios.get<FinnhubQuoteResponse>(`${BASE_URL}/quote`, {
        params: {
            symbol,
            token: apiKey,
        },
    });
    console.log("finnhub api:", response.data);
    return response.data;
}
