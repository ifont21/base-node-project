const mongoose = require('mongoose');

const Player = mongoose.model('Player', {
	username: {
		type: String,
		required: true,
		minlength: 1
	},
	wins:{
		type: Number,
		default: 0
	},
	defeates:{
		type: Number,
		default: 0
	},
	online:{
		type: Boolean,
		default: false
	}
});

module.exports = { Player }; 