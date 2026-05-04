import RedisManager from "../RedisManager";
import { updateKlines } from "../utils/Klines";
import { Orderbook, quoteAsset } from "./Orderbook";
import { Balance, side, order, requestPayload, DepthResponse, CreateOrderResponse, TradeStreamResponse, BalanceResponse, tickerResponse, createOrderPayload, fill } from "@repo/types/index"
import assert from "assert"
export class Engine {
    private orderBooks: Map<string, Orderbook> = new Map()
    private balances: Map<string, Balance> = new Map();
    private static instance: Engine;
    private constructor() {
        this.fillDummyData()
    }
    static getInstance() {
        if (!Engine.instance) {
            Engine.instance = new Engine();
        }
        return Engine.instance;
    }
    Process({ message, clientId }: requestPayload) {
        let response = Object();
        switch (message.Action) {
            case "CREATE_ORDER":
                response = this.createOrder({ ...message.Data, clientId })
                break

            case "CANCEL_ORDER":
                this.cancelOrder({ ...message.Data, clientId });
                response = {
                    message: "Order Cancelled"
                }
                break

            case "GET_BALANCE":
                response = {
                    e: "BALANCE",
                    id: message.Data.id,
                    balance: this.balances.get(message.Data.id)
                }
                break

            case "GET_TICKER":
                response = {
                    e: "TICKER",
                    symbol: message.Data.symbol,
                    price: this.orderBooks.get(message.Data.symbol)?.price
                }
                break

            case "GET_DEPTH":
                response = this.getDepth(message.Data.symbol)
                break
        }

        return response

    }
    fillDummyData() {
        const TEST_INR_ORDERBOOK = new Orderbook("TEST");
        const TATA_INR_ORDERBOOK = new Orderbook("TATA");
        this.balances.set("1", {
            balance: {
                available: 6000,
                locked: 0
            },
            "TATA": {
                available: 30,
                locked: 0
            },
            "TEST": {
                available: 30,
                locked: 0
            }
        })
        this.balances.set("2", {
            balance: {
                available: 4000,
                locked: 0
            },
            "TATA": {
                available: 10,
                locked: 0
            },
            "TEST": {
                available: 10,
                locked: 0
            }
        })
        this.balances.set("3", {
            balance: {
                available: 4000,
                locked: 0
            },
            "TATA": {
                available: 10,
                locked: 0
            },
            "TEST": {
                available: 10,
                locked: 0
            }
        })
        this.balances.set("4", {
            balance: {
                available: 4000,
                locked: 0
            },
            "TATA": {
                available: 10, locked: 0
            },
            "TEST": {
                available: 10, locked: 0
            }
        })
        this.balances.set("5", {
            balance: {
                available: 4000,
                locked: 0
            },
            "TATA": {
                available: 10,
                locked: 0
            },
            "TEST": {
                available: 10,
                locked: 0
            }
        })
        this.orderBooks.set("TEST_INR", TEST_INR_ORDERBOOK);
        this.orderBooks.set("TATA_INR", TATA_INR_ORDERBOOK);
    }
    createOrder({ clientId, amount, quantity, side, symbol }: createOrderPayload): CreateOrderResponse {
        const orderBook = this.orderBooks.get(symbol);
        assert(orderBook, `No order book found for symbol ${symbol}`)

        const User = this.balances.get(clientId)
        assert(User, "User Not Found!")

        const TotalPrice: number = amount * quantity
        const Market: string = symbol.split("_")[0]

        /* Ensure 1. (if bid) User has more than or atleast equal amount of quote asset `available` than how much they are willing to pay
                  2. (if ask) User has more than or atleast equal base asset `available` than how much they want to ask for */
        if ((side === "bid" && (User.balance.available || 0) >= TotalPrice) ||
            (side === "ask" && (User[symbol.split("_")[0]].available || 0) >= quantity)) {

            // Locking Balances
            if (side === "bid") {
                this.lockBalance(User, TotalPrice, clientId)
            }
            else {
                this.lockAsset(User, Market, quantity, clientId)
            }

            const orderId = Math.random().toString()

            const { fills, executedQuantity, updatedDepthParams } = orderBook.createOrder({
                orderId,
                amount,
                quantity,
                side,
                clientId,
            })
            this.handleBalances(side, User, executedQuantity, symbol, amount, clientId, quantity, fills, TotalPrice, orderBook)
            this.publishUpdatedDepth(symbol, updatedDepthParams)
            this.publishToBalance(clientId, {
                e: "BALANCE",
                balance: User,
                id: clientId
            })

            // Publishing into trade and ticker stream if any trade took place
            if (fills.length) {
                orderBook.price = fills.slice(-1)[0].price;
                this.publishToTicker(symbol, {
                    e: "TICKER",
                    s: symbol,
                    price: orderBook.price
                });
                fills.forEach((fill) => {
                    const tradeStreamData: TradeStreamResponse = {
                        e: "TRADE",
                        s: symbol,
                        p: String(fill.price),
                        q: String(executedQuantity)
                    }
                    this.publishToTrade(symbol, tradeStreamData);
                    updateKlines(symbol, fill.price, fill.quantity, new Date())
                        .catch(console.error); // To avoid unhandled promise rejection

                });
            }

            return {
                // removing clientId from returned fill
                fills: fills.map((fill) => {
                    const { clientId, ...updated_fill } = fill
                    return updated_fill
                }),
                executedQuantity,
                orderId
            }
        }
        else {
            throw new Error("Insufficient Balance")
        }
    }

