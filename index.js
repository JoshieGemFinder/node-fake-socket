const net = require('net'),
      http = require('http'),
      stream = require('stream'),
      util = require('util'),
      Socket = net.Socket

class FakeSocket extends Socket {
    #counterpart;
    #encoding;
    #data;
    
    constructor() {
        super(arguments);
        this.#data = Buffer.alloc(0);
    }
    
    setEncoding(encoding) {
        this.#encoding = encoding;
        return this;
    }
    
    getEncoding() {
        return this.#encoding
    }
    
    setCounterpart(socket) {
        this.#counterpart = socket;
        return this;
    }
    
    getCounterpart(socket) {
        return this.#counterpart;
    }
    
    read(size=-1, encode=true) {
        let end = size >= 0 ? size : this.#data.length
        let data = size >= this.#data.slice(0, size) : this.#data.slice()
        this.#data = this.#data.slice(end)
        if(encode && this.#encoding != null) {
            data = data.toString(this.#encoding)
        }
        return data
    }
    
    unshift(data, encoding='utf8') {
        this.#data = Buffer.concat([Buffer.from(data, encoding), this.#data])
    }
    
    write(data, encoding='utf8', callback=null) {
        let buf = Buffer.concat([read(-1, false), Buffer.from(data, encoding)])
        let counterEncoding = this.#counterpart.getEncoding();
        if(counterEncoding != null) {
            buf = buf.toString(counterEncoding);
        }
        this.#counterpart._emit('data', buf);
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
    this.getCounterpart()._emit(...Array.prototype.slice.apply(args));
}
FakeSocket.prototype._emit = function(...args) {
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
    
    input.connect = input.mockConnect
    
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
    
    input.connect = input.mockConnect
    
    return input
}

exports.FakeSocket = FakeSocket
exports.createFakeSocket = createFakeSocket
exports.createConnectionGenerator = function createConnectionGenerator(server) {
    return function createConnection() {
        return createFakeSocket().mockConnect(server);
    }
}