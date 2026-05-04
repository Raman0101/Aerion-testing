use once_cell::sync::Lazy;
use redis::{Client, RedisError};
use std::sync::Mutex;

pub mod redis_manager {
    use std::env;

    use redis::{Commands, Connection};

    use crate::types::DBMessage;

    use super::*;

    pub struct RedisManager {
        client: Client,
    }

    impl RedisManager {
        fn get_redis_client() -> Result<Client, RedisError> {
            if let Ok(redis_url) = env::var("REDIS_URL") {
                return Client::open(redis_url).map_err(|e| e.into());
            }

            let redis_host_name = env::var("REDIS_ADDR")
                .unwrap_or_else(|_| "localhost:6379".to_string());
            let redis_password = "";

            let redis_conn_url = if redis_password.is_empty() {
                format!("redis://{}", redis_host_name)
            } else {
                format!("redis://:{}@{}", redis_password, redis_host_name)
            };

            Client::open(redis_conn_url).map_err(|e| e.into())
        }

        pub fn new() -> Self {
            let client = Self::get_redis_client().expect("Failed to create Redis client");
            RedisManager { client }
        }

        pub fn instance() -> &'static Mutex<RedisManager> {
            static INSTANCE: Lazy<Mutex<RedisManager>> =
                Lazy::new(|| Mutex::new(RedisManager::new()));
            &INSTANCE
        }

        pub fn get_client(&self) -> &Client {
            &self.client
        }

        pub async fn push_message(
            &self,
            message: &DBMessage,
            conn: &mut Connection,
        ) -> redis::RedisResult<()> {
            conn.lpush::<_, _, ()>(
                "db_processor",
                serde_json::to_string(message).expect("Failed to serialize message"),
            )?;
            Ok(())
        }

        pub async fn publish_message_on_ws(
            &self,
            channel: &String,
            message: &DBMessage,
            conn: &mut Connection,
        ) -> redis::RedisResult<()> {
            conn.publish::<_, _, ()>(
                channel,
                serde_json::to_string(message).expect("Failed to serialize message"),
            )?;
            Ok(())
        }

        pub async fn send_message_to_api(
            client_id: &String,
            message: &serde_json::Value,
            conn: &mut Connection,
        ) -> redis::RedisResult<()> {
            conn.publish::<_, _, ()>(client_id, message.to_string())?;
            Ok(())
        }
    }
}
