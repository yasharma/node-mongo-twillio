var mongoose = require('mongoose'),
    Schema = mongoose.Schema,

UserSchema 	= new Schema({
	phone_number: {
		type: String
	},
	verified: Boolean,
	code: Number
});
module.exports = mongoose.model('User', UserSchema);