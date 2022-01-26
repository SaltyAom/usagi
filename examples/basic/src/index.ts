import Usagi from 'usagi-mq'

const queue = 'usagi_example_basic' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		queues: [{ name: queue, durable: false }]
	})

	process.on('exit', async () => {
		await channel.destroy()
	})

	channel.consume<string>({ queue }, (message) => {
		console.log('Got', message, 'from', queue)

		process.exit(0)
	})

	await channel.send({
		to: queue,
		message: 'Hello World'
	})

	console.log('Sent')
}

main()
