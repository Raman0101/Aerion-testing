use std::convert::TryFrom;
use std::collections::HashMap;

use prost::Message;
use rand::Rng;
use redis::{Commands, Connection};
use serde_json::json;

use crate::types::{BalanceType, Fill, Order};
use crate::{
    custom_types::{
        message_to_engine::{
            self, MessageToEngine, MessageToEngineType,
        },
    },
    types::{MessageFromApi, UserBalance},
};

use super::orderbook::Orderbook;
use base64::prelude::*;

pub struct Engine {
    pub orderbooks: Vec<Orderbook>,
    pub balances: HashMap<String, UserBalance>,
}

impl Engine {

    pub fn new() -> Engine {
        let orderbooks = vec![
            Orderbook::new(Vec::new(), Vec::new(), "TATA".to_string(), "INR".to_string(), 0, 0),
            Orderbook::new(Vec::new(), Vec::new(), "TEST".to_string(), "INR".to_string(), 0, 0),
        ];

        let mut balances: HashMap<String, UserBalance> = HashMap::new();
        for user_id in ["1", "2", "3", "4", "5"] {
            let mut balance = HashMap::new();
            balance.insert("INR".to_string(), BalanceType { available: 100000, locked: 0 });
            balance.insert("TATA".to_string(), BalanceType { available: 1000, locked: 0 });
            balance.insert("TEST".to_string(), BalanceType { available: 1000, locked: 0 });
            balances.insert(user_id.to_string(), UserBalance { balance });
        }

        Engine {
            orderbooks,
            balances,
        }
    }

