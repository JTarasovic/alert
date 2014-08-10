#!/usr/bin/env node
var Pushbullet = require('pushbullet'),
    pusher = new Pushbullet(process.env.ALERT_PUSH_API),
    exec = require('child_process').exec,
    text = process.argv.slice(2);

var child = exec("notify-send --urgency=low -i " + text.join(' '),
  function (err, stdout, stderr) {
    if (err) {
      console.log('exec error: ' + err);
    }
});


pusher.note('',text[1],text[1], function(err, resp){
    if(err){
        console.log(err);
        return;
    }
    console.log(resp);
})
