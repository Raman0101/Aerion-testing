import axios, { AxiosResponse } from "axios"

const Users = ["1", "2", "3", "4"]
const Sides = ["bid", "ask"]
function getRandomItem(arr: any[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}
const orderIds: [string, string][] = []

function makeOrder(): Promise<[string, string]> {
	const side = getRandomItem(Sides)
	const user = getRandomItem(Users)
	const amount = Number((Math.random() * 100).toFixed(1))
	const quantity = Number((Math.random() * 10).toFixed(1))
	const payload = {
		"clientId": user,
		"symbol": "TATA_INR",
		"side": side,
		"quantity": quantity,
		"amount": amount
	}
	return new Promise((resolve, reject) => {
		axios.post<{ orderId: string }>("http://localhost:3001/order", payload).then((data: AxiosResponse<{ orderId: string }>) => resolve([data.data.orderId, user])).catch(() => { })
	})
}

function cancelOrder() {
	const order = getRandomItem(orderIds)
	const payload = {
		orderId: order[0],
		"symbol": "TATA_INR",
		clientId: order[1]
	}
	return new Promise((resolve, reject) => {
		axios.delete("http://localhost:3001/order", {
			data: payload
		}).catch(() => { })
	})
}
async function main() {
	const action = Math.random() < Math.random() ? "cancel" : "create";
	if (orderIds.length && action === "cancel") {
		cancelOrder()
	}
	else {
		const data = await makeOrder()
		orderIds.push(data)
	}
}
setInterval(() => {
	try {
		main()
	}
	catch (e) {
	}
}, 150)
