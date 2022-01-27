import amqp from 'amqplib/callback_api'
import type { Connection, Channel, Message } from 'amqplib/callback_api'

import { nanoid } from 'nanoid'

import { clone } from './services'

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

/**
 * Create new instance of UsagiMQ
 *
 * @example
 * ```typescript
 * let usagi = new Usagi('amqp://localhost')
 * await usagi.connect()
 * ```
 */
export default class Usagi {
	#url: string
	#connection: Connection | null = null

	/**
	 * Create new instance of UsagiMQ
	 *
	 * @example
	 * ```typescript
	 * let usagi = new Usagi('amqp://localhost')
	 * await usagi.connect()
	 * ```
	 */
	constructor(url: string) {
		this.#url = url
	}

	/**
	 * Connect or reconnect to the AMQP server
	 */
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

	/**
	 * Create new channel.
	 *
	 * Declare queues and exchanges of the channel to listen/talk to.
	 */
	public async createChannel(
		{ queues = [], exchanges = [] }: CreateChannelOptions = {
			queues: [],
			exchanges: []
		}
	): Promise<UsagiChannel> {
		if (!this.#connection) await this.connect()

		let channel = await new UsagiChannel(clone(this.#connection!)).connect()

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
	#queues = new Set<string>()
	#exchanges = new Set<string>()

	constructor(connection: Connection) {
		this.#connection = connection
	}

	/**
	 * Connect/reconnect the channel
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 *
	 * @example
	 * let usagi = new Usagi('amqp://localhost')
	 * await usagi.connect()
	 *
	 * let channel = await usagi.createChannel({
	 *     queues: [{ name: 'my-queue' }]
	 * })
	 */
	public async connect() {
		this.#channel = await new Promise<Channel>((resolve) => {
			this.#connection.createChannel((error, channel) => {
				if (error) throw error

				resolve(channel)
			})
		})

		return this
	}

	get connection() {
		return this.#connection
	}

	get channel() {
		return this.#channel
	}

	public get queues() {
		return this.#queues
	}

	public get exchanges() {
		return this.#exchanges
	}

	/**
	 * Add new queue to the channel
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async addQueue({ name = '', bindTo = [], ...options }: Queue) {
		if (name !== '' && this.#queues.has(name)) return name

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

		await this.bindQueue(name, bindTo)
		this.#queues.add(queueName)

		return queueName
	}

	/**
	 * Add multiple queues to the channel
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async addQueues(queues: Queue[]) {
		return await Promise.all(queues.map((queue) => this.addQueue(queue)))
	}

	/**
	 * Bind queues to exchanges relation or vice-versa
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async bindQueue(queuesName: string | string[], bindTo: BindTo) {
		let queues = typeof queuesName === 'string' ? [queuesName] : queuesName

		await Promise.all(
			queues.map((name) =>
				Promise.all([
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
				])
			)
		)
	}

	/**
	 * Unbind queues to exchanges relation or vice-versa
	 *
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async unbindQueue(queuesName: string | string[], bindTo: BindTo) {
		let queues = typeof queuesName === 'string' ? [queuesName] : queuesName

		await Promise.all(
			queues.map((name) =>
				Promise.all([
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
				])
			)
		)
	}

	/**
	 * Remove queue from channel
	 *
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async removeQueue({ name = '', ...options }: DeleteQueue) {
		if (!this.#queues.has(name)) throw new Error(`${name} is not in queue`)

		let totalDeleteMessage = await new Promise<number>((resolve) =>
			this.#channel.deleteQueue(name, options, (error, ok) => {
				if (error) throw new Error(error)

				resolve(ok.messageCount)
			})
		)

		this.#queues.delete(name)

		return totalDeleteMessage
	}

	/**
	 * Remove queue from channel
	 *
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async removeQueues(queues: DeleteQueue[]) {
		return await Promise.all(queues.map((queue) => this.removeQueue(queue)))
	}

	/**
	 * Add exchange to the channel
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async addExchange({ name, type = 'fanout', ...options }: Exchange) {
		if (this.#exchanges.has(name)) return name

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

		this.#exchanges.add(exchangeName)

		return exchangeName
	}

	/**
	 * Add exchanges to the channel
	 *
	 * ? This method is called automatically when you create a new instance of `UsagiChannel`
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async addExchanges(exchanges: Exchange[]) {
		let exchangeNames = await Promise.all(
			exchanges.map((exchange) => this.addExchange(exchange))
		)

		return exchangeNames
	}

	/**
	 * Remove exchange from channel
	 *
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async removeExchange({ name, ...options }: DeleteExchange) {
		if (!this.#exchanges.has(name))
			return new Error(`${name} is not in exchange`)

		let status = await new Promise<boolean>((resolve) =>
			this.#channel.deleteExchange(name, options, (error, ok) => {
				if (error) throw new Error(error)

				resolve(!!ok)
			})
		)

		if (status) this.#exchanges.delete(name)

		return status
	}

	/**
	 * Remove multiple exchanges from channel
	 *
	 * * Not recommended to call manually, instead be strict to declarative schema of Usagi.
	 */
	public async removeExchanges(exchange: Exchange[]) {
		let exchangeName = await Promise.all(
			exchange.map((exchange) => this.removeExchange(exchange))
		)

		return exchangeName
	}

