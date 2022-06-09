const net = require('net'),
      http = require('http'),
      stream = require('stream'),
      util = require('util'),
      Socket = net.Socket

var Symbols = {}
let tempSock = new Socket()
for(let key of Reflect.ownKeys(tempSock)) {
    if(typeof(key) == 'symbol') {
        Symbols[Symbol.keyFor(key)] = key
    }
}

class FakeSocket extends Socket {
    #counterpart;
    #encoding;
    #data;
    //#buffer;
    
    constructor() {
        super(arguments);
        this.#data = Buffer.alloc(0);
        //this.#buffer = [];
        this.#encoding = null;
        this.on('resume', () => {
            let data = this._read()
            if(data.length > 0) {
                this.#counterpart._emit('data', data)
            }
        })
    }
    
    _setBytesWritten(num) {
        if(this._handle != null) {
            this._handle.bytesWritten = num
        } else {
            this[Symbols['kBytesWritten']] = num
        }
    }
    
    _setBytesRead(num) {
        if(this._handle != null) {
            this._handle.bytesRead = num
        } else {
            this[Symbols['kBytesRead']] = num
        }
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
    
    _read(size=-1, encode=true) {
        let prevlen = this.#data.length
        let end = size >= 0 ? size : this.#data.length
        let data = this.#data.slice(0, end)
        this.#data = this.#data.slice(end)
        if(encode && this.#encoding != null) {
            data = data.toString(this.#encoding)
        }
        if(prevlen > 0) {
            this._emit('drain')
        }
        return data
    }
    
    unshift(data, encoding='utf8') {
        this.#data = Buffer.concat([Buffer.from(data, encoding), this.#data])
    }
    
    _writeToBuffer(data, encoding='utf8') {
        let buf = Buffer.from(data, encoding)
        //this.#buffer.push(buf.length)
        this.#data = Buffer.concat([this.#data, buf])
    }
    
    write(data, encoding='utf8', callback=null) {
        let buf = Buffer.concat([this._read(-1, false), Buffer.from(data, encoding)]);
        
        let shouldEmit = this.#counterpart.readableFlowing === true;
        if(buf.length > 0) {
            if(shouldEmit) {
                let len = buf.length
                //let counterEncoding = this.#counterpart.getEncoding();
                //if(counterEncoding != null) {
                //    buf = buf.toString(counterEncoding);
                //}
                this._setBytesWritten(this.bytesWritten + len)
                process.nextTick(() => {
                    this.#counterpart._emit('data', buf);
                    this.#counterpart._setBytesRead(this.#counterpart.bytesRead + len)
                })
            } else {
                this._writeToBuffer(data, encoding)
            }
        }
        
        if(callback != null && (typeof(callback) == 'function' || callback instanceof Function)) {
            callback();
        }
        return shouldEmit;
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
    
    input.mockConnect = function(server, callback) {
        
        if(typeof(callback) == 'function' || callback instanceof Function) { input.on('ready', callback) }
        
        output._server = server;
        output.server = server;
        output.allowHalfOpen = server.allowHalfOpen;
        
        server.emit('connection', output);
        
        input._emit('connect')
        
        this.writable = true
        this.readable = true
        
        input._emit('ready')
        
        return this;
    }
    
    input.connect = input.mockConnect
    
    return input;
}

//unused right now, still have to program in the classes
function createMultiSocket() {
    let input = new MultiFakeSocket();
    
    input.mockConnect = function(server, callback) {
        output = new FakeSocket();
        input.addCounterpart(output);
        output.setCounterpart(input);
        
        output._server = server;
        output.server = server;
        output.allowHalfOpen = server.allowHalfOpen;
        server.emit('connection', output);
        
       if(typeof(callback) == 'function') { callback() }
        
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