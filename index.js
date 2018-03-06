const express = require('express');
const pug = require('pug');
const querystring = require('querystring');
const http = require('http');
const https = require('https');
const fs = require('fs');
const tls = require('tls');
const moment = require('moment');
const app = express();

const host = "admin.dnms";
const ipn_path = "/modules/mod/paypal/main/paypalipn";

app.set('view engine', 'pug');
app.use(express.urlencoded());

app.get('/cgi-bin/webscr/', (req, res) => {
  const query = req.query;

  res.render('index', {query: query});
});

app.post('/cgi-bin/webscr', (req, res) => {
  const data = req.body;

  res.send('VERIFIED');
});

app.post('/pay', (req, res) => {
  const payload = req.body;
  const custom = payload.custom.split('__');
  const total = parseFloat(custom[1]);
  const paypalFee = parseFloat(custom[2]);
  const response = {
    mc_gross: total + paypalFee,
    protection_eligibility: "Eligible",
    payer_id: "fake_payer_id",
    payment_date: moment().format('HH:mm:ss MMM DD, YYYY') + ' PST',
    payment_status: "Completed",
    charset: "windows-1252",
    first_name: "First Name",
    mc_fee: paypalFee,
    notify_version: '3.9',
    custom: payload.custom,
    payer_status: 'verified',
    business: payload.business,
    quantity: 1,
    verify_sign: 'some-random-text-here',
    payer_email: 'payer@email.com',
    txn_id: 'test-transaction-id',
    payment_type: 'instant',
    payer_business_name: 'test business name co.',
    last_name: 'Last Name',
    receiver_email: payload.business,
    payment_fee: '',
    shipping_discount: '0.00',
    receiver_id: 'fake-receiver-id',
    insurance_amount: '0.00',
    txn_type: 'web_accept',
    item_name: payload.item_name,
    discount: '0.00',
    mc_currency: 'EUR',
    item_number: payload.item_number,
    residence_country: 'US',
    shipping_method: 'Default',
    transaction_subject: '',
    payment_gross: '',
    ipn_track_id: 'fake-ipn-track-id'
  };
  const post_data = querystring.stringify(response);
  const options = {
    host: host,
    path: ipn_path,
    method: "POST",
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(post_data)
    }
  };

  var responseString = '';

  const request = http.request(options, (res) => {
    res.on("data", (data) => {
        responseString += data;
        // save all the data from response
    });
    res.on("end", () => {
        console.log(responseString);
        // print to console when response ends
    });
  });

  request.write(post_data);
  request.end();

  res.redirect(payload.return);
});

var privateKey = fs.readFileSync('server.key');
var certificate = fs.readFileSync('server.crt');

// start web server
https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(443);


const port = 8000;
const options = {
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.crt'),
    requestCert: false, // ask for a client cert
    rejectUnauthorized: false, // act on unauthorized clients at the app level
};

// open ipn SSL/TLS socket verifier
var server = tls.createServer(options, (socket) => {
  socket.write('VERIFIED!');
  socket.pipe(socket);
})
.listen(port, function() {
    console.log('IPN SSL/TLS socket open on port ' + port + '\n');
});
