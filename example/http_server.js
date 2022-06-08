const http = require('http'),
      fakeSocket = require('fake-socket');

// start a http server
var httpServer = http.createServer((req, res) => {
    //send a basic response: e.g. GET /
    res.end(req.method + ' ' + req.url);
})
// note that no ports are opened

// create a socket
let sock = fakeSocket.createFakeSocket();
// log any returned data
sock.on('data', d => {
    // spread it across multiple lines, because this is using a net socket directly, it will also print the headers etc
    console.log('Recieved http data:');
    console.log(d.toString());
});
// connect to the server
sock.mockConnect(httpServer);
// send a http request through the net socket directly
sock.write('GET / HTTP/1.1\r\nHost: localhost\r\n\r\n');

// expected output:

// Recieved http data:
// HTTP/1.1 200 OK
// Date: Mon, 1 Jan 1900 00:00:00 GMT
// Connection: keep-alive
// Keep-Alive: timeout=5
// Content-Length: 5
// 
// GET /
// 