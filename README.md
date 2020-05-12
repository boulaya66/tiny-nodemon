tiny-nodemon
===========

To use with gulp + browser-sync

## Install

```bash
$ npm install --save-dev tiny-nodemon
```

## Usage

tiny-nodemon is almost exactly like regular gulp-nodemon, but doesn't provide nodemon, and implements a simpler monitoring engine (simpler means also less powerful).
```js
import { tinynodemon } from 'tiny-nodemon'
let mon = tinyNodemon('script.js') || tinyNodemon(config)
```
### Config
```bash
    script: file............The script to run and monitor.
    args  : [...]...........List of string arguments
    cwd   : path............Current working directory of the child process.
    env   : {key:value}.....Environment key-value pairs.
    done  : callback........Called on script exit.
```
Note: if the script is omitted, tiny-nodemon will exit.
### Api
```bash
    mon.restart()...........restart s the child process.
    mon.quit()..............kills the child process and exit.
    mon.usage().............prints that helper text.
    mon.dump()..............prints monitor status.
```
### Events
```bash
    mon.on('start').........child process has started.
    mon.on('crash').........child process has crashed.
    mon.on('exit')..........child process has cleanly exited.
    mon.on('restart').......child process has restarted.
    mon.on('ready').........child process sent server-ready message.
```
## Example

### In gulpfile.js
```js
import { tinyNodemon } from 'tiny-nodemon';

gulp.task('start', function (done) {
  var mon = tinyNodemon({
    'script': 'server.js',
    'args': [
        '-p 3000',
        '--host localhost',
        '--verbose'
    ],
    'cwd': process.cwd(),
    'env': {
        'NODE_ENV': 'development'
    },
    'done': done
  })
  .on('crash', () => {
      // pause browsersync and restart...
  })
  .on('ready', () => {
      // start borwsersync
  })
})
```

### In server.js
```js
import { servermon } from 'tiny-nodemon';

var server = http.createServer((req, res) => {
...
})
.listen(port, hostname, () => {
    console.info(`listening on http://${hostname}:${port}`);
    servermon.ready();
});

// optionally
process.on('SIGTERM', handle);
process.on('SIGINT', handle);

function handle(signal) {
    server.close(() => {
        servermon.exit(signal);
    });
};

```
***__ end of file __***
