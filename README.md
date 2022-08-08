# fake-net-socket  
A fake net socket, that allows you to connect to local servers that don't have any open ports!  
I have completely rewritten the entire thing from scratch, since it was a mess before.  
# But what does it do?  
This module lets you "connect" to a local net/http/https/etc server running in the same node instance, *that you have access to as a variable*, that doesn't have any ports open, you can send data to and from, as if it was connected through a regular net socket.  
# How to set it up  
There are a few exports for the module:  
[`net <Object>`](#object-fakesocketnet)  
[`tls <Object>`](#object-fakesockettls)  
[`util <Object>`](#object-fakesocketutil)  
(Although anything accessible in these objects is also accessible directly through the exports as well, e.g. `fakesocket.net.createFakeSocket` is also accessible through `fakesocket.createFakeSocket` directly)  
  
They are all covered in more detail below:  

# Object: `fakesocket.util`  

This is what you want to use if you want extra info on your sockets.

## `fakesocket.util.isFakeSocket(socket)`
  
* Returns: `<Boolean>` Whether or not the passed `socket` was created using this module.

## `fakesocket.util.getCounterpartSocket(socket)`
  
* Returns: `<net.Socket>` | `<stream.Duplex>` | `<null>` The socket/duplex that this is writing to, returns `null` if this is not a fake socket.

# Object: `fakesocket.net`  

This is the utility you want to use if connecting to a normal `net.Server` or `http.Server`, for the version used to connect to `tls.Server` and `https.Server`, you want the [`fakesocket.tls`](#object-fakesockettls) submodule  

## `fakesocket.net.createFakeSocket()`  
  
* Returns: [`<net.Socket>`](https://nodejs.org/api/net.html#class-netsocket)  
  
This sets up a socket pair, that is ready to connect to a server via the returned socket's [`mockConnect`](#fakesocketmockconnectserver) method.   

### `Socket.mockConnect(server[, callback])`  
* `server` [`<net.Server>`](https://nodejs.org/api/net.html#class-netserver) The server to connect to.
* `callback` `<Function>` A function that is automatically called when the socket is ready to be used.  
* Returns: [`<net.Socket>`](https://nodejs.org/api/net.html#class-netsocket) The socket itself.  
  
This is required for making the socket actually connect to the server, similar to [`net.Socket.connect()`](https://nodejs.org/api/net.html#socketconnect).  

This function also overrides the socket's default `connect()` function, so it can be accessed through there as well  

This method only exists by default if the socket is created through [`createFakeSocket()`](#fakesocketnetcreatefakesocket).  

## `fakesocket.net.createConnectionGenerator(server)`  
* `server` [`<net.Server>`](https://nodejs.org/api/net.html#class-netserver) Server to connect to.   
* Returns: `<Function>` A function that can be used in http/https request options.  
  
This is a generator function for a valid `createConnection` argument in a http request (See [`http.request()`](https://nodejs.org/api/http.html#httprequestoptions-callback)). It only needs to be called once per server, as a single function will work for multiple requests.


## `fakesocket.net.createSockets()`  
* Returns: `<Object>`
    * `input` `<net.Socket>` A side of a socket pair, corresponds to `output`.
    * `output` `<net.Socket>` A side of a socket pair, corresponds to `input`.
  
This generates a socket pair, where writing to one will output data at the other, closing one will also close its other side.  
  
These sockets will still have their normal `connect` functions, and will not have the `mockConnect` functions, which are only added when the socket is created through `createFakeSocket()`, do not use this function unless you know what you're doing.  
  

# Object: `fakesocket.tls`  

The big one.  

This is the submodule that you would use to make sockets that can connect to tls/https servers.  
  
Does actually do the whole encryption/decryption thing, so useful if you want to pipe an actual tls connection to an external socket, but not really very good or fast if you want to do a whole bunch of communications, since encryption/decryption takes time and resources.
  
## `fakesocket.tls.createDuplexes()`  

* Returns: `Object`
    * `input` `<stream.Duplex>` A dulplex that pushes all data to `output`
    * `output` `<stream.Duplex>` A dulplex that pushes all data to `input`

Creates a duplex pair, where writing to one will output data at the other, closing one will also close its other side.
  
No extra methods have been added to either duplex.  

## `fakesocket.tls.createFakeTLSSocket([options])`  

* `options` `<Object>` options to pass to `new TLSSocket()`
* Returns: `TLSSocket` A `TLSSocket` that is connected to a duplex, and can connect to local tls servers

Creates a tls socket that is ready to connect to a local tls server through `Socket.mockConnect`  
The default `Socket.connect` is also overridden and aliased to `Socket.mockConnect`

### `Socket.mockConnect(server[[, host, port][, options]][, callback])`

* `server` `<tls.Server>` The server the socket should connect to.
* `host` `<String>` The server name used for authenticating certificates, not actually for connecting, optional because `host` from the options of `createFakeSocket` or the `options` argument can be used instead.
* `port` `<String | Integer>` The server port used for authenticating certificates, not actually for connecting, optional because `port` from the options of `createFakeSocket` or the `options` argument can be used instead.
* `options` `<Object>` Options used to replace `options` passed in `createFakeSocket`, will not remove any options from the options passed in `createFakeTLSSocket` if they are not set here.
* `callback` `<Function>` Called when the socket is finished connecting to the server

Connects the socket to a specified tls server  
`host` and `port` MUST be provided at some time, in the options to `createFakeTLSSocket`, in the options at `mockConnect`, or as arguments in `mockConnect`, unless you want issues to occurr in certificate validification  

## `fakesocket.tls.createFakeSocket()`  

Alias for [`fakesocket.tls.createFakeTLSSocket()`](#fakesockettlscreatefaketlssocketoptions), will not override `fakesocket.net.createFakeSocket()` when they are aliased to the main module

## `fakesocket.tls.createTLSConnectionGenerator([server][, host][, port][, options])`

* `server` `<tls.Server>` a server can be passed to the function, if it is not passed like this, it must be passed either in `options` or in the request it is attached to.
* `host` `<String>` a hostname that can be passed to the function and is used for certificate validification, if it is not passed here, it must be passed either in `options` or in the request it is attached to.
* `port` `<String>` a port that can be passed to the function and is used for certificate validification, if it is not passed here, it must be passed either in `options` or in the request it is attached to, if it is not passed there, a default port will be used.
* `options` `<Object>` options to be passed to `connectTLS`, if it is not provided, the connected request will be passed instead
* Returns: `<Function>` the connection generator to be used in https requests.

Creates a connection generator for TLS requests  

## `fakesocket.tls.connectTLS(server[, host, port][, options][, callback])`

* `server` `<tls.Server>` the server to connect to
* `host` `<String>` the host used for certificate validification, can be passed in `options` instead
* `port` `<String | Integer>` the port used for certificate validification, can be passed in `options` instead
* `options` `<Object>` passed to `tls.connect`, can be used to substitute in `host` or `port`
* `callback` `<Function>` called when the connection is completed
* Returns: `<TLSSocket>` the result of `tls.connect`

Connects to a server locally, done all by itself.  
Preferred over `createFakeTLSSocket()`.
