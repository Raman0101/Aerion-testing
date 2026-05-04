package redis_manager

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/raghav1030/kazex/cmd/api/protobuf_generated_types"
	"github.com/redis/go-redis/v9"
	"google.golang.org/protobuf/proto"
)

const ()

var once sync.Once
var instance *RedisManager
var ctx context.Context = context.Background()

type RedisManager struct {
	client    *redis.Client
	publisher *redis.Client
}

func GetRedisManager() *RedisManager {

	once.Do(func() {
		options := getRedisOptions()
		instance = &RedisManager{
			client:    redis.NewClient(options),
			publisher: redis.NewClient(options),
		}
	})
	return instance
}

func getRedisOptions() *redis.Options {
	if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
		options, err := redis.ParseURL(redisURL)
		if err == nil {
			return options
		}
	}

	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	return &redis.Options{Addr: addr}
}

type queueMessageToOrderbook struct {
	ClientId string `json:"clientId"`
	Message  []byte `json:"message"`
}

func (m *RedisManager) SendAndAwait(message *protobuf_generated_types.MessageToEngine) (json.RawMessage, error) {

	clientId, err := GenerateClientId()
	if err != nil {
		return nil, err
	}

	ctxWithTimeout, cancel := context.WithTimeout(ctx, 60*time.Second)
	defer cancel()

	subscriber := m.client.Subscribe(ctxWithTimeout, clientId)
	defer subscriber.Close()

	if _, err := subscriber.Receive(ctxWithTimeout); err != nil {
		return nil, err
	}

	pubsubChannel := subscriber.Channel()

	fmt.Println("message data : ", message)
	messageData, err := proto.Marshal(message)
	fmt.Println("message in proto: ", messageData)

	if err != nil {
		return nil, err
	}

	// err := &struct {
	// 	ClientId string `json:"clientId"`
	// 	Message  []byte `json:"message"`
	// }{
	// 	ClientId: clientId,
	// 	Message:  messageData,
	// }

	messageToOrderbook := &queueMessageToOrderbook{
		ClientId: clientId,
		Message:  messageData,
	}
	
	messageToOrderbookJSON, err := json.Marshal(messageToOrderbook)
	
	if err != nil {
		return nil, err
	}

	err = m.publisher.LPush(ctxWithTimeout, "message", messageToOrderbookJSON).Err()

	if err != nil {
		return nil, err
	}

	// return &protobuf_generated_types.MessageFromOrderBook{}, nil

	for {
		select {
		case msg, ok := <-pubsubChannel:
			if !ok {
				return nil, fmt.Errorf("response channel closed")
			}
			return json.RawMessage(msg.Payload), nil
		case <-ctxWithTimeout.Done():
			return nil, ctxWithTimeout.Err()
		}
	}

}

func GenerateClientId() (string, error) {
	arr := make([]byte, 16)

	_, err := rand.Read(arr)

	if err != nil {
		return "", err
	}

	return hex.EncodeToString(arr), nil
}
