const net = require('net'),
      http = require('http'),
      tls = require('tls'),
      https = require('https'),
      stream = require('stream'),
      Duplex = stream.Duplex,
      Socket = net.Socket

const kConnectedSocket = Symbol('kConnectedSocket'),
      kCounterpartSocket = Symbol('kCounterpartSocket')

const mustNotCall = function() {
    throw "Do not call this function!";
}

let detach = http.ServerResponse.prototype.detachSocket
http.ServerResponse.prototype.detachSocket = function detachSocket(socket) {
    if(isFakeSocket(socket) && socket._httpMessage !== this) {
        return
    }
    return detach.apply(this, arguments)
}

function decode(data, encoding) {
    if(typeof(data) === 'string') {
        data = Buffer.from(data, encoding)
    }
    return data
}

function applyConnectedTag(input, output) {
    input[kConnectedSocket] = true
    Object.defineProperty(input, kCounterpartSocket, {
        get() {
            return output
        }
    })
}

function applyEvents(input, output, tryPush) {
    let superclass = Duplex
    if(input instanceof Socket) {
        superclass = Socket
        input._writeGeneric = async function(writev, data, encoding, cb) {
            if (this.connecting) {
                this._pendingData = data;
                this._pendingEncoding = encoding;
                this.once('connect', function connect() {
                    this._writeGeneric(writev, data, encoding, cb);
                });
                return;
            }
            this._pendingData = null;
            this._pendingEncoding = '';
            /*
            if (!this._handle) {
                cb(new ERR_SOCKET_CLOSED());
                return false;
            }
            */
            this._unrefTimer();

            if (writev) {
                for(let d of data) {
                    tryPush(decode(d.chunk, d.encoding || encoding || this.defaultEncoding))
                    process.nextTick(d.callback())
                }
                cb()
            } else {
                tryPush(decode(data, encoding || this.defaultEncoding))
                cb()
            }
        }
    }
    input.destroy = function(exception, cb) {
        let error = (exception instanceof Error)
        process.nextTick(() => {
            if(error) { output.emit('error', exception) }
            else { output.emit('end') }
            process.nextTick(() => output.emit('close', error))
        })
        return superclass.prototype.destroy.apply(this, arguments)
    }
    applyConnectedTag(input, output)
}

function getCounterpartSocket(socket) {
    return socket != null ? socket[kCounterpartSocket] || null : null
}

function makeTryPush(socket, backup) {
    return function tryPush(data) {
        if(backup.length > 0) {
            backup.push(data)
            backup.read(0)
        } else if(!socket.push(data)) {
            backup.push(data)
        }
    }
}

function createSockets() {
    let inputData = []
    let outputData = []

    let input = new Socket({
        read: function() {
            while(inputData.length > 0) {
                if(!this.push(inputData.shift())) {
                    break
                }
            }
        }
    })
    let output = new Socket({
        read: function() {
            while(outputData.length > 0) {
                if(!this.push(outputData.shift())) {
                    break
                }
            }
        }
    })
    applyEvents(input, output, makeTryPush(output, outputData))
    applyEvents(output, input, makeTryPush(input, inputData))
    return {input, output}
}

function createFakeSocket() {
    let socks = createSockets()
    socks.output.connect = mustNotCall
    socks.input.mockConnect = function(server) {
        server.emit('connection', socks.output)
        process.nextTick(() => {
            socks.input.emit('connect')
            socks.input.emit('ready')
        })
        return this
    }
    socks.input.connect = socks.input.mockConnect
    
    return socks.input
}

function createConnectionGenerator(server) {
    return function createConnection(req) {
        return createFakeSocket().mockConnect(server || req.server)
    }
}

function isFakeSocket(socket) {
    return socket != null ? socket[kConnectedSocket] === true : false
}

