'use strict';

/**
 * import packages
 */
import { fork } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import 'colors';

// #region const
const
    WAIT_TIMEOUT = 5000;

const usage =
    'tiny-nodemon usage:\n'.cyan.bold +
    "let mon = new TinyNodemon('script.js') || new TinyNodemon(config)\n".gray.bold +
    'Options:\n'.yellow +
    '  script: file............The script to run and monitor.\n' +
    '  args  : [...]...........List of string arguments\n' +
    '  cwd   : path............Current working directory of the child process.\n' +
    '  env   : {key:value}.....Environment key-value pairs.\n' +
    '  done  : callback........Called on script exit.\n' +
    'Note: if the script is omitted, tiny-nodemon will exit.\n'.bold +
    'Commands:\n'.yellow +
    '  mon.restart()...........restart s the child process.\n' +
    '  mon.quit()..............kills the child process and exit.\n' +
    '  mon.usage().............prints that helper text.\n' +
    '  mon.dump()..............prints monitor status.\n' +
    'Events:\n'.yellow +
    "  mon.on('start').........child process has started.\n" +
    "  mon.on('crash').........child process has crashed.\n" +
    "  mon.on('exit')..........child process has cleanly exited.\n" +
    "  mon.on('restart').......child process has restarted.\n" +
    "  mon.on('ready').........child process sent server-ready message.\n" +
    '========================================================================'.gray.bold;

function log(kind, message) {
    switch (kind) {
        case 'action':
            console.log(`tiny-nodemon ${kind.padEnd(8)} : `.cyan.bold + `${message}`.white);
            break;
        case 'event':
            console.log(`tiny-nodemon ${kind.padEnd(8)} : `.cyan.bold + `${message}`.yellow);
            break;
        case 'message':
            console.log(`tiny-nodemon ${kind.padEnd(8)} : `.cyan.bold + `${message}`.green);
            break;
        case 'error':
            console.log(`tiny-nodemon ${kind.padEnd(8)} : `.cyan.bold + `${message}`.red);
            break;
        default:
            console.log(`tiny-nodemon ${kind.padEnd(8)} : `.cyan.bold + `${message}`.grey);
            break;
    }
}
// #endregion

// #region TinyNodemon

/**
 * class TinyNodemon
 */
class TinyNodemon extends EventEmitter {
    /**
     * TinyNodemon constructor
     * @param {string} modulePath - path to the script to run and monitor
     * @param {array} args - arguments to pass to the script to run
     * @param {object} options - collection of key/value pairs to add to environment
     * @param {function} callback - function to call when script exited nicely
     */
    constructor(modulePath, args, options, callback) {
        super();
        this.modulePath = modulePath;
        this.script = path.basename(modulePath);
        this.args = args;
        this.options = options;
        this.callback = callback;

        // start script
        this.run(true);
    }

    onChildExit(child, code, signal) {
        log('event', `child ${child.pid}-'${this.script}' EXIT with code ${code}, signal ${signal}`);

        this.kill(child);

        if (child.pid === this.child.pid) {
            this.running = false;
            this.emit('exit');
        } else {
            child.unref();
        }

        if (this.waitRestart)
            clearTimeout(this.waitRestart);
        if (this.needstart)
            this.restart();
    }

    onChildError(child, err) {
        log('event', `child ${child.pid}-'${this.script}' CRASHED with error ${err.code}:${err.message}`.red);
        this.running = false;

        this.kill(child, 'SIGKILL');

        if (child.pid === this.child.pid) {
            this.running = false;
            this.emit('exit');
        } else {
            child.unref();
        }

        if (this.waitRestart)
            clearTimeout(this.waitRestart);
        if (this.needstart)
            this.restart();
    }

    onChildMessage(child, message) {
        if (message === 'server-ready') {
            log('message', `child ${child.pid}-'${this.script}' is ready`);
            this.emit('ready');
        } else if (message === 'server-exit') {
            log('message', `child ${child.pid}-'${this.script}' is closed`);
            if (this.callback) {
                log('action', 'run specified callback.');
                this.callback();
            }
        } else {
            /* skip other messages
            log('message', `child ${child.pid}-'${that.script}' sent "${message}"`);
            */
        }
    }

