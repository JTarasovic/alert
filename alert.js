#!/usr/bin/env node

// generally the idea is:
//      1: create stream
//      2: wait for push tickle
//      3: fetch updates since the last time we checked

var Pushbullet = require('pushbullet'),
    pusher = new Pushbullet(process.env.ALERT_PUSH_API),
    stream= pusher.stream(),
    time = new Date().getTime() / 1000,
    exec = require('child_process').exec,
    _sq ='\'', _esq='\\\'',
    me;


// turn a push into something usable by notify-send here
var processResponse =  function (msg) {
    var ret = {};

    // assign notification subject based on type
    if (msg.type === 'address') {
            ret.subject = msg.name;
    }
    else  ret.subject = msg.type == 'file' ? msg.file_name : msg.title;
    // double check
    if (!ret.subject) ret.subject = 'New Push';


    // create notification body
    ret.body = '';
    if (msg.type === 'address')     ret.body = msg.address;
    else if (msg.type === 'file')       ret.body = msg.file_url;
    else if (msg.type === 'note')    ret.body = msg.body;
    else if (msg.type === 'link')      ret.body = msg.url + (msg.body ? '\n' + msg.body : '');
    else if (msg.type === 'list') {
        msg.items.forEach(function(elem) {
          ret.body += elem.text + '\n';
      });
    }
    // double check
    if (!ret.body)  ret.body = '';

    // escape double quotes. we'll surround the whole thing back in doAlert
    ret.subject = ret.subject.replace(_dq, _edq);
    ret.body = ret.body.replace(_dq, _edq);
    return ret;
};

// this will eventually do the actual alerting.
// it gets the response from the fetched updates and creates alert
// also, importantly, updates the time since we last got an update
var doAlert = function(err, resp){
    if(err) {
        console.err(err);
        return;
    }

    // variable to hold just the newest push
    var newest = resp.pushes[0];

    // update time to be the created time of the latest push
    time = newest.modified;

    // only interested in the newest, non-dismissed push for now
    if((newest.receiver_iden === me.iden) && (newest.dismissed === false)){
        var notif = processResponse(newest);
        var cmd = 'notify-send -u normal -t 10000 "' +
        notif.subject + '" "' +
        notif.body + '"';

        var child = exec(cmd, function(err, stdout, stderr) {
            if (err) console.error(err);
        });
    }
};

// function to fetch new data. Uses the creation timestamp from
// last message (or start of program)
var refresh = function() {
    console.log('Received tickler. Fetching messages after ' + time);
    var options = {
        limit: 5,
        modified_after: time
    };
    pusher.history(options, doAlert);
};

// on connect
var connect = function() {
    console.log('Connected!');
};

// on close
var close = function () {
    console.log('Connection closed');

    // may want to try to restart here?
    // alternatively, if daemonized, may kick itself back off?
    process.exit();
};

// when we get a tickle,
// check if it's a push type,
// if so, fetch new pushes
var tickle = function(type) {
    if ( type === 'push') refresh();
};

// close the stream and quit
var error = function (err) {
    console.error(err);
    stream.close();
};

// function to gracefully shutdown
var exit = function () {
    console.log('Received interrupt. Exiting.');
    stream.close();
};

// event handlers
stream.on('connect', connect);
stream.on('close', close);
stream.on('tickle', tickle);
stream.on('error', error);

// catch SIGNALS so we can gracefully exit
process.on('SIGHUP', exit);
process.on('SIGTERM', exit);
process.on('SIGINT', exit);

// start by grabbing our own information
pusher.me(function(err, resp) {
    if(err){
        console.error(err);
        process.exit(1);
    }
    me = resp;

    // connect to websocket stream
    stream.connect();
});
