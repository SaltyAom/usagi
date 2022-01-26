# Usagi MQ
Effortlessly use RabbitMQ in Nodejs.

An RabbitMQ library which is:
- Written for Modern JavaScript
- Async-await based
- Written in TypeScript
- Offers in both CommonJS and ES Module

![Is the Order A Rabbit?](https://user-images.githubusercontent.com/35027979/151227509-a1954351-aabb-4bfa-8dba-ad7c7ccecd83.jpg)
###### Disclaimer: This library has no connection to "Is the Order a Rabbit?", I just put Chino here because I watch "Is the Order a Rabbit" and the library has the word "rabbit" in it. It's a good anime, go watch it.

## Why
amqplib, the famous Nodejs RabbitMQ binding is kind of old.

It was written a long time ago since promise haven't landed on JavaScript yet, which at the time using library called `BlueBird` to achived Promise based.

Node.js however evolve to a complete new way to write, Usagi is built on the concept of RabbitMQ for the modern JavaScript app, using JavaScript new feature to make it as easy as possible to use RabbitMQ.

usagi is designed to be developer friendly, usagi mq offers high-level and declarative usage of RabbitMQ.

Written as async-await based, purely TypeScript, bundled with EsBuild, offering CommonJS and ES Module.

Whether you're new to Nodejs or a veteran, you should be easily be able to quickly use UsagiMQ.

Fun fact: Usagi (兎) is actually Japanese name of rabbit, so it's actually RabbitMQ but just in Japanese.

Usagi is as easy as:
```typescript
import Usagi from 'usagi-mq'

const queue = 'usagi_example_basic' as const

// Connect to RabbitMQ instance
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

// 1. Declare queue in the channel
let channel = await usagi.createChannel({
    queues: [{ name: queue, durable: false }]
})

// 2. Add listener
channel.consume<string>({ queue }, (message) => {
    console.log('Got', message, 'from', queue)

    process.exit(0)
})

// 3. Send message
await channel.send({
    to: queue,
    message: 'Hello World'
})
```
## Prerequisted
If you don't know where to start, see [examples](https://github.com/SaltyAom/usagi/tree/main/examples/README.md) for setting up.

- RabbitMQ
- Nodejs

## Getting start
usagi-mq is a standalone library to use RabbitMQ with async-await based written in TypeScript for modern Nodejs application.

Easily start by installing rabbitmq via node package manager of your choice, and that's it
```bash
# with npm
npm install usagi-mq

# with yarn
yarn add usagi-mq

# with pnpm
pnpm add usagi-mq
```

# Documentation
UsagiMQ directly use as same philosophy of RabbitMQ, so if you're not sure about which config, you can also related to [RabbitMQ documentation](https://www.rabbitmq.com)

Usagi MQ main building block is divided to 2 classes.
1. Usagi
2. Channel

## Usagi
`Usagi` class is the connector to RabbitMQ instance.

Once connected, it's use to declare channel which later declare queue and exchange.

```typescript
import Usagi from 'usagi-mq'

// Connect to RabbitMQ instance
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

// Create Channel
const channel = await usagi.createChannel({
    queues: [{ name: 'usagi-queue' }]
})
```

Usagi can create as many channel as you wanted, so you can easily use multiple channel and each channel for each purpose just like Micro-service.

## Channel
Each Channel contains `queue` and `exchange`.

Each queue can map to exchange or vice-versa.

You easily declare queues and exchanges by using `createChannel`.
```typescript
// Create Channel
const channel = await usagi.createChannel({
    queues: [
        { name: 'usagi-queue' },
        { name: 'my-channel', durable: false }
    ],
    exchanges: [
        { name: 'usagi-exchange' }
    ]
})
```

It's recommended to use `createChannel` to declare `queues` and `exchanges`, however you can also manually add it yourself, by using `channel.addQueue` and `channel.addExchange`.

However it's recommended to use `createChannel` to declare for the best developer experience.

## Consume
`Consumer` is a RabbitMQ fancy word for `listener`, basically it add listener to queue and exchange.
Once message is receive, it execute the callback.

```typescript
// Add listener to 'usagi-queue'
channel.consume<string>({ queue: 'usagi-queue' }, (message) => {
    console.log('Got', message, 'from', queue)
})
```

Once message is sent to `usagi-queue`, the second parameter, callback will be executed.
Receiving the message and you can do whatever you want with it.

The `consume` generic is a type inference to the `message`, meaning that if you pass it as `string`, receive message is also expected to be `string`.

usagi-mq also automatically parse message if it's JSON, so you can also pass type as an Object.

```typescript
interface MyObject {
    created: number
    payload: string
}

// This is fine, just make sure that your message is actually `MyObject`
channel.consume<MyObject>({ queue: 'usagi-object-queue' }, ({ created, payload }) => {
    console.log('Got', payload, 'from', queue, 'created at', created)
})
```

You can also use Union and explictly pass it as generic, however it's recommended to use each queue strict to just one type.

##### Note: By default, usagi-mq will handle ack once the callback is done, which mean if callback is async, ack will be response once async callback is done.

## send
`Procuder` is also a RabbitMQ fancy word for `sender`, which is why it's just called `send` on RabbitMQ, we don't want anyone to confused with these fancy word.

You can easily send message to queue by using `channel.send`:
```typescript
// Send message to usagi-queue
await channel.send({
    to: 'usagi-queue',
    message: 'Is the Order a Rabbit?'
})
```

This will send to message to `usagi-queue` with the message of ["Is the Order a Rabbit?"](https://en.wikipedia.org/wiki/Is_the_Order_a_Rabbit), then the listener will receive the message to this queue.

As you might have guessed, you can directly send `Object` here, usagi will handle the header and transformation pipeline and parsed once passed to consumer (listener).

```typescript
// Send message to 
await channel.send({
    to: 'usagi-queue',
    message: {
        created: new Date('March 2011').getTime(),
        payload: 'Is the Order a Rabbit?'
    }
})
```

## Relation
On the bigger scale of application, you might need a use of exchange.
Exchange will delegate task to channel base on its type, config and your usage.

If you're not sure when to use exchange, please refer to [RabbitMQ documentation](https://www.rabbitmq.com/tutorials/tutorial-three-javascript.html).
But TLDR example; you can have multiple channel to recieve message then load-balance it like CPU delegating task to multiple CPU core.

To use exchange, you have to map relation of exchange to queues.

RabbitMQ can map the relation between queue and exchange.
For Usagi, you can do the same declaratively with `createChannel`.

Using `bindTo`, you can bind specific queue to exchange.
```typescript
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

const channel = await usagi.createChannel({
    exchanges: [{ name: 'usagi-exchange' }],
    queues: [{ name: 'usagi-queue', bindTo: ['usagi-exchange'] }]
})
```

With this example, we're telling usagi to create exchange `usagi-exchange` and queue `usagi-queue`.
Then map `usagi-queue` to `usagi-exchange`, this means once message is send to `usagi-exchange` is sent, it will be send to `usagi-queue`.

We can simplify relation to the following:
'usagi-exchange' => 'usagi-queue'

Exchange can also be declared based on [RabbitMQ exchange type](https://www.rabbitmq.com/tutorials/amqp-concepts.html#exchanges) like the following:
```typescript
const channel = await usagi.createChannel({
    exchanges: [{ name: 'usagi-exchange', type: 'fanout' }],
    queues: [{ name: 'usagi-queue', bindTo: ['usagi-exchange'] }]
})
```

## Publish
Once you create exchange, you can send message to exchange like sending `message` to channel using `publish`.

Basically, because `channel` and `exchange` can receive different configurations, that's why there's different method for receiving data, but actually use almost the same.

```typescript
await channel.publish({
    exchange: 'usagi-exchange',
    message: 'Hello World'
})
```

And since exchange only job is to delegate message to channel, or tldr; pass message to channel.
You can directly use `consume` to receive message from `publish`

```typescript
channel.consume<MyObject>({ queue: 'usagi-channel' }, (message) => {
    console.log('Got', message, 'from', queue)
})
```

## RPC
RPC is basically a technique where you can send the message then wait for the response back.
It's mostly use on different server to send and receive information back and forth.

RPC on RabbitMQ require on a bit of boilerplate, but since a RPC is usually require, usagi-mq has a RPC method built right in.

Even though, I personally don't recommended using RabbitMQ as RPC because there are a lot of options available with better performance as a RPC.
However, you can use it with RabbitMQ in case if RPC has to be really flexible.

You can use RPC easily by using:
- sendRPC
- consumeRPC

## Consume RPC
Receive RPC message from producer and send the process message back.

As same as normal `consume`, you receive message from queue, then process it.

```typescript
const channel = await usagi.createChannel()

channel.consumeRpc<string>('rpc-channel', (request) => {
	console.log('request:', request)

	return 'Hello from Micro Service'
})
```

However, you can return message if will forward back to the consumer.

## Send RPC
Send message to consumer then wait for the response.

Just like normal `send`, but you can explictly set timeout of the message.
If the server consumer doesn't response in timeout range, the error will be raised.

```typescript
const response = await channel.sendRpc<string>(rpcQueue, {
    message: 'Hello from Main Service',
    timeout: 5000
})

console.log("Response", response)
```

Notice the generic in sendRpc? The generic defined the expected return message type of response from RPC consumer.

Which mean if you pass it as string, the message is expected to be string.
Like `send` and `consume`, usagi also handle `Object` type automatically.

## Prefetch
Exactly RabbitMQ prefetch please refers to [RabbitMQ documentation](https://www.rabbitmq.com/consumer-prefetch.html).

TLDR; It's value used to specify how many messages are being sent at the same time.

```typescript
channel.prefetch(5)
```

## Close
Stop all producer and consumer until the channel is re-created.

Persistance data is stored, and will resume once the channel is re-created.

It's recommended to stop the channel before stopping the Node instance to prevent any data loss.

```typescript
await channel.close()
```

## Destroy
Stop and delete everything in the channel, nothing will be left.

Think twice before you want to destroy the channel, this will completely wipe out everything in the channel including persistance data, exchange and channel.

Once destroyed, data recovery cannot be done except, ofcourse, you have a backup.


```typescript
await channel.destroy()
```

## addQueue, bindQueue
Manaully create queue/exchange implicitly.

It's recommended to declare everything once in `createChannel`, but if you somehow need to dynamically define queue or exchange, you can use `addQueue` and `bindQueue`.

The syntax is as the same as `createChannel`.

```typescript
const exchange = await channel.addExchange({
    name: 'usagi-exchange'
})

const queue = await channel.addQueue({ 
    name: 'my-channel',
    durable: false,
    bindTo: ['usagi-exchange']
})
```

The return type of addQueue/addExchange will return the name created from the method, or raise and error if it's unablt to create.

Make sure to create exchange first before create a queue, otherwise bindTo will result an error because exchange doesn't existed.

If you want to declare multiple queue or exchange, just add `s` to the method.
```typescript
const [queue1, queue2] = await channel.addQueues([
    { name: 'usagi-queue-1' },
    { name: 'usagi-queue-2' }
])
```

## Create annonymous queue
If you somehow need to create annonymous queue (which actually is non-persist queue with auto-generated name), you can use `addQueue`.

Because using you can't get the name of auto-generated queue if you use:
```typescript
const anon = await channel.addQueue({ durable: false, unique: true })
```

## removeQueue, removeExchange
It's not recommended, but you can manually remove queue or exchange from the channel.

```typescript
await removeQueue('usagi-queue')

await removeExchange('usagi-exchange')
```

Like `addQueue`/`addExchange`, if you want to remove multiple queue/exchange, just add a `s` to the method.

```typescript
await removeQueues(['usagi-queue-1', 'usagi-queue-2'])
```

You can pass extra parameter like `ifEmpty` to remove the queue if the queue is empty.
```typescript
await removeQueue('usagi-queue', {
    isEmpty: true
})
```

## bindQueue, unbindQueue
Although it's not recommended, you can bind or unbind queue manually using `bindQueue` and `unbindQueue`.

```typescript
await bindQueue('usagi-queue', { bindTo: ['usagi-exchange'] })

await unbindQueue('usagi-queue', { bindTo: ['usagi-exchange'] })
```

By default, bind and unbind queue can receive either string or an array, so you can pass an array of queue to bind/unbind.

```typescript
await bindQueue(['usagi-queue-1', 'usagi-queue-2'], { bindTo: ['usagi-exchange'] })
```

## channel
If you are not satisfied with high-level function provided by usagi, you can go deeper to the Rabbit hole by getting `amqp Channel` instance instead.

```typescript
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

let backupDelegator = await usagi.createChannel({
    queues: [{ name: queue, durable: false }]
})

// get amqp channel instance
const amqp = backupDelegator.channel
```

## connection
If you required to get amqp connection for some reason, usagi got you cover.

```typescript
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

// get amqp channel instance
const amqpConnection1 = usagi.connection

let backupDelegator = await usagi.createChannel({
    queues: [{ name: queue, durable: false }]
})

// get amqp channel instance
const amqpConnection2 = backupDelegator.connection
```

## url
If you're not sure which endpoint you're using with current instance of `Usagi`, you can get the endpoint with `url` getter.

Useful when you want to validate the endpoint or filtering different endpoint base on multiple array of instance.

```typescript
// Connect to RabbitMQ instance
const usagi = new Usagi('amqp://localhost')
await usagi.connect()

// get endpoint url
const url = usagi.url
```

## Afterword
If you still have some question not answered reading the usagi documentation, you can refer to [RabbitMQ documentation](https://www.rabbitmq.com) or raise a new [issue](https://github.com/SaltyAom/usagi/issues/new) or contribute to the project (it's open-source after all).

Hope the library have a good use to you, cheers!.

![Rabbit House](https://user-images.githubusercontent.com/35027979/151228290-5b9fd23b-03e9-4c7a-9dda-4cc841fa1cca.jpg)

[![forthebadge](https://forthebadge.com/images/badges/powered-by-black-magic.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/reading-6th-grade-level.svg)](https://forthebadge.com)
[![forthebadge](https://forthebadge.com/images/badges/uses-brains.svg)](https://forthebadge.com)

###### To my FBI agent: I'm not a lolicon, please don't "FBI Open Up on me"
