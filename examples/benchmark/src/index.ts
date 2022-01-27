import Usagi from 'usagi-mq'

const queue = 'usagi_example_performance' as const

const total = 100000
let receive = 0

const { format } = Intl.NumberFormat()

const main = async () => {
	let usagi = new Usagi('amqp://localhost')

	let channel = await usagi.createChannel({
		queues: [{ name: queue, durable: false }]
	})

	process.on('exit', async () => {
		await channel.destroy()
	})

	channel.consume<string>({ queue }, () => {
		receive++

		if (total !== receive) return

		console.log(
			`Done ${format(total)} in ${format(performance.now() - start)}ms`
		)
		process.exit(0)
	})

	console.log('Benchmarking...')

	let start = performance.now()

	for (let i = 0; i < total; i++)
		channel.send({
			to: queue,
			message: i.toString()
		})
}

main()
