const http              = require('http');
const express           = require('express');
const cors              = require('cors');

module.exports = class UserServer {
    constructor({config, managers}){
        this.config        = config;
        this.userApi       = managers.userApi;
        this.app           = express();
    }
    
    /** for injecting middlewares */
    use(args){
        this.app.use(args);
    }

    /** set up express middleware and routes without listening */
    configure(){
        this.app.use(cors({origin: '*'}));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true}));
        this.app.use('/static', express.static('public'));
        this.app.all('/api/:moduleName/:fnName', this.userApi.mw);
        this.app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).send('Something broke!');
        });
        return this.app;
    }

    /** server configs */
    run(){
        this.configure();
        this.server = http.createServer(this.app);
        this.server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
        return this.server;
    }
}