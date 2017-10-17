const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Challenge = mongoose.model('Challenge', {
	challengerOne: {
		player: { type: Schema.Types.ObjectId, ref: 'Player' },
		number: {
			type: String,
			default: '0000',
			minlength: 4
		},
		attempts: {
			type: Number,
			default: 0
		},
		won: {
			type: Boolean,
			default: false
		}
	},
	challengerTwo: {
		player: { type: Schema.Types.ObjectId, ref: 'Player' },
		number: {
			type: String,
			default: '0000',
			minlength: 4
		},
		attempts: {
			type: Number,
			default: 0
		},
		won: {
			type: Boolean,
			default: false
		}
	},
});

module.exports = { Challenge }; 