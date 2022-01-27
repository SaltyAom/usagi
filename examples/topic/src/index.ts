import Usagi from 'usagi-mq'

const exchange = 'usagi_example_exchange_topic' as const
const all = 'usuagi_example_exchange_topic_all' as const
const topic = 'usuagi_example_exchange_topic_topic' as const

const main = async () => {
	let usagi = new Usagi('amqp://localhost')

	let channel = await usagi.createChannel({
		exchanges: [{ name: exchange, durable: false, type: 'topic' }],
		queues: [
			{ name: all, bindTo: [[exchange, '*.*.usagi']], durable: false },
			{
				name: topic,
				bindTo: [[exchange, 'order.an.usagi']],
				durable: false
			}
		]
	})

	process.on('exit', async () => {
		await channel.destroy()
	})

	channel
		.consume<string>({ queue: all }, (message) => {
			console.log('[All]:', message)
		})
		.consume<string>({ queue: topic }, (message) => {
			console.log('[Topic]:', message)

			process.exit()
		})

	await channel.publish({
		exchange,
		to: '*.*.usagi',
		message: 'To all Usagi'
	})

	await channel.publish({
		exchange,
		to: 'order.an.usagi',
		message: 'Order an Usagi'
	})
}

main()
