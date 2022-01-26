import Usagi from 'usagi-mq'

const queue = 'usagi_example_json' as const

interface Hello {
	message: string
}

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		queues: [{ name: queue, durable: false }]
	})

	process.on('exit', async () => {
		await channel.destroy()
	})

	channel.consume<Hello>({ queue }, (message) => {
		console.log('Got', message)

		process.exit(0)
	})

	channel.send({
		to: queue,
		message: {
			message: 'Hello World'
		}
	})
}

main()
