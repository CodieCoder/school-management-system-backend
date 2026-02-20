const config           = require('./config/index.config.js');
const Cortex           = require('ion-cortex');
const ManagersLoader   = require('./loaders/ManagersLoader.js');
const Aeon             = require('aeon-machine');
const connectMongo     = require('./connect/mongo');
const logger           = require('./libs/logger');

process.on('uncaughtException', err => {
    logger.fatal({ err }, 'Uncaught Exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
});

(async () => {
    const mongoose = require('mongoose');
    await connectMongo({ uri: config.dotEnv.MONGO_URI });

    const cache = require('./cache/cache.dbh')({
        prefix: config.dotEnv.CACHE_PREFIX,
        url: config.dotEnv.CACHE_REDIS,
    });

    const Oyster = require('oyster-db');
    const oyster = new Oyster({
        url: config.dotEnv.OYSTER_REDIS,
        prefix: config.dotEnv.OYSTER_PREFIX,
    });

    const cortex = new Cortex({
        prefix: config.dotEnv.CORTEX_PREFIX,
        url: config.dotEnv.CORTEX_REDIS,
        type: config.dotEnv.CORTEX_TYPE,
        state: () => ({}),
        activeDelay: "50",
        idlDelay: "200",
    });

    const aeon = new Aeon({ cortex, timestampFrom: Date.now(), segmantDuration: 500 });

    const managersLoader = new ManagersLoader({ config, cache, cortex, oyster, aeon });
    const managers = managersLoader.load();

    await managersLoader.seed();

    const server = managers.userServer.run();

    const shutdown = async (signal) => {
        logger.info({ signal }, 'Shutdown signal received, closing gracefully');
        server.close(() => {
            logger.info('HTTP server closed');
            mongoose.connection.close(false).then(() => {
                logger.info('MongoDB connection closed');
                process.exit(0);
            });
        });
        setTimeout(() => {
            logger.error('Graceful shutdown timed out, forcing exit');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
})();
