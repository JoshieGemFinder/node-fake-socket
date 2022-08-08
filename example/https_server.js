const https = require('https'),
      fs = require('fs'),
      fakeSocket = require('fake-net-socket');

//assume this is a certificate for example.com
var certificate = {
    cert: fs.readFileSync('certificate/certificate.pem'),
    key: fs.readFileSync('certificate/key.pem')
}

// start a https server
var httpsServer = https.createServer(certificate, (req, res) => {
    //send a basic response: e.g. GET /
    res.end(req.method + ' ' + req.url);
})
// note that no ports are opened

// create a socket
let sock = fakeSocket.createFakeTLSSocket();
// log any returned data
sock.on('data', d => {
    // spread it across multiple lines, because this is using a net socket directly, it will also print the headers etc
    console.log('Recieved https data:');
    console.log(d.toString());
});
// connect to the server
sock.mockConnect(httpsServer, 'example.com', 443)

// send a https request through the socket directly
sock.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n');

// expected output:

// Recieved https data:
// HTTP/1.1 200 OK
// Date: Mon, 1 Jan 1900 00:00:00 GMT
// Connection: keep-alive
// Keep-Alive: timeout=5
// Content-Length: 5
// 
// GET /
// 