require('dotenv').config({silent: true});
var app = require('express')()
, http = require('http')
, server = http.createServer(app)
, io = require('socket.io').listen(server)
, client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
, mongoose  = require('mongoose')
, User = require('./UserModel.js')
, speakeasy = require('speakeasy');

mongoose.connect('mongodb://localhost/cherrydoorphone');
mongoose.set('debug', true);

server.listen(3000);

app.get('/',function(req,res){
	res.sendfile('./public/index.html')
});

function createUser(phone_number, code, socket) {
	var users = new User({phone_number: phone_number, code: code, verified: false});
	users.save(function (saverr) {
		if (saverr) { throw saverr; }
		client.sendSms({
			to: phone_number,
			from: process.env.TWILIO_NUMBER,
			body: 'Your verification code is: ' + code
		}, function(twilioerr, responseData) {
			if (twilioerr) { 
				users.remove(phone_number, function(remerr) {if (remerr) { throw remerr; }});
				socket.emit('update', {message: "Invalid phone number!"});
			} else {
				socket.emit('code_generated');
			}
		});
	});
}

function checkVerified(socket, verified, number) {
	if (verified == true) {
		socket.emit('reset');
		socket.emit('update', {message: "You have already verified " + number + "!"});
		return true;
	}
	return false;
}

io.sockets.on('connection', function(socket) {
	console.log('socket.io connected');
	socket.on('register', function(data) {
		var code = speakeasy.totp({key: 'abc123'});
		User.findOne({phone_number: data.phone_number}, function (err, doc) {
			if( err ) throw err;
			if(doc && checkVerified(socket, doc.verified, data.phone_number) == false) {
				socket.emit('update', {message: "You have already requested a verification code for that number!"});
				socket.emit('code_generated');
			} else {
				createUser(data.phone_number, code, socket);
			}
		});

	});

	socket.on('verify', function(data) {
		User.findOne({phone_number: data.phone_number}, function (err, doc) {
			if(err) throw err;
			if (doc && checkVerified(socket, doc.verified, data.phone_number) == false && doc.code == parseInt(data.code)) {
				socket.emit('verified');
				socket.emit('update', {message: "You have successfully verified " + data.phone_number + "!"});
				User.update({phone_number: data.phone_number}, {$set: {code: parseInt(data.code), verified: true}}, function (saverr) { if (saverr) { throw saverr; }});
			} else {
				socket.emit('update', {message: "Invalid verification code!"});
			}
		});

	});
});