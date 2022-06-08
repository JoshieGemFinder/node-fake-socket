const net = require('net'),
      http = require('http'),
      stream = require('stream'),
      util = require('util'),
      Socket = net.Socket

class FakeSocket extends Socket {
    #counterpart;
    #encoding;
    
    constructor() {
        super(arguments);
    }
    
    setEncoding(encoding) {
        this.#encoding = encoding;
        return this;
    }
    
    getEncoding(encoding) {
        return this.#encoding
    }
    
    setCounterpart(socket) {
        this.#counterpart = socket;
        return this;
    }
    
    getCounterpart(socket) {
        return this.#counterpart;
    }
    
    write(data, encoding='utf8', callback=null) {
        let buf = Buffer.from(data, encoding)
        let counterEncoding = this.#counterpart.getEncoding();
        if(counterEncoding != null) {
            buf = buf.toString(counterEncoding);
        }
        this.#counterpart.trueEmit('data', buf);
        if(callback != null && (typeof(callback) == 'function' || callback instanceof Function)) {
            callback();
        }
        return true;
    }
    
    destroy(error) {
        this.trueDestroy();
        this.#counterpart.trueDestroy(error);
    }
    
    trueDestroy(error) {
        super.destroy(error);
    }
}

let oldEmit = FakeSocket.prototype.emit;

//use Array.prototype.slice.apply since the "..." operator will error if ...args resolves to some non-array somehow
FakeSocket.prototype.emit = function(...args) {
    this.getCounterpart().trueEmit(...Array.prototype.slice.apply(args));
}
FakeSocket.prototype.trueEmit = function(...args) {
    oldEmit.apply(this, Array.prototype.slice.apply(args));
}

function createFakeSocket() {
    let input = new FakeSocket();
    let output = new FakeSocket();
    
    input.setCounterpart(output);
    output.setCounterpart(input);
    
    input.mockConnect = function(server) {
        output._server = server;
        output.server = server;
        output.allowHalfOpen = server.allowHalfOpen;
        server.emit('connection', output);
        return this;
    }
    
    return input;
}

//unused right now, still have to program in the classes
function createMultiSocket() {
    let input = new MultiFakeSocket();
    
    input.mockConnect = function(server) {
        output = new FakeSocket();
        input.addCounterpart(output);
        output.setCounterpart(input);
        
        output._server = server;
        output.server = server;
        output.allowHalfOpen = server.allowHalfOpen;
        server.emit('connection', output);
        
        return this;
    }
    
    return input
}

exports.FakeSocket = FakeSocket
exports.createFakeSocket = createFakeSocket
exports.createConnectionGenerator = function createConnectionGenerator(server) {
    return function createConnection() {
        return createFakeSocket().mockConnect(server);
    }
}