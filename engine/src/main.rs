use std::num::NonZeroUsize;

use engine::{process::trade, redis_manager::redis_manager, types};
use redis::Commands;

#[tokio::main]
async fn main() {
    let client = {
        let redis_manager = redis_manager::RedisManager::instance().lock().unwrap();
        redis_manager.get_client().clone()
    };
    let mut con = client
        .get_connection()
        .expect("Failed to get Redis async connection");
    let mut engine = trade::Engine::new();

    loop {
        let message: Result<Vec<String>, redis::RedisError> =
            con.rpop("message", NonZeroUsize::new(1));

        match message {
            Ok(message) => {
                if !message.is_empty() {
                    // Deserialize the String into a Message struct
                    let message: types::redis_channel_message::MessageFromApi =
                        serde_json::from_str(&message[0]).expect("Failed to deserialize message");
                    println!("Received message: {:?}", message);
                    engine.process(&message, &mut con).await;
                }
            }

            Err(e) => {
                println!("Failed to receive message: {}", e);
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    }
}
