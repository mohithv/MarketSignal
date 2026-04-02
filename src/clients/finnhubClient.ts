import axios from "axios";
import { symbol } from "zod";

const BASE_URL = "https://finnhub.io/api/v1";

export const getStockQuote = async (symbol: string) => {

    const apiKey = process.env.FINNHUB_API_KEY;

    const response = await axios.get(`${BASE_URL}/quote`, {
        params: {
            symbol,
            token: apiKey,
        },
    });
    return response.data;
}
