const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// 用户注册路由
router.post('/register', async (req, res) => {
	const { username, password, email /* 其他字段 */ } = req.body;

	try {
		// 检查用户名和邮箱是否已经存在
		const existingUser = await User.findOne({ $or: [{ username }, { email }] });

		if (existingUser) {
			return res.status(400).json({ error: '用户名或邮箱已被注册' });
		}

		// 创建用户
		const hashedPassword = await bcrypt.hash(password, 10);
		const user = new User({
			username,
			password: hashedPassword,
			email,
			// 添加其他字段
		});

		await user.save();

		res.status(201).json({ message: '注册成功' });
	} catch (error) {
		console.error('注册失败:', error);
		res.status(500).json({ error: '注册失败' });
	}
});

// 用户登录（返回 JSON，适合前端 SPA）
router.post('/login', (req, res, next) => {
	passport.authenticate('local', (err, user, info) => {
		if (err) {
			console.error('登录错误:', err);
			return next(err);
		}

		if (!user) {
			// info 由策略提供（见 config/passport.js）
			return res.status(400).json({ error: info?.message || '用户名或密码错误' });
		}

		req.logIn(user, (loginErr) => {
			if (loginErr) {
				console.error('登录失败:', loginErr);
				return next(loginErr);
			}

			// 不把密码等敏感字段返回给前端
			const safeUser = {
				id: user._id,
				username: user.username,
				role: user.role,
				email: user.email,
			};

			return res.json({ message: '登录成功', user: safeUser });
		});
	})(req, res, next);
});

// 用户登出
router.post('/logout', (req, res, next) => {
	req.logout((err) => {
		if (err) {
			return next(err);
		}
		res.json({ message: '已登出' });
	});
});

module.exports = router;

