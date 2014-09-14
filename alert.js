#!/usr/bin/env node

var notificationd = require('./lib/notificationd');
var daemon = new notificationd({api: process.env.ALERT_PUSH_API});
var net = require('net');
var terminate = function () {
    daemon.exit.apply(daemon);
    console.log('disconnecting pushd socket');
    server.close();
};

// catch SIGNALS so we can gracefully exit
process.on('SIGHUP', terminate)
    .on('SIGTERM', terminate)
    .on('SIGINT', terminate);

var server = net.createServer(function(conn) { //'connection' listener
    conn.on('end', function() {
        return;
    });

    conn.on('data', function(data){
        console.log(data.toString());
        conn.write('Received: ' + data + '\n');
    });
    conn.write('success\n');
});

server.listen('/tmp/pushd.sock', function() { //'listening' listener
    console.log('pushd listening at /tmp/pushd.sock');
});
