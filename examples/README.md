Run usagi-mq examples using Docker.

## Prequisted
- Node.js 12+
- Docker

## Setup
1. Setup temporary RabbitMQ environment for testing
```bash
./setup.sh
```

2. Go to any example, let say I use basic.
```bash
cd basic && pnpm install
```

3. Run example
```bash
pnpm start
```
