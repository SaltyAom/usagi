import Usagi from 'usagi-mq'

const exchange = 'usagi_example_exchange_basic' as const
const queue = 'usagi_example_exchange_basic_queue' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')

	let channel = await usagi.createChannel({
		exchanges: [{ name: exchange, durable: false }],
		queues: [{ name: queue, bindTo: [exchange], durable: false }]
	})

	process.on('exit', async () => {
		await channel.destroy()
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
