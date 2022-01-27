import type { Options } from 'amqplib/properties'

type ExchangeType = 'direct' | 'topic' | 'headers' | 'fanout'

/**
 * Exchange's name and key to bind to to bind queue to.
 * 
 * @example exchange only
 * ['usagi-exchange']
 * 
 * @example exchange with key bind
 * [['usagi-exchange', 'usagi-key']]
 */
export type BindTo = string[] | string[][]

export interface AssertQueue extends Options.AssertQueue {
	/**
	 * If set to true, RabbitMQ will generate a random name for the queue.
	 *
	 * @default false
	 */
	exclusive?: boolean | undefined
	/**
	 * If set to true, RabbitMQ will persists the data to disk.
	 *
	 * @default true
	 */
	durable?: boolean | undefined
	/**
	 * RabbitMQ will delete the queue when it is no longer in use (no consumer is listen).
	 * @default true
	 */
	autoDelete?: boolean | undefined
	arguments?: any
	/**
	 * Message Time to Live (TTL) is a RabbitMQ-specific feature that tells RabbitMQ to delete the message after a certain time.
	 *
	 * ? If not set, message will leave forever, except manually deleted or when the queue is deleted.
	 *
	 * @default undefined
	 * @see https://www.rabbitmq.com/ttl.html
	 */
	messageTtl?: number | undefined
	/**
	 * Queue TTL is a RabbitMQ-specific feature that tells RabbitMQ to delete the queue when it is no longer in use.
	 *
	 * @default undefined
	 */
	expires?: number | undefined
	deadLetterExchange?: string | undefined
	deadLetterRoutingKey?: string | undefined
	/**
	 * Maximum number of messages to keep in queue.
	 *
	 * @default undefined
	 */
	maxLength?: number | undefined
	maxPriority?: number | undefined
}

export interface AssertExchange extends Options.AssertExchange {
	/**
	 * If set to true, RabbitMQ will persists the data to disk.
	 *
	 * @default true
	 */
	durable?: boolean | undefined
	internal?: boolean | undefined
	/**
	 * RabbitMQ will delete the queue when it is no longer in use (no consumer is listen).
	 * @default true
	 */
	 autoDelete?: boolean | undefined
	/**
	 * An alternative exchange or queue if the main exchange is not available.
	 * 
	 * @see https://www.rabbitmq.com/ae.html
	 */
	alternateExchange?: string | undefined
	arguments?: any
}

export interface Queue extends AssertQueue {
	/**
	 * Queue name
	 */
	name?: string
	/**
	 * Bind queue to exchange name
	 */
	bindTo?: BindTo
}

export interface Exchange extends AssertExchange {
	/**
	 * Name of the exchange
	 */
	name: string
	/**
	 * Exchange type
	 * 
	 * @default 'fanout'
	 *
	 * @see https://www.rabbitmq.com/tutorials/amqp-concepts.html#exchanges
	 */
	type?: ExchangeType
}

export interface DeleteQueue extends Options.DeleteQueue {
	/**
	 * Name of queue to delete
	 */
	name: string
}

export interface DeleteExchange extends Options.DeleteExchange {
	/**
	 * Name of queue to delete
	 */
	name: string
}

export interface Consume extends Options.Consume {
	/**
	 * Name of queue to listen to
	 */
	queue: string
}

export interface Send extends Options.Publish {
	/**
	 * Queue name to send message to
	 */
	to: string
	/**
	 * Message to send
	 */
	message: string | Object
}

export interface Publish extends Options.Publish {
	/**
	 * Exchange name to send to
	 */
	exchange: string
	/**
	 * Explictly declare channel to send to
	 */
	to?: string
	/**
	 * Message to send
	 */
	message: string | Object
}

export interface CreateChannelOptions {
	/**
	 * Queues to create
	 */
	queues?: Queue[]
	/**
	 * Exchanges to create
	 */
	exchanges?: Exchange[]
}

export type UsagiMessage = String | Object

export interface SendRPC extends Omit<Send, 'to' | 'replyTo'> {
	/**
	 * Timeout in milliseconds
	 */
	timeout?: number
}
