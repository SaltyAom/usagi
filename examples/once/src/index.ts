import Usagi from 'usagi'

const queue = 'usagi_example_once' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel({
		queues: [{ name: queue }]
	})

	setTimeout(() => {
		channel.send({
			to: queue,
			message: 'Hello World'
		})
	}, 2000)

	let message = await channel.consumeOnce<string>(queue)

	console.log('Main:', message)

	process.exit(0)
}

main()
