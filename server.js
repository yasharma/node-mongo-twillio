require('dotenv').config({silent: true});
var app = require('express')()
, bodyParser = require('body-parser')
, client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
, speakeasy = require('speakeasy');

app.listen(3000);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.post('/send-code', function(req, res){
	if( !req.body.phone_number ){
		return res.json({
			message: 'Phone number is required to verify'
		});
	}
	var code = speakeasy.totp({key: 'abc123'});
	client.sendSms({
		to: req.body.phone_number,
		from: process.env.TWILIO_NUMBER,
		body: 'Your verification code is: ' + code
	}, function(twilioerr, responseData) {
		if (twilioerr) { 
			res.send(twilioerr);
		} else {
			res.json({
				message: 'Your verification code is: ' + code
			});
		}
	});
});