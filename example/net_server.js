const net = require('net'),
      fakeSocket = require('fake-socket');

//create a net server
let server = net.createServer(socket => {
    console.log('connection!');
    socket.write('Hello World!');
    socket.on('data', d => {
        console.log('server recieved ' + d.toString());
        socket.write('Hello World (from data event)!');
    });
});
//note that no ports are opened

//create a socket
let sock = fakeSocket.createFakeSocket();
//log any data recieved from the server
sock.on('data', d => {
    console.log('socket recieved ' + d.toString());
});
//connect to the server
sock.mockConnect(server);
// 'connection!' is logged
// 'Hello World!' is sent to the fake socket
// 'socket recieved Hello World!' is logged
sock.write('hi!'); // fake socket sends 'hi!' to the server
// 'server recieved hi!' is logged
// 'Hello World (from data event)!' is sent to the fake socket
// 'socket recieved Hello World (from data event)!' is logged

// expected output:

// connection!
// socket recieved Hello World!
// server recieved hi!
// socket recieved Hello World (from data event)!