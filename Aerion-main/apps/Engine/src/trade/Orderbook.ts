import { DepthResponse, fill, order, side } from "@repo/types";
import assert from "assert"
export const quoteAsset = "INR"
export class Orderbook {

    bids: order[];
    asks: order[];
    price: number = 0
    baseAsset: string;
    quoteAsset: string = quoteAsset;
    symbol: string;

    constructor(baseAsset: string) {
        this.bids = [];
        this.asks = [];
        this.baseAsset = baseAsset
        this.symbol = `${baseAsset}_${this.quoteAsset}`
    }

    createOrder(order: order & { side: side }): { fills: fill[], executedQuantity: number, updatedDepthParams: DepthResponse } {

        // Mathing with existing orders
        const { fills, executedQuantity, updatedDepthParams } = this.matchOrder({ ...order })

        let accumulatedQuantity

        // Adding to OrderBook if not completely executed
        if (executedQuantity < order.quantity) {
            switch (order.side) {
                case "bid":
                    this.addToOrderBook({ ...order, quantity: order.quantity - executedQuantity }, this.bids)
                    accumulatedQuantity = this.bids.filter(e => e.amount === order.amount).reduce((total, order) => total + order.quantity, 0)
                    updatedDepthParams.bids.push([order.amount, accumulatedQuantity])
                    break;
                case "ask":
                    this.addToOrderBook({ ...order, quantity: order.quantity - executedQuantity }, this.asks)
                    accumulatedQuantity = this.asks.filter(e => e.amount === order.amount).reduce((total, order) => total + order.quantity, 0)
                    updatedDepthParams.asks.push([order.amount, accumulatedQuantity])
                    break;
            }
        }
        return { fills, executedQuantity, updatedDepthParams }
    }

    matchOrder(order: order & { side: side }): {
        fills: fill[],
        executedQuantity: number,
        updatedDepthParams: DepthResponse
    } {
        /* Match the given order with existing orderbook and returns out fills, executedQuantity, updatedDepthParams */
        let { executedQuantity, fills }: { executedQuantity: number, fills: fill[] } = { executedQuantity: 0, fills: [] }

        // Holds the record of trades which has been involved in trading and got updated, Which will later be used to publish the updated depth.
        let updatedDepthParams: DepthResponse = {
            e: "DEPTH",
            s: this.symbol,
            bids: [],
            asks: []
        }

        // Asks will be arranged in ascending order and bids will be arranged in descending.
        const book = order.side === "bid" ? this.asks.sort((a, b) => a.amount - b.amount) : this.bids.sort((a, b) => b.amount - a.amount)

        switch (order.side) {
            case "bid":
                for (let index = 0; index < book.length; index++) {
                    const compare_order = book[index];
                    if (compare_order.amount <= order.amount && order.clientId !== compare_order.clientId) {
                        executedQuantity = Math.min(compare_order.quantity, order.quantity)
                        let executedPrice = compare_order.amount
                        order.quantity -= executedQuantity
                        compare_order.quantity -= executedQuantity
                        fills.push({
                            orderId: compare_order.orderId,
                            price: executedPrice,
                            quantity: executedQuantity,
                            clientId: compare_order.clientId,
                            completed: compare_order.quantity ? false : true
                        })
                        updatedDepthParams["asks"].push([compare_order.amount, compare_order.quantity])
                        if (order.quantity === 0) {
                            break
                        }
                    }
                }
                break;

            case "ask":
                for (let index = 0; index < book.length; index++) {
                    const compare_order = book[index];
                    if (order.amount <= compare_order.amount && order.clientId !== compare_order.clientId) {
                        executedQuantity = Math.min(compare_order.quantity, order.quantity)
                        let executedPrice = compare_order.amount
                        order.quantity -= executedQuantity
                        compare_order.quantity -= executedQuantity
                        fills.push({
                            orderId: compare_order.orderId,
                            price: executedPrice,
                            quantity: executedQuantity,
                            clientId: compare_order.clientId,
                            completed: compare_order.quantity ? false : true
                        })
                        updatedDepthParams["bids"].push([compare_order.amount, compare_order.quantity])
                        if (order.quantity === 0) {
                            break
                        }
                    }
                }
                break;
        }
        return {
            fills,
            executedQuantity,
            updatedDepthParams
        }
    }

    cancelOrder(orderId: string) {
        const index = this.bids.findIndex(o => o.orderId === orderId)
        if (index === -1) {
            const index = this.asks.findIndex(o => o.orderId === orderId)
            assert(index !== -1, "No Order Found!")

            const order = { ...this.asks[index], side: "ask" as side }
            this.asks.splice(index, 1)
            return order
        }
        const order = { ...this.bids[index], side: "bid" as side }
        this.bids.splice(index, 1)
        return order
    }

    getDepth(): DepthResponse {
        const depth: DepthResponse = {
            e: "DEPTH",
            s: this.symbol,
            bids: [],
            asks: []
        }
        const sortedBids = this.bids.sort((a, b) => b.amount - a.amount)
        const sortedAsks = this.asks.sort((a, b) => a.amount - b.amount)
        if (sortedAsks.length) for (let id = 0; id < sortedAsks.length; id++) {
            const ask = sortedAsks[id];
            if (depth.asks.length && depth.asks[depth.asks.length - 1][0] === ask.amount) {
                depth.asks[depth.asks.length - 1] = [depth.asks[depth.asks.length - 1][0], depth.asks[depth.asks.length - 1][1] + ask.quantity];
                continue
            }
            depth.asks.push([
                ask.amount, ask.quantity
            ])
        }

        if (sortedBids.length) for (let id = 0; id < sortedBids.length; id++) {
            const bid = sortedBids[id];
            if (depth.bids.length && depth.bids[depth.bids.length - 1][0] === bid.amount) {
                depth.bids[depth.bids.length - 1] = [depth.bids[depth.bids.length - 1][0], depth.bids[depth.bids.length - 1][1] + bid.quantity];
                continue
            }
            depth.bids.push([
                bid.amount, bid.quantity
            ])
        }
        return depth
    }

    addToOrderBook(order: order, book: order[]) {
        if (order.quantity) {
            book.push({
                orderId: order.orderId,
                amount: order.amount,
                quantity: order.quantity,
                clientId: order.clientId
            })
        }
    }

    removeOrder(orderId: string, side: side) {
        switch (side) {
            case "bid":
                this.bids = this.bids.filter(order => order.orderId !== orderId)
                break
            case "ask":
                this.asks = this.asks.filter(order => order.orderId !== orderId)
                break
        }
    }
}
