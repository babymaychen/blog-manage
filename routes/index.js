var express = require('express');
var router = express.Router();
var flash = require('connect-flash');
var crypto = require('crypto'),
    User = require('../models/user.js'),
    Article = require('../models/article.js');

function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '未登录!'); 
    res.redirect('/login');
  }
  next();
}

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '已登录!'); 
    res.redirect('back');//返回之前的页面
  }
  next();
}

router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date.now());
  next();
});

router.get('/', function (req, res) {
 Article.get(null, function (err, posts) {
     if (err) {
       posts = [];
     } 
     res.render('index', {
       title: '主页',
       user: req.session.user,
       posts: posts,
       success: req.flash('success').toString(),
       error: req.flash('error').toString()
     });
   });
});
router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
	res.render('reg', {
		 title: '注册',
		 user: req.session.user,
		 success: req.flash('success').toString(),
		 error: req.flash('error').toString()
	});
});
router.post('/reg', checkNotLogin);
router.post('/reg', function (req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    if (password_re != password) {
      req.flash('error', '两次输入的密码不一致!'); 
      return res.redirect('/reg');
    }
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
        name: name,
        password: password,
        email: req.body.email
    });
    User.get(newUser.name, function (err, user) {
      if (err) {
        req.flash('error', err);
        return res.redirect('/');
      }
      if (user) {
        req.flash('error', '用户已存在!');
        return res.redirect('/reg');
      }
      newUser.save(function (err, user) {
        if (err) {
          req.flash('error', err);
          return res.redirect('/reg');
        }
        req.session.user = user;
        req.flash('success', '注册成功!');
        res.redirect('/');
      });
    });
  });
router.get('/login', checkNotLogin);
router.get('/login', function (req, res) {
  res.render('login', {
          title: '登录',
          user: req.session.user,
          success: req.flash('success').toString(),
          error: req.flash('error').toString()});
});
router.post('/login', checkNotLogin);
router.post('/login', function (req, res) {
  //生成密码的 md5 值
  var md5 = crypto.createHash('md5'),
      password = md5.update(req.body.password).digest('hex');
  //检查用户是否存在
  User.get(req.body.name, function (err, user) {
    if (!user) {
      req.flash('error', '用户不存在!'); 
      return res.redirect('/login');//用户不存在则跳转到登录页
    }
    //检查密码是否一致
    if (user.password != password) {
      req.flash('error', '密码错误!'); 
      return res.redirect('/login');//密码错误则跳转到登录页
    }
    //用户名密码都匹配后，将用户信息存入 session
    req.session.user = user;
    req.flash('success', '登陆成功!');
    res.redirect('/');//登陆成功后跳转到主页
  });
});
router.get('/post', checkLogin);
router.get('/post', function (req, res) {
   res.render('post', {
      title: '发表',
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
});
router.post('/post', checkLogin);
router.post('/post', function (req, res) {
	var currentUser = req.session.user,
      post = new Article(currentUser.name, req.body.title, req.body.post, req.body.tag);
	  post.save(function (err) {
	    if (err) {
	      req.flash('error', err); 
	      return res.redirect('/');
	    }
	    req.flash('success', '发布成功!');
	    res.redirect('/');//发表成功跳转到主页
	  });
});
router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
	req.session.user = null;
	 req.flash('success', '登出成功!');
	 res.redirect('/');//登出成功后跳转到主页
});

router.get('/u/:name/:title', function (req, res) {
  Article.getOne(req.params.name, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('/');
    }
    res.render('article', {
      title: req.params.title,
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.get('/edit/:name/:title', checkLogin);
router.get('/edit/:name/:title', function (req, res) {
  var currentUser = req.session.user;
  Article.edit(currentUser.name, req.params.title, function (err, post) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('back');
    }
    res.render('edit', {
      title: '编辑',
      post: post,
      user: req.session.user,
      success: req.flash('success').toString(),
      error: req.flash('error').toString()
    });
  });
});

router.post('/edit/:name/:title', checkLogin);
router.post('/edit/:name/:title', function (req, res) {
  var currentUser = req.session.user;
  Article.update(currentUser.name, req.params.title, req.body.post, req.body.tag, function (err) {
    var url = encodeURI('/u/' + req.params.name + '/' + req.params.title);
    if (err) {
      req.flash('error', err); 
      return res.redirect(url);//出错！返回文章页
    }
    req.flash('success', '修改成功!');
    res.redirect(url);//成功！返回文章页
  });
});

router.get('/remove/:name/:title', checkLogin);
router.get('/remove/:name/:title', function (req, res) {
  var currentUser = req.session.user;
  Article.remove(currentUser.name, req.params.title, function (err) {
    if (err) {
      req.flash('error', err); 
      return res.redirect('back');
    }
    req.flash('success', '删除成功!');
    res.redirect('/');
  });
});

module.exports = router;
