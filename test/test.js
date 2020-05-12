'use strict';

import { tinyNodemon } from '../index.js';
import { fileURLToPath } from 'url';
import path from 'path';
import 'colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('test: START ...'.yellow.bold);
const /* tinynodemon = tinyNodemon({
    script: path.join(__dirname, 'child1.js'),
    args: [
        '-p 3000',
        '--host localhost',
        '--verbose'
    ],
    cwd: process.cwd(),
    env: {
        NODE_ENV: 'development'
    },
    done: () => {
        console.log('CALLBACK called'.bgBrightBlue);
    }
});

 */
    tinynodemon = tinyNodemon({
        script: path.join(__dirname, 'child.js'),
        args: [
            '-p 3000',
            '--host localhost',
            '--verbose'
        ],
        cwd: process.cwd(),
        env: {
            NODE_ENV: 'development'
        },
        done: () => {
            console.log('test: callback...'.yellow.bold);
        }
    });

let restarting = false;
tinynodemon
    .on('start', () => {
        console.log('test: child started ...'.yellow.bold);
        // tinynodemon.dump();
    })
    .on('crash', () => {
        console.log('test: child crashed ...'.yellow.bold);
        console.log('test: RESTART ...'.yellow.bold);
        restarting = true;
        tinynodemon.restart();
        // tinynodemon.dump();
    }).on('exit', () => {
        console.log('test: child exited ...'.yellow.bold);
        if (!restarting) {
            console.log('test: RESTART ...'.yellow.bold);
            restarting = true;
            tinynodemon.restart();
        }
        // tinynodemon.dump();
    }).on('restart', () => {
        console.log('test: child restarted ...'.yellow.bold);
        // tinynodemon.dump();
    }).on('ready', () => {
        console.log('test: child ready ...'.yellow.bold);
        restarting = false;
        // tinynodemon.dump();
    });

let idx = 0;
const interval = setInterval(() => {
    idx++;
    console.log(`    Count : ${idx}`.yellow);
}, 1000);

setTimeout(() => {
    console.log('test: RESTART ...'.yellow.bold);
    restarting = true;
    tinynodemon.restart();
    idx = 0;
    setTimeout(() => {
        console.log('test: QUIT ...'.yellow.bold);
        clearInterval(interval);
        tinynodemon.quit();
    }, 60000);
}, 5000);
