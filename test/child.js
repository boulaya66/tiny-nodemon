/**
 * import packages
 **/
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { servermon } from '../index.js';
import fs from 'fs';
import 'colors';

/**
 * consts & vars
 */
// Initializing old CommonJS variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('launch child.js : '.magenta.bold);
console.log(`  env  : ${process.env.NODE_ENV}`);
console.log(`  cwd  : ${process.cwd()}`);
console.log(`  argv : ${process.argv.length - 2} arguments`);
process.argv.slice(2).forEach((val, index) => {
    console.log(`    ${index}: ${val}`);
});

const
    port = 3000;
const hostname = 'localhost';
const staticpath = path.join(__dirname, './public');

// app variables in an old declarative way
var server;

/**
 * start server
 * */

server = http
    .createServer((req, res) => {
        console.log(`server request ${req.url}`.magenta.bold);
        fs.readFile(staticpath + req.url, function (err, data) {
            if (err) {
                res.writeHead(404);
                res.end(JSON.stringify(err));
                return;
            }
            res.writeHead(200);
            res.end(data);
        });
    })
    .listen(port, hostname, () => {
        var host = server.address().address;
        var port = server.address().port;

        console.log('server started'.magenta.bold);
        console.log(`  listening on http://${host}:${port}/index.html`);
        console.log(`  and serves static files located in '${staticpath}'`);
        servermon.ready();
    });

process.on('SIGTERM', handle);
process.on('SIGINT', handle);

function handle(signal) {
    console.log(`server received signal ${signal}`.magenta.bold);
    server.close(() => {
        console.log('server closed nicely'.magenta.bold);
        servermon.exit(signal);
    });
};
