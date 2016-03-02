'use strict';

var Wxr = require('wxr');
var $ = require('cheerio');
var path = require('path');
var fs = require('fs');
var imgUrlFix = 'http://read.html5.qq.com/image?src=forum&q=5&r=0&imgflag=7&imageUrl=';
var outputDir = path.join(__dirname, 'out');

var importer = new Wxr();
var files = [];
fs.readdirSync(outputDir).forEach(function(name) {
  if (!name.endsWith('.html')) {
    return;
  }
  files.push(name);
  var raw = fs.readFileSync(path.join(outputDir, name), 'utf-8');
  var article = parseArticle(raw);
  try {
    importer.addPost({
      title: name.slice(0, -5),
      date: article.date,
      contentEncoded: article.content,
    });
  } catch (ex) {
    ex.articleTitle = name.slice(0, -5);
    console.error(ex);
  }
});

function parseArticle(raw) {
  var obj = {};
  var contentNode = $(raw).find('#js_content');

  var postDate = $(raw).find('#post-date').text();
  obj.date = postDate || '';

  var imgs = [];
  var imgNodes = contentNode.find('img');
  for (var i = 0; i < imgNodes.length; i++) {
    var img = imgNodes[i];
    imgs.push(img.data['src']);
  }

  var contentStr = contentNode.html();
  imgs.forEach(function() {
    var search = 'data-src="' + img + '"';
    var replace = 'src="' + imgUrlFix + img + '"';
    contentStr = contentStr.replace(search, replace);
  });
  obj.content = contentStr;
  return obj;
}

fs.writeFileSync(path.join(__dirname, 'result.xml'), importer.stringify(), 'utf-8');
console.log(files.length + ' files done.');