function createDuplexes() {
    
    let inputData = []
    let outputData = []

    let input = new Duplex({
        read: function() {
            while(inputData.length > 0) {
                if(!this.push(inputData.shift())) {
                    break
                }
            }
        }
    })
    let output = new Duplex({
        read: function() {
            while(outputData.length > 0) {
                if(!this.push(outputData.shift())) {
                    break
                }
            }
        }
    })
    let inputPush = makeTryPush(output, outputData)
    let outputPush = makeTryPush(input, inputData)
    input._write = function(data, encoding, callback) {
        inputPush(decode(data, encoding || this.defaultEncoding))
        callback()
    }
    output._write = function(data, encoding, callback) {
        outputPush(decode(data, encoding || this.defaultEncoding))
        callback()
    }
    input._writev = function(chunks, callback) {
        for(let chunk of chunks) {
            inputPush(decode(chunk.chunk, chunk.encoding || this.defaultEncoding))
            process.nextTick(chunk.callback)
        }
        callback()
    }
    output._writev = function(chunks, callback) {
        for(let chunk of chunks) {
            outputPush(decode(chunk.chunk, chunk.encoding || this.defaultEncoding))
            process.nextTick(chunk.callback)
        }
        callback()
    }
    applyEvents(input, output, null)
    applyEvents(output, input, null)
    return {input, output}
}

function getArgValues(...args) {
    let options = {}
    
    for(let o of args) {
        let isServer = o instanceof net.Server || o instanceof tls.Server || o instanceof http.Server || o instanceof https.Server
        
        type = typeof(o)
        
        if(type === 'object' && !isServer) {
            opts.options = o
        } else if(isServer) {
            opts.server = o
        } else if(type === 'string') {
            opts.host = o
        } else if(type === 'number') {
            opts.port = o
        }
    }
    
    return options
}

function getTLSConnectArgs(server, host, port, options, callback, ) {
    let opts = {}
    let args = [server, host, port, options, callback]
    let cb = function nop() {}
    for(let o of args) {
        let isServer = o instanceof net.Server || o instanceof tls.Server || o instanceof http.Server || o instanceof https.Server
        let type = typeof(o)
        if(type === 'object' && !isServer) {
            opts = {...o, ...opts}
        } else if(isServer) {
            opts.server = o
        } else if(type === 'string') {
            opts.host = o
        } else if(type === 'number') {
            opts.port = o
        } else if(type === 'function') {
            cb = o
        }
    }
    
    options = {
        host: 'localhost',
        port: 443,
        ...opts
    }
    
    return {options: options, callback: cb}
}

function createFakeTLSSocket(options={}) {
    let duplexes = createDuplexes()
    
    let sock = new tls.TLSSocket(duplexes.input, {isServer: false, ...options})
    applyConnectedTag(sock, duplexes.output)
    
    let superoptions = options
    
    sock.mockConnect = function(server, host, port, options, callback) {
        let opts = getTLSConnectArgs(server, host, port, options, callback)
        
        opts.options = {...superoptions, ...opts.options}
        
        options = opts.options
        
        server.emit('connection', duplexes.output)
        process.nextTick(opts.callback)
        return sock
    }
    sock.connect = sock.mockConnect
    
    return sock
}

function connectTLS(server, host, port, options, callback) {
    let opts = getTLSConnectArgs(server, host, port, options, callback)
    
    options = opts.options
    callback = options.callback
    
    server = options.server
    
    let duplexes = createDuplexes()
    
    options.socket = duplexes.input
    
    server.emit('connection', duplexes.output)
    let socket = tls.connect(options, callback)
    
    return socket
}

function createTLSConnectionGenerator(server, host, port, options) {
    let opts = getArgValues(server, host, port, options)
    return function createConnection(req) {
        let _server = opts.server || req.server
        let _host = opts.host || req.host
        let _port = opts.port || req.port || (req.agent != null ? (req.agent.port || req.agent.defaultPort) : null) || req._defaultAgent.defaultPort
        let _options = opts.options || req
        return connectTLS(_server, _host, _port, _options)
    }
}

const normal = {
    createSockets,
    createFakeSocket,
    createConnectionGenerator
}

const tlsStuff = {
    createDuplexes,
    get createFakeSocket() { return createFakeTLSSocket },
    createFakeTLSSocket,
    createTLSConnectionGenerator,
    connectTLS
}

const util = {
    isFakeSocket,
    getCounterpartSocket
}

exports.util = util
exports.net = normal
exports.tls = tlsStuff

for(let k of Reflect.ownKeys(exports)) {
    let obj = exports[k]
    for(let i in obj) {
        if(Object.getOwnPropertyDescriptor(obj, i).get == null && exports[i] == null) {
            exports[i] = obj[i]
        }
    }
}

