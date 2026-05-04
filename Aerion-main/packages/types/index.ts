export type side = "bid" | "ask"

// Payload to Push data from api server to queue 
export type requestPayload = {
    message: messageFromAPI,
    clientId: string,
    id?: string
}
export type messageFromAPI = {
    Action: "CREATE_ORDER",
    Data: {
        side: side,
        amount: number,
        quantity: number,
        symbol: string
    }
} | {
    Action: "CANCEL_ORDER",
    Data: {
        orderId: string,
        symbol: string
    }
} | {
    Action: "GET_DEPTH",
    Data: {
        symbol: string
    }
} | {
    Action: "GET_BALANCE",
    Data: {
        id: string
    }
} | {
    Action: "GET_TICKER",
    Data: {
        symbol: string
    }
}

// Types used in storing data in Engine
export type Balance = {

    // Quote Balance => INR
    balance: {
        available: number,
        locked: number
    },

    // Stock Balance : "TATA" or "TEST"
    [key: string]: {
        available: number,
        locked: number
    },
}
export type order = {
    orderId: string,
    amount: number,
    quantity: number,
    clientId: string
}
export type fill = {
    orderId: string,
    price: number,
    quantity: number,
    clientId: string,
    completed: boolean
}

// TODO: add a GET /trade endpoint ( Used just in frontend so far )
export type TradeApiResponse = {
    amount: string,
    quantity: string
}[]


// Used In Frontend state types
export type createOrderPayload = {
    side: "bid" | "ask",
    amount: number,
    quantity: number,
    symbol: string,
    clientId: string
}


// From Engine : 

// To Api
export type CreateOrderResponse = {
    fills: Omit<fill, "clientId">[]
    executedQuantity: number,
    orderId: string
}

// to Web Socket
export type TradeStreamResponse = {
    e: "TRADE",
    s: string,
    p: string,
    q: string
}

// to both (Web Socket & API)
export type DepthResponse = {
    e: "DEPTH",
    s: string,
    
    // bids : [price, quantity][]
    bids: [number, number][],

    // asks : [price, quantity][] 
    asks: [number, number][]
}

export interface KLineResponse {
    e: "KLINES"
    close: string;
    end: string;
    high: string;
    low: string;
    open: string;
    quoteVolume: string;
    start: string;
    trades: string;
    volume: string;
}
// to both (Web Socket & API)
export type BalanceResponse = {
    e: "BALANCE",
    id: string,
    balance: Balance
}

// to both (Web Socket & API)
export type tickerResponse = {
    e: "TICKER",
    s: string,
    price: number
}
