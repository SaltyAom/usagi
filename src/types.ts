import type { Options } from 'amqplib/properties'

type ExchangeType = 'direct' | 'topic' | 'headers' | 'fanout'

export type BindTo = string[] | string[][]

export interface Queue extends Options.AssertQueue {
	name?: string
	bindTo?: BindTo
}

export interface Exchange extends Options.AssertExchange {
	name: string
	type?: ExchangeType
}

export interface DeleteQueue extends Options.DeleteQueue {
	name: string
}

export interface DeleteExchange extends Options.DeleteExchange {
	name: string
}

export interface Consume extends Options.Consume {
	queue?: string
}

export interface Send extends Options.Publish {
	to: string
	message: string | Object
}

export interface Publish extends Options.Publish {
	exchange: string
	to?: string
	message: string | Object
}

export interface CreateChannelOptions {
	queues?: Queue[]
	exchanges?: Exchange[]
}

export type UsagiMessage = String | Object

export interface SendRPC extends Omit<Send, 'to' | 'replyTo'> {
	timeout?: number
}