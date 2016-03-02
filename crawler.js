'use strict';

var request = require('urllib-sync').request;
var sleep = require('sleep').sleep;
var xmldoc = require('xmldoc');
var path = require('path');
var fs = require('fs');

var outputDir = path.join(__dirname, 'out');
var apiRoot = 'http://weixin.sogou.com';
var openId = 'oIWsFtxeRmps0rYmGp4YfFuFemv0';
var ext = '0rtEYLQriOO1Zyn1UU6JUj0hciWvLFrkn0AR7LWPWjk6qS7bg2ZYSLPQ6Y63f5kD';
var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36';
var mockHeaders = {
  'Cookie': 'CXID=870C18F2A7F60593504B09F2D642299E; SUID=9806D771556C860A56469ABC00081AC0; ad=Qyllllllll2QSI$DlllllVBp7wwllllltNtpullllxtlllllROxlw@@@@@@@@@@@; ABTEST=0|1447655412|v1; SUV=005678392A784B02564977F4AC1FE321; weixinIndexVisited=1; SNUID=175F6C3E151030B79E467A35158C8D67; ppinf=5|1447661995|1448871595|Y2xpZW50aWQ6NDoyMDE3fGNydDoxMDoxNDQ3NjYxOTk1fHJlZm5pY2s6NzpyaWNoYXJkfHRydXN0OjE6MXx1c2VyaWQ6NDQ6MDdDMTk5NUE1RjY2OEI3MDdCM0Q3MjhBRjk0QjhDNjFAcXEuc29odS5jb218dW5pcW5hbWU6NzpyaWNoYXJkfA; pprdig=vYoosRiYsly_dG9xF4QZKwieMbWcY4PgXc3JzrBb-fUNhpLIdXnOovlLaFQ80Wh5daXoxUH0xefLMdjdh_85C8BuoQ_XrEnJljk7xdQu04xXmX0Bjj_GVxZ-tzPpNWCHnq_8KitC386i9AZRDuYWHLnIRN-2wi_aJln7Tz9Plog; PHPSESSID=ag3qu15q3s69vnv1kdl4rbpnl4; SUIR=175F6C3E151030B79E467A35158C8D67; ppmdig=1447681981000000154dc1b9b56d4530abda30e346f3be48; sct=7; wapsogou_qq_nickname=; IPLOC=CN3100',
  'Host': 'weixin.sogou.com',
  'User-Agent': userAgent,
};
var skipPage = 0;
var totalPage = 10;
var interval = 60; // 60s

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
  var url = apiRoot + '/gzh?cb=handleList&openid=' + openId + '&ext=' + ext + '&page=' + page + '&t=' + new Date().getTime();
  console.log('[%s] %s', new Date(), url);
  var result = request(url, {
    timeout: 5000,
    headers: mockHeaders,
  });
  var body = result.data.toString();
  ensureResult(body);
//  try {
//    eval(body);
//  } catch (ex) {
//    ex.name = 'HandleListError';
//    ex.url = ex.url || url;
//    ex.originBody = ex.originBody || body;
//    return onerror(ex);
//  }
}

// 请求文章详情页
function requestArticle(link) {
  var url = apiRoot + link;
  console.log('[%s] %s', new Date(), url);
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
  console.log('[%s] %s', new Date(), redirUrl);
  var redirResult = request(redirUrl, {timeout: 5000});
  var redirBody = redirResult.data.toString();
  ensureResult(redirBody);
  return redirBody;
}

function handleList(res) {
  var items = res.items || [];
  items.forEach(function(item) {
    var doc = new xmldoc.XmlDocument(item);
    var node = doc.children[1].children[3].children;
    var articleTitle = node[2].val.trim();
    var articleLink = node[3].val.trim();
    handleArticle(articleLink, articleTitle);
    sleep(interval);
  });
}

function handleArticle(link, title) {
  var raw = requestArticle(link);
  var filePath = path.join(outputDir, $(title).html);
  fs.writeFileSync(filePath, raw, 'utf-8');
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (var page = 1 + skipPage; page <= totalPage; page++) {
  requestList(page);
  sleep(interval);
}


