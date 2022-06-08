const http = require('http'),
      fakeSocket = require('fake-socket');

// start a http server
var httpServer = http.createServer((req, res) => {
    //send a basic response: e.g. GET /
    res.end(req.method + ' ' + req.url);
});
// note that no ports are opened

var options = {
    // create a socket generator for the specified httpServer
    createConnection: fakeSocket.createConnectionGenerator(httpServer),
    path: '/',
    method: 'GET'
}
// start a http request with the above options
var req = http.request(options, res => {
    // log all of the returned data
    res.on('data', d => console.log('Recieved data ' + d.toString()));
})
// send the request
req.end();

// expected output:

// Recieved data GET /