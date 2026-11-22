# Auth Mail Service

`Auth_Mail_Service` is a Docker Compose workspace for authentication and external mail services.

## Repository Structure

```text
Auth_Mail_Service/
├── auth_service/
│   ├── src/
│   ├── conf/
│   ├── migrations/
│   ├── scripts/
│   └── .env
├── mail_service/
│   ├── src/
│   ├── conf/
│   ├── scripts/
│   └── .env
├── conf/
│   └── redis/
│       └── bullMQ.conf
├── docker-compose.yml
├── build.sh
├── start.sh
├── start:d.sh
└── stop.sh
```

## Services

- **auth_service**: Authentication and identity API on ports `3000` and `3001`.
- **mail_service**: Bull MQ mail worker on port `4000`.
- **mysql**: MySQL database for the authentication service.
- **redis_session**: Redis server for server-side sessions.
- **redis_user_cache**: Redis server for cached authenticated users.
- **redis_rate_limit**: Redis server for API rate limiting.
- **redis_bullMQ**: Shared Redis server for Bull MQ mail jobs.
- **prometheus**, **grafana**, **loki**, and **alloy**: Monitoring and logging services.

## Environment Variables

Create or maintain service environment files:

- `auth_service/.env`
- `mail_service/.env`

The authentication environment must provide at least:

```dotenv
MYSQL_PASSWORD=
MYSQL_DATABASE=
REDIS_PASSWORD=
```

Do not commit real credentials or secrets. Keep `.env` files excluded by Git.

## Docker Commands

Build the application:

```bash
./build.sh
```

Start in the foreground:

```bash
./start.sh
```

Start in detached mode:

```bash
./start:d.sh
```

Stop the running services:

```bash
./stop.sh
```

The scripts can forward arguments to Docker Compose. For example:

```bash
./start:d.sh auth_service
./build.sh mail_service
```

## Ports

| Service | Port |
|---|---:|
| Authentication API | 3000 |
| Authentication health API | 3001 |
| Mail service | 4000 |
| Grafana | 3002 |
| Prometheus | 9090 |
| Loki | 3100 |
| Alloy | 12345 |
| MySQL | 3306 |