	/**
	 * Listen to queue in the channel
	 *
	 * ? If no queue provided, then listen to all queues
	 *
	 * @example
	 * ```typescript
	 * channel.consume<string>({ queue }, (message) => {
	 *     console.log('Got', message, 'from', queue)
	 * })
	 * ```
	 */
	public consume<T extends UsagiMessage>(
		{ queue, noAck = true, ...options }: Consume,
		callback: (message: T, detail: Message, ack: () => void) => unknown
	) {
		const handleCallback = (message: Message | null) => {
			if (!message) return

			const isJson = message.properties.contentType === 'application/json'

			let response = isJson
				? JSON.parse(message.content.toString())
				: message.content.toString()

			callback(response, message, () => {
				if (!noAck) this.#channel.ack(message)
			})
		}

		this.#channel.consume(queue, handleCallback, {
			...options,
			noAck
		})

		return this
	}

	/**
	 * Send message to queue in the channel.
	 *
	 * @example
	 * ```typescript
	 * channel.send({
	 *     to: 'queue',
	 *     message: 'Hello World'
	 * })
	 * ```
	 */
	public send({ to: queue, message, ...options }: Send) {
		let isObject = typeof message === 'object'

		let parsedMessage = isObject
			? JSON.stringify(message)
			: (message as string)

		this.#channel.sendToQueue(queue, Buffer.from(parsedMessage), {
			contentType: isObject ? 'application/json' : undefined,
			...options
		})

		return this
	}

	/**
	 * Prefetch message in the channel
	 */
	public prefetch(total: number, global?: boolean) {
		this.#channel.prefetch(total, global)

		return this
	}

	/**
	 * Send message and wait for response from queue in the channel usinng RoundRobin
	 *
	 * To be use with `consumeRpc`
	 */
	public async sendRpc<T extends UsagiMessage>(
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
				if (
					message &&
					detail.properties.correlationId === correlationId
				)
					resolve(message)
			})
		})

		this.send({
			correlationId,
			...input,
			to: rpcQueue,
			replyTo: queue
		})

		let response = await roundtrip

		clearTimeout(limiter)

		await this.removeQueue({ name: queue })

		return response
	}

	/**
	 * Listen to the message in the channel only once.
	 *
	 * ? If no queue provided, then listen to any queue
	 */
	public async consumeOnce<T extends UsagiMessage>(queue: string = '') {
		let consumed = await new Promise<T>((resolve) => {
			this.consume<T>({ queue }, (message) => {
				resolve(message)
			})

			this.#channel
		})

		return consumed
	}

	/**
	 * Send message back to Rpc request in the channel
	 *
	 * To be use with `sendRpc`
	 */
	public async consumeRpc<T extends UsagiMessage, R extends UsagiMessage = T>(
		rpcQueue: string,
		process: (response: T, message: Message) => R | Promise<R>
	) {
		let queue = await this.addQueue({
			name: rpcQueue,
			durable: false
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

	/**
	 * Publish message to exchange in the channel
	 */
	public async publish({ to = '', exchange, message, ...options }: Publish) {
		let parsedMessage =
			typeof message === 'string' ? message : JSON.stringify(message)

		this.#channel.publish(exchange, to, Buffer.from(parsedMessage), options)
	}

	/**
	 * Close the channel
	 */
	public async close() {
		new Promise<void>((resolve) => {
			this.#channel.close((error) => {
				if (error) throw new Error(error)

				resolve()
			})
		})
	}

	/**
	 * Destroy the channel
	 */
	public async destroy() {
		await new Promise<void>((resolve) => {
			this.#channel.close((error) => {
				if (error) throw new Error(error)

				resolve()
			})
		})

		await Promise.all([
			Promise.all(
				[...this.#queues].map(
					(queue) =>
						new Promise<void>((resolve) => {
							this.#channel.purgeQueue(queue, (error) => {
								if (error) throw Error(error)

								this.#queues.delete(queue)

								resolve()
							})
						})
				)
			),
			Promise.all(
				[...this.#exchanges].map(
					(queue) =>
						new Promise<void>((resolve) => {
							this.#channel.deleteExchange(
								queue,
								undefined,
								(error) => {
									if (error) throw Error(error)

									this.#exchanges.delete(queue)

									resolve()
								}
							)
						})
				)
			)
		])
	}
}
