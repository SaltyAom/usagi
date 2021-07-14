import Usagi from 'usagi-mq'

const queue = 'usagi_example_basic' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		queues: [{ name: queue }]
	})

	channel.consume<string>({ queue }, (message) => {
		console.log('Got', message)

		process.exit(0)
	})

	channel.send({
		to: queue,
		message: 'Hello World'
	})

	console.log('Sent')
}

main()
