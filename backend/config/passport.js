// backend/config/passport.js
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

module.exports = function (passport) {
  // 本地用户名密码登录策略
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'username',
        passwordField: 'password',
      },
      async (username, password, done) => {
        try {
          const user = await User.findOne({ username });
          if (!user) {
            return done(null, false, { message: '用户不存在' });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: '密码不正确' });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // 会话序列化 / 反序列化
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
};

