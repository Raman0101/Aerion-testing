import { BalanceResponse, DepthResponse, CreateOrderResponse, createOrderPayload, tickerResponse } from "@repo/types"
import { AxiosResponse } from "axios"
import axios from "axios"
import { KLine } from "../types"
export const API_URL = "http://localhost:3001"
//import problem
export function getTicker(symbol: string): Promise<AxiosResponse<tickerResponse>> {
	return axios.get<tickerResponse>(`${API_URL}/ticker`, {
		params: {
			symbol
		}
	})
}
export function getBalance(clientId: string): Promise<AxiosResponse<BalanceResponse>> {
	return axios.get<BalanceResponse>(`${API_URL}/balance`, {
		params: {
			clientId
		}
	})
}
export function getDepth(clientId: string, symbol: string): Promise<AxiosResponse<DepthResponse>> {
	return axios.get<DepthResponse>(`${API_URL}/depth`, {
		params: {
			clientId,
			symbol
		}
	})
}
export async function createOrder(payload: createOrderPayload): Promise<CreateOrderResponse> {
	const { data } = await axios.post<CreateOrderResponse>(`${API_URL}/order`, payload)
	return data
}


export async function getKlines(market: string, interval: string, startTime: number, endTime: number): Promise<KLine[]> {
	const response = await axios.get(`${API_URL}/klines?symbol=${market}&interval=${interval}&startTime=${startTime}&endTime=${endTime}`);
	const data: KLine[] = response.data;
	return data.sort((x, y) => (Number(x.end) < Number(y.end) ? -1 : 1));
}