import { Engine } from "../trade/Engine";
import { describe, it, expect, beforeEach, should } from "vitest";
import { side } from "@repo/types";

function clearAllOrders() {
    const orderBook = Engine.getInstance().getOrderBook("TEST_INR")
    if (!orderBook) return
    [...orderBook.bids].forEach((bid) => {
        Engine.getInstance().Process({
            clientId: bid.clientId,
            message: {
                Action: "CANCEL_ORDER",
                Data: {
                    orderId: bid.orderId,
                    symbol: "TEST_INR"
                }
            }
        });
    })
    const allAsks = [...orderBook.asks]
    allAsks.forEach((ask) => {
        Engine.getInstance().Process({
            clientId: ask.clientId,
            message: {
                Action: "CANCEL_ORDER",
                Data: {
                    orderId: ask.orderId,
                    symbol: "TEST_INR"
                }
            }
        });
    })
}



describe('Order Processing Tests', () => {
    // Basic Orders Tests
    describe('Basic Orders', () => {
        it('should handle bid and ask orders correctly', () => {
            Engine.getInstance().Process({
                clientId: "1",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 900,
                        quantity: 1,
                        side: "bid" as side,
                        symbol: "TEST_INR"
                    }
                }
            }) || "";
            Engine.getInstance().Process({
                clientId: "2",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            const orderBook = Engine.getInstance().getOrderBook("TEST_INR");

            expect(orderBook?.bids.length).toBe(1);
            expect(orderBook?.asks.length).toBe(1);
        });
    });

    // Balance Updates Tests
    describe('Order Processing and Balance Updates', () => {
        it('should process a bid order and update balances accordingly', () => {
            Engine.getInstance().Process({
                clientId: "3",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 1,
                        side: "bid" as side,
                        symbol: "TEST_INR"
                    }
                }
            });

            const orderBook = Engine.getInstance().getOrderBook("TEST_INR");
            const balances = Engine.getInstance().getBalance();

            expect(orderBook?.asks.length).toBe(0);
            expect(orderBook?.bids.length).toBe(1);
            expect(balances.get("3")?.balance.available).toBe(3000);
            expect(balances.get("2")?.balance.available).toBe(5000);
        });

        it('should partially fill an order and update balances', () => {
            expect(Engine.getInstance().getBalance().get("1")?.balance.locked).toBe(900);
            Engine.getInstance().Process({
                clientId: "3",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 900,
                        quantity: 0.5,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            const balances = Engine.getInstance().getBalance();

            expect(balances.get("3")?.balance.available).toBe(3450);
            expect(balances.get("3")?.["TEST"].available).toBe(10.5);

            expect(balances.get("1")?.balance.available).toBe(5100);
            expect(balances.get("1")?.balance.locked).toBe(450);
            expect(balances.get("1")?.["TEST"].available).toBe(30.5);
        });

        it('should handle a partially filled order with executed amount', () => {
            Engine.getInstance().Process({
                clientId: "3",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 800,
                        quantity: 0.1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            const balances = Engine.getInstance().getBalance();

            expect(balances.get("3")?.balance.available).toBe(3540);
            expect(balances.get("3")?.["TEST"].available).toBe(10.4);

            expect(balances.get("1")?.balance.available).toBe(5100);
            expect(balances.get("1")?.balance.locked).toBe(360);
            expect(balances.get("1")?.["TEST"].available).toBe(30.6);
        });
        it('should clear order', () => {
            clearAllOrders()
            const beforeClientBalance = Engine.getInstance().getBalance().get("4")?.balance
            const id = Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 500,
                        quantity: 1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            }).orderId || "";
            Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CANCEL_ORDER",
                    Data: {
                        orderId: id,
                        symbol: "TEST_INR"
                    }
                }
            });
            expect(Engine.getInstance().getBalance().get("4")?.balance).toBe(beforeClientBalance)
        });


        it('should handle a partially filled order with executed amount', () => {
            Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 400,
                        quantity: 1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            expect(Engine.getInstance().getBalance().get("4")?.["TEST"].locked).toBe(1);
            expect(Engine.getInstance().getBalance().get("4")?.["TEST"].available).toBe(9);
            Engine.getInstance().Process({
                clientId: "5",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 500,
                        quantity: 2,
                        side: "bid" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            // Only One quantity gets satisfied

            const balances = Engine.getInstance().getBalance();
            expect(balances.get("5")?.balance.available).toBe(3100);
            expect(balances.get("5")?.balance.locked).toBe(500);
            expect(balances.get("5")?.["TEST"].available).toBe(11);

            expect(balances.get("4")?.["TEST"].available).toBe(9);
            expect(balances.get("4")?.["TEST"].locked).toBe(0);
            expect(balances.get("4")?.balance.available).toBe(4400);
        });
    });

    // Self-Trading Tests
    describe('Self-Trading Prevention', () => {
        it('should prevent self-trading', () => {
            Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 1,
                        side: "bid" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });

            const orderBook = Engine.getInstance().getOrderBook("TEST_INR");
            expect(orderBook?.bids.length).toBe(2);
            expect(orderBook?.asks.length).toBe(1);
        });
    });


    describe("Getting Depth", () => {
        it("should clear all orders first", () => {
            clearAllOrders()
            expect(Engine.getInstance().getOrderBook("TEST_INR")?.bids.length).toBe(0)
            expect(Engine.getInstance().getOrderBook("TEST_INR")?.asks.length).toBe(0)
        })

        it('should add bulk orders from multiple users without triggering immediate trades', () => {
            // Define bulk orders for users
            const bulkOrders = [
                { clientId: "3", amount: 2000, quantity: 0.8, side: "ask" as side },
                { clientId: "4", amount: 1000, quantity: 0.8, side: "ask" as side },
                { clientId: "3", amount: 1000, quantity: 1.4, side: "ask" as side },
                { clientId: "4", amount: 900, quantity: 0.3, side: "ask" as side },
                { clientId: "1", amount: 800, quantity: 1.3, side: "bid" as side },
                { clientId: "1", amount: 750, quantity: 0.78, side: "bid" as side },
                { clientId: "5", amount: 750, quantity: 2.8, side: "bid" as side },
                { clientId: "2", amount: 700, quantity: 0.8, side: "bid" as side }
            ];

            // Add bid orders
            bulkOrders.filter(order => order.side === "bid").forEach(order => {
                Engine.getInstance().Process({
                    clientId: order.clientId,
                    message: {
                        Action: "CREATE_ORDER",
                        Data: {
                            amount: order.amount,
                            quantity: order.quantity,
                            side: order.side,
                            symbol: "TEST_INR"
                        }
                    }
                });
            });

            // Add ask orders
            bulkOrders.filter(order => order.side === "ask").forEach(order => {
                Engine.getInstance().Process({
                    clientId: order.clientId,
                    message: {
                        Action: "CREATE_ORDER",
                        Data: {
                            amount: order.amount,
                            quantity: order.quantity,
                            side: order.side,
                            symbol: "TEST_INR"
                        }
                    }
                });
            });
        })
        it("should get depth", () => {
            expect(Engine.getInstance().Process({
                clientId: "1",
                message: {
                    Action: "GET_DEPTH",
                    Data: {
                        symbol: "TEST_INR"
                    }
                }
            })).toBeTypeOf(typeof { bids: [[Number, Number]], asks: [[Number, Number]] })
        })
    })
    describe("Checking Depth Update", () => {
        it("should clear all orders first", () => {
            clearAllOrders()
            expect(Engine.getInstance().getOrderBook("TEST_INR")?.bids.length).toBe(0)
            expect(Engine.getInstance().getOrderBook("TEST_INR")?.asks.length).toBe(0)
        })
        it("Getting Depth Update", () => {
            Engine.getInstance().Process({
                clientId: "4",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 1,
                        side: "ask" as side,
                        symbol: "TEST_INR"
                    }
                }
            });
            Engine.getInstance().Process({
                clientId: "5",
                message: {
                    Action: "CREATE_ORDER",
                    Data: {
                        amount: 1000,
                        quantity: 2,
                        side: "bid" as side,
                        symbol: "TEST_INR"
                    }
                }
            });

        })
    })
});
