#!/usr/bin/env node
var Pushbullet = require('pushbullet'),
    stream = new Pushbullet(process.env.ALERT_PUSH_API).stream();
    // exec = require('child_process').exec,
    // text = process.argv.slice(2);

// var child = exec("notify-send --urgency=low -i " + text.join(' '),
//   function (err, stdout, stderr) {
//     if (err) {
//       console.log('exec error: ' + err);
//     }
// });
//
//
// pusher.note('',text[1],text[1], function(err, resp){
//     if(err){
//         console.log(err);
//         return;
//     }
//     console.log(resp);
// })


var connect = function() {
    console.log('Connected!');
}

var close = function() {
    console.log('Connection closed');
    process.exit();
}

var tickle = function(type) {
    console.dir(type);
}

var error = function(err) {
    console.error(err);
    stream.close();
}

var exit = function() {
    console.log('Received interrupt. Exiting.')
    stream.close();
}

// var nop = function() {
//     console.log('Keep-alive nop received');
// }
//
// var push = function(push) {
//     console.log(push);
// }
//
// var msg = function(msg) {
//     console.log(msg);
// }

stream.on('connect', connect);
stream.on('close', close);
stream.on('tickle', tickle);
stream.on('error', error);
//stream.on('nop', nop);
//stream.on('push', push);
//stream.on('message', msg);

process.on('SIGHUP', exit);
process.on('SIGTERM', exit);
process.on('SIGINT', exit);

stream.connect();