    run(first = true) {
        if (this.running)
            return;

        log('action', `FORK '${this.modulePath}'.`);

        const child = fork(this.modulePath, this.args, this.options);
        this.child = child;
        const that = this;

        child
            .on('exit', (code, signal) => {
                that.onChildExit(child, code, signal);
            })
            .on('error', (err) => {
                that.onChildError(child, err);
            })
            .on('message', (message) => {
                that.onChildMessage(child, message);
            });

        this.emit(first ? 'start' : 'restart');
        this.running = true;
        this.needstart = false;
    }

    restart() {
        if (!this.modulePath)
            return this;

        log('action', `RESTART '${this.script}`);

        if (this.running) {
            this.needstart = true;
            this.waitRestart = setTimeout(() => {
                this.running = false;
                if (this.needstart)
                    this.run(false);
            }, WAIT_TIMEOUT);

            this.kill(this.child);

            return this;
        }

        this.run(false);

        return this;
    }

    quit() {
        log('action', `QUIT and stop child ${this.child ? this.child.pid : 0}-'${this.script}`);

        // this.needstart = false;
        if (this.waitRestart)
            clearTimeout(this.waitRestart);

        if (this.child) {
            this.child.unref();
            this.child.removeAllListeners();
            this.modulePath = '';
            this.kill(this.child, 'SIGKILL');
            this.child = null;
        }

        return this;
    }

    kill(child, signal = '') {
        if (child.killed)
            return false;

        if (!signal)
            signal = 'SIGTERM';

        log('action', `KILL ${child.killed ? 'killed' : ''} ${child.pid}-'${this.script} with signal ${signal}`);

        if (!child.kill(signal)) {
            log('error', `could not kill child ${child.pid}.`);
            return false;
        }

        return true;
    }

    usage() {
        console.log(usage);
        return this;
    }

    dump() {
        console.log('tiny-nodemon : '.cyan.bold + 'dump'.cyan.bold);
        console.log(`  modulePath  = ${this.modulePath ? this.modulePath : 'undefined'}`);
        console.log(`  args        = ${this.args ? this.args : 'undefined'}`);
        console.log(`  options     = ${this.options ? '=>' : 'undefined'}`);
        if (this.options) {
            console.log(`          cwd = ${this.options.cwd}`);
            console.log(`          env = ${this.options.env}`);
        }
        console.log(`  running     = ${this.running ? this.running : 'undefined'}`);
        console.log(`  needstart   = ${this.needstart ? this.needstart : 'undefined'}`);
        console.log(`  waitRestart = ${this.waitRestart ? this.waitRestart : 'undefined'}`);
        console.log(`  child       = ${this.child ? this.child.pid : 'undefined'}`);
        console.log('========================================================================'.gray.bold);

        return this;
    }
}

// #endregion

// #region servermon
/**
 * servermon
 *
 */
const servermon = {};

servermon.ready = function () {
    if (process.send)
        process.send('server-ready');
    return servermon;
};

servermon.exit = function (code) {
    if (process.send) {
        process.send('server-exit');
        process.send({
            message: 'server-exit',
            code: code
        });
    }
    return servermon;
};

// #endregion

// #region nodemon factory

function tinyNodemon(config) {
    let modulePath;
    let args = [];
    const options = {
        cwd: process.cwd(),
        env: process.env
    };
    let callback = () => { };

    // load config
    if (!config) {
        console.error('tiny-nodemon error: '.cyan.bold + 'missing parameter config.'.red);
        console.log(usage);
        return null;
    }
    if (typeof config === 'string') {
        modulePath = config;
    } else {
        if (!config.script || typeof config.script !== 'string') {
            console.error('tiny-nodemon error: '.cyan.bold + 'missing "script" parameter in config.'.red);
            console.log(usage);
            return null;
        }
        modulePath = config.script;
        if (config.args)
            args = args.concat(config.args);
        if (config.cwd)
            options.cwd = config.cwd;
        if (config.env)
            options.env = Object.assign(config.env, process.env);
        if (config.done && typeof config.done === 'function')
            callback = config.done;
        // TODO: parameter timeout  ?
    }
    if (!fs.existsSync(modulePath)) {
        console.error('tiny-nodemon error: '.cyan.bold + `couldn't find script "${modulePath}".`.red);
        console.log(usage);
        return null;
    }

    return new TinyNodemon(modulePath, args, options, callback);
}

// #endregion

/**
 * export(s)
 */
export { tinyNodemon, servermon };
export default tinyNodemon;

// __ end of file __
