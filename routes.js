var debug = require('debug')('wx');
var logger = require('./log/logger');
var render = require('./lib/render');
var to = require('./lib/to');
var weixin = require('./lib/weixin');

/*
* 1.存储到数据库
* 2.查询数据库
* 3.返回
*/
exports.handler = function() {
  //此处this==Weixin
  return function*(next) {
    //此处this=app.context
    var data = this.request.body.xml;
    var msg = to.toJs(data)
    var reMsg;
    logger.log(data);
    debug('user send msg is %s', msg);
    switch (msg.MsgType) {
      case 'text':
        reMsg = yield weixin.text(msg);
        break;
      case 'image':
        break;
      case 'voice':
        break;
      case 'event':
        reMsg = yield weixin.default(msg)
        // switch (msg.Event) {
        //   case 'subscribe':
        //     yield weixin.default(msg)
        //     break;
        //   default:
        //     yield weixin.default(msg)
        //     break;
        // }
        break;
      default:
        reMsg = yield weixin.default(msg);
        break;
    }
    reMsg = to.toXml(reMsg);
    this.body = reMsg;
    debug('user resv msg is %s', reMsg);
    logger.log(reMsg);
    yield next;
  };
};

exports.getIndex = function() {
  return function*(next) {
    if (this.session.user) {
      debug('get index');
      if (process.env.NODE_ENV === 'production') {
        this.body = yield render('index');
      } else {
        this.body = yield render('index_dev');
      }
    } else {
      this.redirect('/weixin/login');
    }
    yield next;
  };
};


exports.getLogin = function() {
  return function*(next) {
    debug('login get data is %s', this.session.user);
    if (this.session.user) {
      this.redirect('/weixin/index');
    } else {
      if (process.env.NODE_ENV === 'production') {
        this.body = yield render('index');
      } else {
        this.body = yield render('index_dev');
      }
    }
    yield next;
  };
};

exports.postLogin = function() {
  return function*(next) {
    var data = this.request.body;
    debug('login post data is %s', JSON.stringify(data));
    var user = yield this.mongo.db('weixin').collection('users').findOne(data, {
      _id: 0,
      password: 0
    });
    if (user) {
      debug('login session user is %s', user.username);
      this.session.user = user.username;
      this.redirect('/weixin/index');
    } else {
      this.status = 404;
    }
    yield next;
  };
};

exports.getKs = function() {
  return function*(next) {
    if (this.session.user) {
      var keywords = yield this.mongo.db('weixin').collection('keywords').find({}, {
        _id: 0
      }).toArray();
      this.body = keywords;
    } else {
      this.redirect('/weixin/login');
    }
    yield next;
  };
}

exports.addkey = function() {
  return function*(next) {
    if (this.session.user) {
      var keyword = this.request.body;
      var key = {
        key: keyword.key
      };
      var exist = yield this.mongo.db('weixin').collection('keywords').findOne(key);
      if (exist) {
        this.status = 400;
      } else {
        yield this.mongo.db('weixin').collection('keywords').insertMany([keyword]);
        this.body = {
          err: 0
        };
      }
    } else {
      this.redirect('/weixin/login');
    }
    yield next;
  };
}

exports.delkey = function() {
  return function*(next) {
    if (this.session.user) {
      var key = this.request.body;
      yield this.mongo.db('weixin').collection('keywords').deleteOne(key);
      this.status = 200;
    } else {
      this.status = 404;
    }
    yield next;
  };
}

exports.logout = function() {
  return function*(next) {
    this.session = null;
    this.redirect('/weixin/login');
    yield next;
  };
}