    cancelOrder({ orderId, symbol, clientId }: {
        orderId: string,
        symbol: string,
        clientId: string
    }) {
        const orderBook = this.orderBooks.get(symbol);
        if (!orderBook) throw new Error(`No order book found for symbol ${symbol}`);

        const User = this.balances.get(clientId)
        assert(User, "User Not Found!")

        const order: order & { side: side } = orderBook.cancelOrder(orderId)
        let accumulatedAvailableQuantity
        const updatedDepthParams: DepthResponse = { e: "DEPTH", s: symbol, bids: [], asks: [] }
        switch (order.side) {
            case "bid":
                accumulatedAvailableQuantity = orderBook.bids.filter(e => e.amount === order.amount).reduce((sum, next) => sum + next.quantity, 0)
                updatedDepthParams.bids.push([order.amount, accumulatedAvailableQuantity])
                this.UnlockBalance(User, order.amount * order.quantity, clientId)
                break
            case "ask":
                accumulatedAvailableQuantity = orderBook.asks.filter(e => e.amount === order.amount).reduce((sum, next) => sum + next.quantity, 0)
                updatedDepthParams.asks.push([order.amount, accumulatedAvailableQuantity])
                this.UnlockAsset(User, symbol.split("_")[0], order.quantity, clientId)
                break
        }
        this.publishUpdatedDepth(symbol, updatedDepthParams)
    }

    getDepth(symbol: string) {
        const orderbook = this.orderBooks.get(symbol)
        const depth = orderbook?.getDepth()
        return depth
    }

