/*！
 * redis client
 * Copyright(c) 2016 yanjixiong <yjk99@qq.com>
 */

var redis = require('redis');
var client = redis.createClient(6379, '127.0.0.1');

module.exports = client;