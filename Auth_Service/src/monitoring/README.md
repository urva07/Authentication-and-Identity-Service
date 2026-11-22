# Monitoring

Prometheus metrics for the service. Everything is registered on one shared
registry (`prometheus.js`) and served by the health application, not the main
application.

```js
const { recordRequestMetrics, createQueryLogger } = require('#src/monitoring/index.js');
```

## Files

| File | Purpose |
| --- | --- |
| `prometheus.js` | Creates the shared `Registry` and enables the default Node.js process metrics (CPU, memory, event loop, GC). |
| `metrics.js` | Defines the application metrics below on that registry. |
| `recordRequestMetrics.js` | Factory for the per-request recorder. |
| `sequelizeLogger.js` | Factory for the per-query Sequelize `logging` callback. |
| `index.js` | Wires the metrics into the two helpers and exports `recordRequestMetrics` and `createQueryLogger`. |

## Metrics

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `http_requests_total` | Counter | `method`, `status_code`, `path`, `ip`, `user_id`, `mail` | Completed HTTP requests. |
| `http_failed_requests_total` | Counter | same as above | Completed requests with a 4xx or 5xx status. |
| `http_request_duration_seconds` | Histogram | `method`, `status_code`, `path` | Request duration, buckets from 5 ms to 10 s. |
| `db_query_duration_seconds` | Histogram | `query_name`, `repository_name` | Database query duration, buckets from 1 ms to 10 s. |

## How metrics are recorded

- **HTTP:** `app.js` and `healthApp.js` call `recordRequestMetrics(req, res,
  responseTimeMs)` from the `pino-http` `customSuccessObject` and
  `customErrorObject` hooks, so it runs once when each response finishes. The
  health application's own requests are counted as well. `path` is `req.path`
  (the concrete URL path, without the query string), and `user_id` and `mail`
  come from `req.user` when it is set, otherwise they are empty strings.
- **Database:** each MySQL repository is created with
  `createQueryLogger(queryName, repositoryName)` and passes the result as
  Sequelize's `logging` option with `benchmark: true`. The callback logs the
  SQL at debug level and observes the query duration. Without a timing value
  nothing is observed.

To add a metric, define it in `metrics.js` with `registers: [registry]`,
export it, and inject it into the code that records it through `index.js`.

## Scraping

`GET /metrics` is served by the health application (`HEALTH_APP_PORT`, default
`3001`), in the Prometheus text format. It is not exposed on the main
application port. In `docker-compose.yml`, Prometheus
(`conf/monitoring/prometheus.yml`) scrapes `app:3001/metrics` every 10 seconds
and is available on port `9090`; Grafana is on port `3002`. Loki and Alloy
(`conf/monitoring/alloy-config.alloy`) collect container logs.

## Cardinality warning

Every distinct combination of label values creates a separate time series.
`ip`, `user_id`, `mail` and the raw `path` (for example `/v1/profile/<uuid>`)
are unbounded, so the request counters can grow without limit under real
traffic. Avoid adding more per-user or per-request labels, and prefer the route
pattern over the raw path if you change the labels. The recorder also reads
`req.user.mail`, but users have an `email` field, so `mail` is currently always
empty.
