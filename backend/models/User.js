// models/User.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// 用户模型
const userSchema = new Schema({
	username: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	role: {
		type: String, // 用户角色，例如 'admin' 或 'user'
		required: true,
		default: 'Basic',
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	createdTime: {
		type: Date,
		default: Date.now, // 创建时间默认为当前时间
	},
	updatedTime: {
		type: Date,
	},
	// 其他用户信息字段
});

const User = mongoose.model('User', userSchema);

module.exports = User;