    getOrderBook(symbol: string) {
        return this.orderBooks.get(symbol)
    }
    getBalance() {
        return this.balances
    }
    handleBalances(side: side, User: Balance, executedQuantity: number, symbol: string, amount: number, clientId: string, quantity: number, fills: fill[], TotalPrice: number, orderBook: Orderbook) {
        /* 
            After the Matching with orderbook will be done  one of three things will happen
            1. The order will not execute at all and will sit on the orderbook till some other comes and rescue it.
            2. The order will be partially executed and rest of it will sit on the orderbook for the same.
            3. The order will execute completely and will not sit on the orderbook at all

            What will happen in these cases:
            1. Nothing.
            2. i. (if bid) decrease the amount User has to pay for the executed amount from the locked quote asset and increase the balance of base asset by the executed amount
               ii. (if ask) decrease the balance of base asset by the executed amount and increase the amount User got for the executed amount from the locked quote asset
               iii. do conditionally opposite for all the users in the fills array.
            3. All Same as the previous condition.
        */
        if (!executedQuantity) return;
        const UserQuoteBalance = User.balance // "INR" -> {"available" : number, "locked": number}
        const UserBaseAsset = User[symbol.split("_")[0] as string] // TATA -> {"available" : number, "locked": number}

        if (side == "bid") {

            // Initializing Base Asset Only if it's User's the first time trading in this particular baseAsset 
            if (!UserBaseAsset) {
                User[symbol.split("_")[0] as string] = {
                    available: 0,
                    locked: 0
                }
            }

            // Increasing the base asset
            User[symbol.split("_")[0] as string].available += executedQuantity
            User.balance.locked -= (executedQuantity * amount)
            this.balances.set(clientId, User)

            fills.forEach((fill) => {
                const filler = this.balances.get(fill.clientId)

                // Turning locked balance to available if the trade was made on different price than what the user quoted earlier (Adding the (Price User was willing to pay earlier - Price User Paid) into available quoteAsset)
                UserQuoteBalance.available += (amount * fill.quantity - (fill.price * fill.quantity))
                this.balances.set(clientId, User)

                if (fill.completed) {
                    orderBook.removeOrder(fill.orderId, "ask")
                }
                if (filler) {
                    filler.balance.available += fill.quantity * fill.price;
                    filler[symbol.split("_")[0] as string].locked -= fill.quantity
                    this.balances.set(fill.clientId, filler)
                    this.publishToBalance(fill.clientId, {
                        e: "BALANCE",
                        balance: filler,
                        id: fill.clientId
                    })
                }
            })
        }
        else {
            User[symbol.split("_")[0] as string].locked -= executedQuantity
            this.balances.set(clientId, User)
            fills.forEach((fill) => {
                const filler = this.balances.get(fill.clientId)
                UserQuoteBalance.available += fill.price * fill.quantity
                this.balances.set(clientId, User)
                if (fill.completed) {
                    orderBook.removeOrder(fill.orderId, "bid")
                }
                if (filler) {
                    filler.balance.locked -= fill.quantity * fill.price;
                    filler[symbol.split("_")[0] as string].available += fill.quantity
                    this.balances.set(fill.clientId, filler)
                    this.publishToBalance(fill.clientId, {
                        e: "BALANCE",
                        balance: filler,
                        id: fill.clientId
                    })
                }
            })
        }
    }
    lockBalance(User: Balance, Amount: number, clientId: string) {
        User.balance.available -= Amount
        User.balance.locked += Amount
        this.balances.set(clientId, User)
    }
    UnlockBalance(User: Balance, Amount: number, clientId: string) {
        User.balance.available += Amount
        User.balance.locked -= Amount
        this.balances.set(clientId, User)
    }
    lockAsset(User: Balance, Market: string, Amount: number, clientId: string) {
        User[Market].available -= Amount
        User[Market].locked += Amount
        this.balances.set(clientId, User)
    }
    UnlockAsset(User: Balance, Market: string, Amount: number, clientId: string) {
        User[Market].available += Amount
        User[Market].locked -= Amount
        this.balances.set(clientId, User)
    }
    publishToTicker(symbol: string, data: tickerResponse) {
        RedisManager.getInstance().publishToWs(`depth@${symbol}`, data)
    }
    publishToBalance(clientId: string, data: BalanceResponse) {
        RedisManager.getInstance().publishToWs(`balance@${clientId}`, data)
    }
    publishToTrade(symbol: string, data: TradeStreamResponse) {
        RedisManager.getInstance().publishToWs(`trade@${symbol}`, data)
    }
    publishUpdatedDepth(symbol: string, updatedDepthParams: DepthResponse) {
        // problem => bids: [[100, 0], [100, 0]]
        const accumulatedData: { bids: { [key: number]: number }, asks: { [key: number]: number } } = {
            bids: {},
            asks: {}
        }
        updatedDepthParams.asks.forEach((ask) => {
            if (!accumulatedData.asks[ask[0]]) {
                accumulatedData.asks[ask[0]] = 0
            }
            accumulatedData.asks[ask[0]] += ask[1]
        })
        updatedDepthParams.bids.forEach((bid) => {
            if (!accumulatedData.bids[bid[0]]) {
                accumulatedData.bids[bid[0]] = 0
            }
            accumulatedData.bids[bid[0]] += bid[1]
        })
        const bids = Object.entries(accumulatedData.bids).map(arr => [Number(arr[0]), arr[1]])
        const asks = Object.entries(accumulatedData.asks).map(arr => [Number(arr[0]), arr[1]])

        RedisManager.getInstance().publishToWs(`depth@${symbol}`, { ...updatedDepthParams, bids, asks })
    }
}
