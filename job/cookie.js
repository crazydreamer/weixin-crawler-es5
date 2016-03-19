/*！
 * 获取cookie
 * Copyright(c) 2016 yanjixiong <yjk99@qq.com>
 */

var request = require('superagent');
var schedule = require('node-schedule');
var client = require('../lib/redis');


function getCookie() {
  for(var i = 0, len = 10; i < len; i++) {
    setTimeout(function() {
      request
        .get('http://weixin.sogou.com/weixin?query=' + Math.random())
        .end(function(err, res){
          var SNUID = res.header['set-cookie'][1].split(';')[0];
          SNUID = SNUID.indexOf('SNUID') !== -1 ? SNUID.split('=')[1] : '';
          if (SNUID) {
            client.sadd('crawler:snuidContainer', SNUID, function(err, result) {
              console.log('result: ', result);
            });
          }
          console.log(res.header);
          console.log('SNUID:', res.header['set-cookie'][1].split(';')[0].split('=')[1]);
        });
    }, 100 * i);
  }
}

schedule.scheduleJob('* */6 * * * *', getCookie);