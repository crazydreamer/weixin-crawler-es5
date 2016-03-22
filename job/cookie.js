/*！
 * 获取cookie
 * Copyright(c) 2016 yanjixiong <yjk99@qq.com>
 */

var request = require('superagent');
var schedule = require('node-schedule');
var client = require('../lib/redis');
var util = require('../lib/util');

exports.key = 'crawler:snuidContainer';

/**
 * 获取cookie
 */
function getCookie() {
  for(var i = 0, len = 10; i < len; i++) {
    setTimeout(function() {
      request
        .get('http://weixin.sogou.com/weixin?query=' + util.randomStr(4).base36())
        .end(function(err, res){
          var SNUID = res.header['set-cookie'][1].split(';')[0];
          SNUID = SNUID.indexOf('SNUID') !== -1 ? SNUID.split('=')[1] : '';
          if (SNUID) {
            client.sadd(exports.key, SNUID, function(err, result) {
              console.log('result: ', result);
            });
          }
          console.log('SNUID:', res.header['set-cookie'][1].split(';')[0].split('=')[1]);
        });
    }, 1000 * i);
  }
}

/**
 * 清除容器
 */
function clearContainer() {
  client.del(exports.key);
}

console.log('Get Cookie Job Start...');
schedule.scheduleJob('* */6 * * * *', getCookie); // do job every six hours
schedule.scheduleJob('* */6 * * * *', clearContainer);//clear cookie pool every six hours
clearContainer();
getCookie();