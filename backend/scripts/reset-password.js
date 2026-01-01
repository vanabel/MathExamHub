#!/usr/bin/env node
/**
 * 密码重置工具脚本
 * 用法: node backend/scripts/reset-password.js <username> <newPassword>
 * 或: node backend/scripts/reset-password.js --email <email> <newPassword>
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// 导入用户模型
const User = require(path.join(__dirname, '../models/User'));

// 连接数据库
const connectDB = async () => {
	try {
		const options = {
			serverSelectionTimeoutMS: 5000, // 5秒超时
			socketTimeoutMS: 45000, // 45秒socket超时
		};
		await mongoose.connect('mongodb://localhost:27017/mathexam', options);
		console.log('✓ 已连接到 MongoDB');
	} catch (error) {
		console.error('✗ MongoDB 连接失败:', error.message);
		console.error('提示: 请确保 MongoDB 正在运行');
		console.error('  启动命令: brew services start mongodb-community 或 mongod');
		process.exit(1);
	}
};

// 重置密码
const resetPassword = async (identifier, newPassword, isEmail = false) => {
	try {
		const query = isEmail ? { email: identifier } : { username: identifier };
		const user = await User.findOne(query);

		if (!user) {
			console.error(`✗ 用户不存在: ${identifier}`);
			process.exit(1);
		}

		// 哈希新密码
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		user.updatedTime = new Date();
		await user.save();

		console.log(`✓ 密码重置成功`);
		console.log(`  用户: ${user.username} (${user.email})`);
		console.log(`  新密码: ${newPassword}`);
	} catch (error) {
		console.error('✗ 密码重置失败:', error.message);
		process.exit(1);
	}
};

// 主函数
const main = async () => {
	const args = process.argv.slice(2);

	if (args.length < 2 || (args[0] === '--email' && args.length < 3)) {
		console.log('用法:');
		console.log('  通过用户名: node backend/scripts/reset-password.js <username> <newPassword>');
		console.log('  通过邮箱:   node backend/scripts/reset-password.js --email <email> <newPassword>');
		process.exit(1);
	}

	let identifier, newPassword, isEmail = false;

	if (args[0] === '--email') {
		isEmail = true;
		identifier = args[1];
		newPassword = args[2];
	} else {
		identifier = args[0];
		newPassword = args[1];
	}

	await connectDB();
	await resetPassword(identifier, newPassword, isEmail);

	// 关闭连接
	await mongoose.connection.close();
	console.log('✓ 数据库连接已关闭');
	process.exit(0);
};

main();

