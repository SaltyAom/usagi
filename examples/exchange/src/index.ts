import Usagi from 'usagi'

const exchange = 'usagi_example_exchange_basic' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		exchanges: [{ name: exchange, type: 'fanout', durable: false }]
	})

	let queue = await channel.addQueue({
		exclusive: true,
		durable: false,
		bindTo: [exchange]
	})

	channel.consume<string>({ queue }, (message) => {
		console.log('Got', message)

		process.exit(0)
	})

	await channel.publish({
		exchange,
		message: 'Hello World'
	})
}

main()
