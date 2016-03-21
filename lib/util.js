/**
 * 工具类
 */

exports.randomStr = function (length) {
  var base62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var base36 = 'abcdefghijklmnopqrstuvwxyz0123456789';
  var base10 = '0123456789';

  function create(chars) {
    return function random() {
      var salt = '';
      for (var i = 0; i < length; i++) salt += chars[Math.floor(chars.length * Math.random())]
      return salt
    }
  }

  return {
    base62: create(base62),
    base36: create(base36),
    base10: create(base10)
  }
};

