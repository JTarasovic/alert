// generally the idea is:
//      1: create stream
//      2: wait for push tickle
//      3: fetch updates since the last time we checked
function notificationd (options){
    var Pushbullet = require('pushbullet');
    this.api = options.api;
    this.pusher = new Pushbullet(this.api);
    this.stream= this.pusher.stream();
    this.time = new Date().getTime() / 1000;
    this.notifier = require('notify-send').normal.timeout(5000);
    this.user = {};

    // event handlers
    this.stream.on('connect', this.connect.bind(this))
        .on('close', this.close.bind(this))
        .on('tickle', this.tickle.bind(this))
        .on('error', this.error.bind(this));

    // start by grabbing our own information
    this.pusher.me(function(err, resp) {
        if(err){
            console.error(err);
            process.exit(1);
        }
        this.user = resp;

        // connect to websocket stream
        this.stream.connect();
    }.bind(this));

    return this;
}

// turn a push into something usable by notify-send here
notificationd.prototype._createNotification =  function (msg) {
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
    else if (msg.type === 'link')      ret.body = (msg.body ? msg.body + '\n': '') + msg.url ;
    else if (msg.type === 'list') {
        msg.items.forEach(function(elem) {
          ret.body += elem.text + '\n';
      });
    }
    // double check
    if (!ret.body)  ret.body = '';

    return ret;
};

// this will eventually do the actual alerting.
// it gets the response from the fetched updates and creates alert
// also, importantly, updates the time since we last got an update
notificationd.prototype._handleResponse = function(err, resp){
    if(err) {
        console.err(err);
        return;
    }

    // variable to hold just the newest push
    var newest = resp.pushes[0];

    // update time to be the created time of the latest push
    this.time = newest.modified;

    // only interested in the newest, non-dismissed push for now
    if((newest.receiver_iden === this.user.iden) && (newest.dismissed === false)){
        var notif = this._createNotification(newest);
        this.notifier.notify(notif.subject, notif.body, function (err, stdout, stderr) {
            if(err) {
                console.error(err);
            }
            return;
        });
    }
};

// function to fetch new data. Uses the creation timestamp from
// last message (or start of program)
notificationd.prototype._getPushes = function() {
    console.log('Received tickler. Fetching messages after ' + this.time);
    var options = {
        limit: 5,
        modified_after: this.time
    };
    this.pusher.history(options, this._handleResponse.bind(this));
};

// on connect
notificationd.prototype.connect = function() {
    console.log('Connected to Pushbullet.');
};

// on close
notificationd.prototype.close = function () {
    console.log('Pushbullet connection closed');

    // may want to try to restart here?
    // alternatively, if daemonized, may kick itself back off?
    process.exit();
};

// when we get a tickle,
// check if it's a push type,
// if so, fetch new pushes
notificationd.prototype.tickle = function(type) {
    if ( type === 'push') this._getPushes();
};

// close the stream and quit
notificationd.prototype.error = function (err) {
    console.error(err);
    this.stream.close();
};

// function to gracefully shutdown
notificationd.prototype.exit = function () {
    console.log('Pushbullet connection received interrupt. Closing.');
    this.stream.close();
};

module.exports = notificationd;
