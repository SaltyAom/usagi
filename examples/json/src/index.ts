import Usagi from 'usagi'

const queue = 'usagi_example_json' as const

interface Hello {
	message: string
}

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		queues: [{ name: queue }]
	})

	channel.consume<Hello>({ queue }, (message) => {
		console.log('Got', message)

		process.exit(0)
	})

	channel.sendJson({
		to: queue,
		message: {
			message: 'Hello World'
		}
	})
}

main()
