'use strict';

var request = require('urllib-sync').request;
var sleep = require('sleep').sleep;
var path = require('path');
var fs = require('fs');
var util = require('util');
var cheerio = require('cheerio');
var req = require('superagent');
var redis = require('./lib/redis');
var cookie = require('./job/cookie');

var apiRoot = 'http://weixin.sogou.com';
var userAgent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.85 Safari/537.36';
var mockHeaders = {
  'Cookie': 'CXID=B3EBF622BC23A4DD15784FC9617F7C36; SUID=52FC111B142D900A55B72DFB0004A20B; SUV=1439361586856051; pgv_pvi=2340838400; GOTO=Af99046; ssuid=2533552660; ABTEST=7|' + parseInt(new Date().getTime() / 1000 + '') + '|v1; weixinIndexVisited=1; sct=28; ld=Lkllllllll2Q1IgtlllllVbA1FwlllllpenAGyllllwllllljZlll5@@@@@@@@@@; ad=$lllllllll2qHhTElllllVboMpolllllpe4DUkllll9lllll9llll5@@@@@@@@@@; SNUID={SNUID}; IPLOC=CN4200',
  'Host': 'weixin.sogou.com',
  'User-Agent': userAgent,
};
var skipPage = 0;
var totalPage = 10;
var interval = 3; // 60s

function onerror(err) {
  console.log(err);
  console.log(err.stack);
  process.exit(1);
}

function ensureResult(body) {
  if (body.indexOf('您的访问出错了') >= 0) {
    var err = new Error('Reached list request limit.');
    err.name = 'RequestListLimited';
    err.url = url;
    err.originBody = body;
    return onerror(err);
  }
}

// 请求文章列表页
function requestList(page) {
  var url = apiRoot + util.format('/weixin?query=%s&sourceid=inttime_day&type=2&interation=&tsn=1&t=' + new Date().getTime(), 'node.js');
  console.log(apiRoot);
  console.log('[%s] %s', new Date(), url);
  var result = request(url, {
    timeout: 5000,
    headers: mockHeaders,
  });
  var body = result.data.toString();
  ensureResult(body);
//  console.log(body);
  handleList(body);
}

// 请求文章详情页
function requestArticle(link) {
  var url = link.indexOf('weixin.qq') === -1 ? apiRoot + link : link;
  console.log('[%s] requestArticle => %s', new Date(), url);
  var result = request(url, {
    timeout: 5000,
    headers: mockHeaders,
  });
  var body = result.data.toString();
  var headers = result.headers || {};
  var redirUrl = headers['location'] || '';
  ensureResult(body);
  if (String(result.status)[0] !== '3' ||
      !redirUrl || redirUrl.indexOf('antispider') >= 0) {

    var err = new Error('Request article failed.');
    err.name = 'RequestArticleError';
    err.url = url;
    err.originBody = body;
    return onerror(err);
  }
  console.log('[%s] redirUrl => %s', new Date(), redirUrl);
  var redirResult = request(redirUrl, {timeout: 5000});
  var redirBody = redirResult.data.toString();
  ensureResult(redirBody);
  return redirBody;
}

/**
 * 解析真实url
 * @returns {*|string}
 */
function handleRedirectUrl(link) {
  var url = link.indexOf('weixin.qq') === -1 ? apiRoot + link : link;
  console.log('[%s] requestArticle => %s', new Date(), url);
  var result = request(url, {
    timeout: 5000,
    headers: mockHeaders
  });
  var headers = result.headers || {};
  console.log('redirectUrl', headers['location']);
  return headers['location'] || '';
}

function handleList(res) {
  var articleList = [];
  var $ = cheerio.load(res, {normalizeWhitespace: true});
  var $chapters = $('.wx-rb .txt-box');

  $chapters.each(function(index, chapter) {
    var title = $(chapter).find('h4 a').text();
    var link = $(chapter).find('h4 a').attr('href');
    var $weixinAccount = $(chapter).find('.s-p a#weixin_account');
    var weixinAccountName = $weixinAccount.attr('title');
    var weixinAccountLink = $weixinAccount.attr('href');

    articleList.push({
      title: title,
      link: handleRedirectUrl(link),
      accountName: weixinAccountName,
      accountLink: apiRoot + weixinAccountLink,
      category: 'node.js'
    });

    sleep(interval);
  });

  console.log('articleList: ', articleList);

  //请求自己的数据接口发送数据
  articleList.forEach(function(article) {
    req
      .post('localhost:3001/topic/add')
      .send(article)
      .end(function(err, res){
        // Calling the end function will send the request
        console.log('res:', res);
      });
  })
}

/**
 * 爬取
 */
function crawl() {
  console.log('key:', cookie.key);
  redis.srandmember(cookie.key, function(err, result) {
    if (err) return onerror(err);
    console.log('get SNUID from pool:', result);
    mockHeaders.Cookie = mockHeaders.Cookie.replace('{SNUID}', result);
    if (err) return onerror(err);
    for (var page = 1 + skipPage; page <= totalPage; page++) {
      requestList(page);
      sleep(interval);
    }
  });
}

crawl();



