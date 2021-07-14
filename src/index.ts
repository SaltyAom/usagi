import amqp from 'amqplib/callback_api'
import type { Connection, Channel, Message } from 'amqplib/callback_api'

import { nanoid } from 'nanoid'

import { removeFromArray, clone } from './services'

import type {
	Queue,
	Exchange,
	DeleteQueue,
	DeleteExchange,
	Consume,
	Publish,
	CreateChannelOptions,
	UsagiMessage,
	Send,
	BindTo,
	SendRPC
} from './types'

export default class Usagi {
	#url: string
	#connection: Connection | null = null

	constructor(url: string) {
		this.#url = url
	}

	public async connect() {
		const conn = await new Promise<Connection>((resolve) => {
			if (typeof this.#url === 'undefined')
				throw new Error(
					"url isn't recognize, please create instance with `new Usagi(url)`"
				)

			amqp.connect(this.#url, (error, connection) => {
				if (error) throw error

				resolve(connection)
			})
		})

		this.#connection = conn
	}

	public async createChannel(
		{ queues = [], exchanges = [] }: CreateChannelOptions = {
			queues: [],
			exchanges: []
		}
	): Promise<UsagiChannel> {
		if (!this.#connection)
			throw new Error(
				'Connection is missing, please call `await Usagi.connect()` first'
			)

		let channel = await new UsagiChannel(clone(this.#connection)).connect()

		await channel.addExchanges(exchanges)
		await channel.addQueues(queues)

		return channel
	}

	get url() {
		return this.#url
	}

	get connection() {
		return this.#connection
	}
}

export class UsagiChannel {
	#connection: Connection
	#channel!: Channel
	#queues: string[] = []
	#exchanges: string[] = []

	constructor(connection: Connection) {
		this.#connection = connection
	}

	public async connect() {
		let channel = await new Promise<Channel>((resolve) => {
			this.#connection.createChannel((error, channel) => {
				if (error) throw error

				resolve(channel)
			})
		})

		this.#channel = channel

		return this
	}

	get connection() {
		return this.#connection
	}

	get channel() {
		return this.#channel
	}

	public async addQueue({ name = '', bindTo = [], ...options }: Queue) {
		if (name !== '' && this.#queues.includes(name)) return name

		let queueName = await new Promise<string>((resolve) =>
			this.#channel.assertQueue(
				name,
				options,
				(error, queueAssertion) => {
					if (error) throw new Error(error)

					const { queue: queueName } = queueAssertion

					resolve(queueName)
				}
			)
		)

		this.bindQueue(name, bindTo)

		this.#queues.push(queueName)

		return queueName
	}

	public async addQueues(queues: Queue[]) {
		let queueNames = await Promise.all(
			queues.map((queue) => this.addQueue(queue))
		)

		return queueNames
	}

	public async bindQueue(queuesName: string | string[], bindTo: BindTo) {
		let queues = typeof queuesName === 'string' ? [queuesName] : queuesName

		Promise.all(
			queues.map((name) =>
				Promise.all(
					bindTo.map(
						(toBind) =>
							new Promise<void>((resolve) => {
								if (typeof toBind === 'string')
									return this.#channel.bindQueue(
										name,
										toBind,
										''
									)

								let [exchange, pattern = ''] = toBind

								this.#channel.bindQueue(
									name,
									exchange,
									pattern,
									undefined,
									(error) => {
										if (error) throw new Error(error)

										resolve()
									}
								)
							})
					)
				)
			)
		)
	}

	public unbindQueue(queuesName: string | string[], bindTo: BindTo) {
		let queues = typeof queuesName === 'string' ? [queuesName] : queuesName

		Promise.all(
			queues.map((name) =>
				Promise.all(
					bindTo.map(
						(toBind) =>
							new Promise<void>((resolve) => {
								if (typeof toBind === 'string')
									return this.#channel.bindQueue(
										name,
										toBind,
										''
									)

								let [exchange, pattern = ''] = toBind

								this.#channel.unbindQueue(
									name,
									exchange,
									pattern,
									undefined,
									(error) => {
										if (error) throw new Error(error)

										resolve()
									}
								)
							})
					)
				)
			)
		)
	}

	public async removeQueue({ name = '', ...options }: DeleteQueue) {
		if (!this.#queues.includes(name)) return name

		let totalDeleteMessage = await new Promise<number>((resolve) =>
			this.#channel.deleteQueue(name, options, (error, ok) => {
				if (error) throw new Error(error)

				resolve(ok.messageCount)
			})
		)

		this.#queues = removeFromArray(name, this.#queues)

		return totalDeleteMessage
	}

	public async removeQueues(queues: DeleteQueue[]) {
		let queueNames = await Promise.all(
			queues.map((queue) => this.removeQueue(queue))
		)

		return queueNames
	}

	public async addExchange({ name, type = 'fanout', ...options }: Exchange) {
		if (this.#exchanges.includes(name)) return name

		let exchangeName = await new Promise<string>((resolve) =>
			this.#channel.assertExchange(
				name,
				type,
				options,
				(error, exchangeAssertion) => {
					if (error) throw new Error(error)

					const { exchange: exchangeName } = exchangeAssertion

					resolve(exchangeName)
				}
			)
		)

		this.#exchanges.push(exchangeName)

		return exchangeName
	}

	public async addExchanges(exchanges: Exchange[]) {
		let exchangeNames = await Promise.all(
			exchanges.map((exchange) => this.addExchange(exchange))
		)

		return exchangeNames
	}

	public async removeExchange({ name, ...options }: DeleteExchange) {
		if (!this.#exchanges.includes(name)) return name

		let status = await new Promise<boolean>((resolve) =>
			this.#channel.deleteExchange(name, options, (error, ok) => {
				if (error) throw new Error(error)

				resolve(!!ok)
			})
		)

		this.#exchanges = removeFromArray(name, this.#exchanges)

		return status
	}

	public async removeExchanges(exchange: Exchange[]) {
		let exchangeName = await Promise.all(
			exchange.map((exchange) => this.removeExchange(exchange))
		)

		return exchangeName
	}

	public consume<T extends string | Object>(
		{ queue = '', ...options }: Consume,
		callback: (
			message: UsagiMessage<T>,
			detail: Message,
			ack: () => void
		) => unknown
	) {
		const handleCallback = (message: Message | null) => {
			if (!message) return

			const isJson = message.properties.contentType === 'application/json'

			let response = isJson
				? JSON.parse(message.content.toString())
				: message.content.toString()

			callback(response, message, () => this.#channel.ack(message))
		}

		this.#channel.consume(queue, handleCallback, {
			noAck: true,
			...options
		})

		return this
	}

	public send({ to, message, ...options }: Send) {
		const queues = typeof to === 'string' ? [to] : to

		queues.map((queue) => {
			let parsedMessage =
				typeof message === 'string' ? message : JSON.stringify(message)

			this.#channel.sendToQueue(
				queue,
				Buffer.from(parsedMessage),
				options
			)
		})

		return this
	}

	public sendJson({ message, ...options }: Omit<Send, 'contentType'>) {
		this.send({
			...options,
			message: JSON.stringify(message),
			contentType: 'application/json'
		})

		return this
	}

	public prefetch(total: number, global?: boolean) {
		this.#channel.prefetch(total, global)

		return this
	}

	public async sendRpc<T extends string | Object>(
		rpcQueue: string,
		input: SendRPC
	) {
		let correlationId = nanoid()

		let queue = await this.addQueue({
			exclusive: true,
			durable: false
		})

		let { timeout = 8000 } = input

		let finished = false
		let limiter = setTimeout(() => {
			if (!finished) throw new Error(`RPC timeout: ${input.message}`)
		}, timeout)

		let roundtrip = new Promise<T>((resolve) => {
			this.consume<T>({ queue }, (message, detail) => {
				if (!message) return

				if (detail.properties.correlationId === correlationId)
					resolve(message)
			})
		})

		this.send({
			...input,
			to: rpcQueue,
			replyTo: queue,
			correlationId
		})

		let response = await roundtrip

		clearTimeout(limiter)

		await this.removeQueue({ name: queue })

		return response
	}

	public async consumeOnce<T extends string | Object>(queue: string) {
		let consumed = await new Promise<T>((resolve) => {
			this.consume<T>({ queue }, async (message) => {
				resolve(message)
			})

			this.#channel
		})

		return consumed
	}

	public async consumeRpc<T extends string | Object>(
		rpcQueue: string,
		process: (response: T, message: Message) => T | Promise<T>
	) {
		let queue = await this.addQueue({
			name: rpcQueue
		})

		this.prefetch(1).consume<T>({ queue }, async (response, message) => {
			if (!message) return

			let result = await process(response, message)

			let {
				properties: { replyTo, correlationId }
			} = message

			this.send({
				to: replyTo,
				message: result,
				correlationId
			})
		})
	}

	public async publish({ to = '', exchange, message, ...options }: Publish) {
		let parsedMessage =
			typeof message === 'string' ? message : JSON.stringify(message)

		this.#channel.publish(exchange, to, Buffer.from(parsedMessage), options)
	}

	public async close() {
		new Promise<void>((resolve) => {
			this.#channel.close((error) => {
				if (error) throw new Error(error)

				resolve()
			})
		})
	}

	public async destroy() {
		await Promise.all([
			Promise.all(
				this.#queues.map((queue) => {
					this.#channel.purgeQueue(queue, (error) => {
						if (error) throw Error(error)
					})
				})
			)
		])

		new Promise<void>((resolve) => {
			this.#channel.close((error) => {
				if (error) throw new Error(error)

				resolve()
			})
		})
	}
}