    pub async fn process(&mut self, message: &MessageFromApi, conn: &mut Connection) {
        // Convert Box<Vec<u8>> to &[u8]
        // let payload = message.message.as_ref();
        // Decode the Protobuf message

        let base64_encoded = &message.message;
        let payload = match base64::decode(base64_encoded) {
            Ok(decoded) => decoded,
            Err(e) => {
                println!("Failed to decode base64 message: {}", e);
                return;
            }
        };

        println!("message from api: {:?}", message.message);
        println!("base64 decoded: {:?}", payload);
        match MessageToEngine::decode(payload.as_ref()) {
            Ok(decoded_message) => {
                println!("Decoded Protobuf message: {:?}", decoded_message);
                match MessageToEngineType::try_from(decoded_message.r#type) {
                    Ok(MessageToEngineType::CancelOrder) => {
                        println!("Cancel Order");
                        if let Some(
                            message_to_engine::message_to_engine::Payload::CancelOrderPayload(
                                payload,
                            ),
                        ) = decoded_message.payload
                        {
                            println!("Cancel Order payload: {:?}", payload);
                            self.publish_to_api(
                                &message.clientId,
                                json!({ "message": "cancel order is not implemented yet", "orderId": payload.order_id }),
                                conn,
                            );
                        }
                    }

                    Ok(MessageToEngineType::CreateOrder) => {
                        println!("Create Order");
                        if let Some(
                            message_to_engine::message_to_engine::Payload::CreateOrderPayload(
                                payload,
                            ),
                        ) = decoded_message.payload
                        {
                            println!("Create Order payload: {:?}", payload);

                            // let (executed_qty, fills, order_id) = Engine::create_order(&mut self, &payload);
                            let (executed_qty, fills, order_id) = self.create_order(&payload);
                            let response_fills: Vec<serde_json::Value> = fills.iter().map(|fill| {
                                json!({
                                    "orderId": fill.market_order_id,
                                    "price": fill.price,
                                    "quantity": fill.qty,
                                    "completed": true
                                })
                            }).collect();
                            self.publish_to_api(
                                &message.clientId,
                                json!({
                                    "fills": response_fills,
                                    "executedQuantity": executed_qty,
                                    "orderId": order_id
                                }),
                                conn,
                            );
                            self.publish_depth(&payload.market, conn);
                            self.publish_ticker(&payload.market, conn);
                        }
                    }

                    Ok(MessageToEngineType::GetDepth) => {
                        println!("Get Depth");
                        if let Some(
                            message_to_engine::message_to_engine::Payload::GetDepthPayload(payload),
                        ) = decoded_message.payload
                        {
                            println!("Get Depth payload: {:?}", payload);
                            let depth = self.depth_response(&payload.market);
                            self.publish_to_api(&message.clientId, depth, conn);
                        }
                    }

                    Ok(MessageToEngineType::GetOpenOrders) => {
                        println!("Get Open Orders");
                        if let Some(
                            message_to_engine::message_to_engine::Payload::GetOpenOrdersPayload(
                                payload,
                            ),
                        ) = decoded_message.payload
                        {
                            println!("Get Open Order payload: {:?}", payload);
                            self.publish_to_api(
                                &message.clientId,
                                json!({ "e": "OPEN_ORDERS", "orders": [] }),
                                conn,
                            );
                        }
                    }

                    Ok(MessageToEngineType::OnRamp) => {
                        println!("On Ramp");

                        if let Some(message_to_engine::message_to_engine::Payload::OnRampPayload(
                            payload,
                        )) = decoded_message.payload
                        {
                            println!("OnRampPayload: {:?}", payload);
                            // Process OnRampPayload here
                            self.publish_to_api(
                                &message.clientId,
                                json!({ "message": "on ramp is not implemented yet" }),
                                conn,
                            );
                        }
                    }

                    Err(_) => {
                        println!("Unknown message type: {}", decoded_message.r#type);
                    }
                }
            }
            Err(e) => {
                println!("Failed to decode Protobuf message: {}", e);
            }
        }
    }

    pub fn create_order(
        &mut self,
        payload: &message_to_engine::CreateOrderPayload,
    ) -> (i32, Vec<Fill>, String) {
        let base_asset = payload.market.split("_").next().unwrap();
        let quote_asset = payload.market.split("_").last().unwrap();

        match self.check_and_lock_funds(
            &base_asset.to_string(),
            &quote_asset.to_string(),
            &payload.side().as_str_name().to_string(),
            &payload.price,
            &payload.qty,
            &payload.user_id,
            // &quote_asset.to_string(),
        ) {
            Ok(_) => {}
            Err(e) => {
                println!("Error: {}", e);
                return (0, Vec::new(), e.to_string());
            }
        }

        let orderbook = self
            .orderbooks
            .iter_mut()
            .find(|orderbook| orderbook.ticker() == payload.market);

        match orderbook {
            Some(ob) => {
                let mut order = Order {
                    price: payload.price,
                    qty: payload.qty,
                    order_id: Engine::generate_order_id(10),
                    filled: 0,
                    side: payload.side().as_str_name().to_string(),
                    user_id: payload.user_id.clone(),
                };

                let (executed_qty, fills) = ob.add_order(&mut order);
                if let Some(last_fill) = fills.last() {
                    ob.current_price = last_fill.price;
                }
                (executed_qty, fills, order.order_id.clone())
            }

            None => {
                let base_asset = payload.market.split("_").next().unwrap_or(payload.market.as_str());
                let quote_asset = payload.market.split("_").last().unwrap_or("INR");
                self.orderbooks.push(Orderbook::new(
                    Vec::new(),
                    Vec::new(),
                    base_asset.to_string(),
                    quote_asset.to_string(),
                    0,
                    0,
                ));
                self.create_order(payload)
            }
        }
    }

    pub fn check_and_lock_funds(
        &mut self,
        base_asset: &String,
        quote_asset: &String,
        side: &String,
        price: &i32,
        qty: &i32,
        user_id: &String,
        // asset: &String,
    ) -> Result<(), String> {
        // Check if the user has enough funds to place the order
        // Lock the funds

        if let Some(user_balance) = self.balances.get_mut(user_id) {
            if side == "buy" {
                if let Some(bal) = user_balance.balance.get_mut(quote_asset) {
                    let total_price = (*qty * *price) as i64;
                    if bal.available == 0 || bal.available < total_price {
                        return Err("Insufficient funds to place".to_string());
                    } else {
                        bal.available -= total_price;
                        bal.locked += total_price;
                    }
                }
            } else {
                if let Some(bal) = user_balance.balance.get_mut(base_asset) {
                    if bal.available == 0 || bal.available < *qty as i64 {
                        return Err("Insufficient funds to place".to_string());
                    } else {
                        bal.available -= *qty as i64;
                        bal.locked += *qty as i64;
                    }
                }
            }
        }
        Ok(())
    }

    pub fn generate_order_id(len: usize) -> String {
        const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ\
        abcdefghijklmnopqrstuvwxyz\
        0123456789)(*&^%$#@!~";
        let mut rng = rand::thread_rng();

        let random_id: String = (0..len)
            .map(|_| {
                let idx = rng.gen_range(0..CHARSET.len());
                CHARSET[idx] as char
            })
            .collect();
        random_id
    }

    fn depth_response(&self, market: &String) -> serde_json::Value {
        if let Some(orderbook) = self.orderbooks.iter().find(|orderbook| orderbook.ticker() == *market) {
            let bids = Self::aggregate_orders(&orderbook.bids);
            let asks = Self::aggregate_orders(&orderbook.asks);
            return json!({
                "e": "DEPTH",
                "s": market,
                "bids": bids,
                "asks": asks
            });
        }

        json!({
            "e": "DEPTH",
            "s": market,
            "bids": [],
            "asks": []
        })
    }

    fn aggregate_orders(orders: &Vec<Order>) -> Vec<Vec<i32>> {
        let mut levels: HashMap<i32, i32> = HashMap::new();
        for order in orders {
            let remaining_qty = order.qty - order.filled;
            if remaining_qty > 0 {
                *levels.entry(order.price).or_insert(0) += remaining_qty;
            }
        }

        let mut result: Vec<Vec<i32>> = levels
            .into_iter()
            .map(|(price, qty)| vec![price, qty])
            .collect();
        result.sort_by(|a, b| b[0].cmp(&a[0]));
        result
    }

    fn publish_to_api(&self, client_id: &String, payload: serde_json::Value, conn: &mut Connection) {
        let _: redis::RedisResult<usize> = conn.publish(client_id, payload.to_string());
    }

    fn publish_depth(&self, market: &String, conn: &mut Connection) {
        let payload = self.depth_response(market);
        let _: redis::RedisResult<usize> = conn.publish(format!("depth@{}", market), payload.to_string());
    }

    fn publish_ticker(&self, market: &String, conn: &mut Connection) {
        let price = self
            .orderbooks
            .iter()
            .find(|orderbook| orderbook.ticker() == *market)
            .map(|orderbook| orderbook.current_price)
            .unwrap_or(0);

        let payload = json!({
            "e": "TICKER",
            "s": market,
            "price": price
        });
        let _: redis::RedisResult<usize> = conn.publish(format!("ticker@{}", market), payload.to_string());
    }
}
