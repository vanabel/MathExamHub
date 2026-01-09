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
		// 安全提示：生产环境不记录详细错误信息
		if (process.env.NODE_ENV === 'development') {
			console.error('注册失败:', error);
		} else {
			console.error('注册失败');
		}
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

// 重置密码路由（管理员功能或忘记密码）
router.post('/reset-password', async (req, res) => {
	const { username, newPassword } = req.body;

	if (!username || !newPassword) {
		return res.status(400).json({ error: '用户名和新密码都是必需的' });
	}

	try {
		const user = await User.findOne({ username });

		if (!user) {
			return res.status(404).json({ error: '用户不存在' });
		}

		// 哈希新密码
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		user.updatedTime = new Date();
		await user.save();

		res.json({ message: '密码重置成功' });
	} catch (error) {
		// 安全提示：生产环境不记录详细错误信息
		if (process.env.NODE_ENV === 'development') {
			console.error('密码重置失败:', error);
		} else {
			console.error('密码重置失败');
		}
		res.status(500).json({ error: '密码重置失败' });
	}
});

// 通过邮箱重置密码
router.post('/reset-password-by-email', async (req, res) => {
	const { email, newPassword } = req.body;

	if (!email || !newPassword) {
		return res.status(400).json({ error: '邮箱和新密码都是必需的' });
	}

	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({ error: '该邮箱未注册' });
		}

		// 哈希新密码
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		user.updatedTime = new Date();
		await user.save();

		res.json({ message: '密码重置成功' });
	} catch (error) {
		// 安全提示：生产环境不记录详细错误信息
		if (process.env.NODE_ENV === 'development') {
			console.error('密码重置失败:', error);
		} else {
			console.error('密码重置失败');
		}
		res.status(500).json({ error: '密码重置失败' });
	}
});

module.exports = router;

