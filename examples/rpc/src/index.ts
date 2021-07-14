import Usagi from 'usagi'

const rpcQueue = 'usagic_example_rpc_queue' as const

const delay = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(() => resolve(), ms))

const microservice = async (response: string) => {
	console.log('Process:', response)

	await delay(2000)

	return 'Hello From Micro Service'
}

const main = async () => {
	let usagi = new Usagi('amqp://localhost')
	await usagi.connect()

	let channel = await usagi.createChannel()

	channel.consumeRpc<string>(rpcQueue, microservice)

	let response = await channel.sendRpc<string>(rpcQueue, {
		message: 'Hello from Main Service',
		timeout: 5000
	})

	console.log('Main:', response)

	process.exit(0)
}

main()
