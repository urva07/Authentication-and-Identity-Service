const { Registry, collectDefaultMetrics } = require('@prometheus-io/client');


const registry = new Registry();

collectDefaultMetrics({ register: registry });


module.exports = registry;