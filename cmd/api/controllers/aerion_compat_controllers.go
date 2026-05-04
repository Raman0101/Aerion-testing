package controllers

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/raghav1030/kazex/cmd/api/protobuf_generated_types"
)

type aerionCreateOrderRequest struct {
	Side     string `json:"side"`
	Amount   int32  `json:"amount"`
	Quantity int32  `json:"quantity"`
	Symbol   string `json:"symbol"`
	ClientId string `json:"clientId"`
}

type aerionCancelOrderRequest struct {
	OrderId  string `json:"orderId"`
	Symbol   string `json:"symbol"`
	ClientId string `json:"clientId"`
}

func AerionCreateOrder(c *fiber.Ctx) error {
	var body aerionCreateOrderRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	side, ok := aerionSideToProto(body.Side)
	if !ok {
		return c.Status(400).JSON(fiber.Map{"error": "side must be bid or ask"})
	}

	message := &protobuf_generated_types.MessageToEngine{
		Type: protobuf_generated_types.MessageToEngineType_CREATE_ORDER,
		Payload: &protobuf_generated_types.MessageToEngine_CreateOrderPayload{
			CreateOrderPayload: &protobuf_generated_types.CreateOrderPayload{
				Market: body.Symbol,
				Price:  body.Amount,
				Qty:    body.Quantity,
				Side:   side,
				UserId: body.ClientId,
			},
		},
	}

	return sendEngineJSON(c, message)
}

func AerionCancelOrder(c *fiber.Ctx) error {
	var body aerionCancelOrderRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	message := &protobuf_generated_types.MessageToEngine{
		Type: protobuf_generated_types.MessageToEngineType_CANCEL_ORDER,
		Payload: &protobuf_generated_types.MessageToEngine_CancelOrderPayload{
			CancelOrderPayload: &protobuf_generated_types.CancelOrderPayload{
				OrderId: body.OrderId,
				Market:  body.Symbol,
			},
		},
	}

	return sendEngineJSON(c, message)
}

func AerionGetDepth(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	if symbol == "" {
		symbol = c.Query("market")
	}
	if symbol == "" {
		return c.Status(400).JSON(fiber.Map{"error": "symbol is required"})
	}

	message := &protobuf_generated_types.MessageToEngine{
		Type: protobuf_generated_types.MessageToEngineType_GET_DEPTH,
		Payload: &protobuf_generated_types.MessageToEngine_GetDepthPayload{
			GetDepthPayload: &protobuf_generated_types.GetDepthPayload{
				Market: symbol,
			},
		},
	}

	return sendEngineJSON(c, message)
}

func AerionGetTicker(c *fiber.Ctx) error {
	symbol := c.Query("symbol")
	if symbol == "" {
		symbol = c.Query("market")
	}
	return c.JSON(fiber.Map{
		"e":     "TICKER",
		"s":     symbol,
		"price": 0,
	})
}

func AerionGetBalance(c *fiber.Ctx) error {
	clientId := c.Query("clientId")
	if clientId == "" {
		clientId = c.Query("userId")
	}

	return c.JSON(fiber.Map{
		"e":  "BALANCE",
		"id": clientId,
		"balance": fiber.Map{
			"balance": fiber.Map{"available": 100000, "locked": 0},
			"TATA":   fiber.Map{"available": 1000, "locked": 0},
			"TEST":   fiber.Map{"available": 1000, "locked": 0},
		},
	})
}

func AerionGetKlines(c *fiber.Ctx) error {
	return c.JSON([]fiber.Map{})
}

func aerionSideToProto(side string) (protobuf_generated_types.Side, bool) {
	switch strings.ToLower(side) {
	case "bid", "buy":
		return protobuf_generated_types.Side_buy, true
	case "ask", "sell":
		return protobuf_generated_types.Side_sell, true
	default:
		return protobuf_generated_types.Side_buy, false
	}
}

func sendEngineJSON(c *fiber.Ctx, message *protobuf_generated_types.MessageToEngine) error {
	feedbackMessage, err := redisManager.SendAndAwait(message)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	c.Type("json")
	return c.Status(200).Send(feedbackMessage)
}
