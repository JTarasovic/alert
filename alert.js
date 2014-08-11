#!/usr/bin/env node

// generally the idea is:
//      1: create stream
//      2: wait for push tickle
//      3: fetch updates since the last time we checked

var Pushbullet = require('pushbullet'),
    pusher = new Pushbullet(process.env.ALERT_PUSH_API),
    stream= pusher.stream(),
    // create a time variable that equals the seconds since UNIX epoch
    // so that we know when the "last time" we checked was
    time = new Date().getTime() / 1000;


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
        time = newest.created;

        console.dir(resp);


        // Recieved tickler. Fetching messages after 1407794161.887
        // { pushes:
        //     [ { iden: 'ujyLPxYsmQ0sjz705fMHim',
        //         sender_email_normalized: 'email@gmail.com',
        //         receiver_iden: 'ujyLPxYsmQ0',
        //         receiver_email_normalized: 'email@gmail.com',
        //         title: 'CSS Components - Ionic Framework',
        //         dismissed: false,
        //         receiver_email: 'email@gmail.com',
        //         type: 'link',
        //         active: true,
        //         sender_iden: 'ujyLPxYsmQ0',
        //         created: 1407795194.33336,
        //         url: 'http://ionicframework.com/docs/components/#cards',
        //         modified: 1407795194.33347,
        //         sender_email: 'email@gmail.com' } ] }
        //     Received interrupt. Exiting.
}


// function to fetch new data. Uses the creation timestamp from
// last message (or start of program)
var refresh = function() {
    console.log('Received tickler. Fetching messages after ' + time);

    var options = {
        limit: 5,
        modified_after: time
    }
    pusher.history(options, doAlert);
}

// on connect
var connect = function() {
    console.log('Connected!');
}

// on close
var close = function() {
    console.log('Connection closed');

    // may want to try to restart here?
    // alternatively, if daemonized, may kick itself back off?
    process.exit();
}

// when we get a tickle,
// check if it's a push type,
// if so, fetch new pushes
var tickle = function(type) {
    if( type === 'push'){
        refresh(time);
    }
}

// close the stream and quit
var error = function(err) {
    console.error(err);
    stream.close();
}

// function to gracefully shutdown
var exit = function() {
    console.log('Received interrupt. Exiting.')
    stream.close();
}

// event handlers
stream.on('connect', connect);
stream.on('close', close);
stream.on('tickle', tickle);
stream.on('error', error);

// catch SIGNALS so we can gracefully exit
process.on('SIGHUP', exit);
process.on('SIGTERM', exit);
process.on('SIGINT', exit);


// connect
stream.connect();
