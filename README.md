# fake-net-socket  
A fake net socket, that allows you to connect to local servers that don't have any open ports!  
# But what does it do?  
This module lets you "connect" to a local net/http/https/etc server running in the same node instance, *that you have access to as a variable*, that doesn't have any ports open, you can send data to and from, as if it was connected through a regular net socket.  
# How to set it up  
There are three exports for the module:  
[`FakeSocket <Class>`](#class-fakesocket)  
[`createFakeSocket <Function>`](#createfakesocket)  
[`createConnectionGenerator <Function>`](#createconnectiongenerator)  
  
They are all covered in more detail below:  

## Class: `FakeSocket`  
  
* Extends: [`<net.Socket>`](https://nodejs.org/api/net.html#class-netsocket)  
  
This functions almost exactly like a normal socket, with a few (minor) differences, the main one being that they work in pairs (or counterparts); one socket will treat its counterpart as the other end of the connection. (e.g. A `FakeSocket`'s `write()` function will trigger its counterpart's `data` event).  

### `FakeSocket.getEncoding()`  
* Returns: `<string>` | `<null>` The encoding of the socket.  
  
Returns the encoding set in `setEncoding`  

### `FakeSocket.setCounterpart(socket)`  
* `socket` [`<FakeSocket>`](#class-fakesocket) The FakeSocket it should treat as its counterpart (the other end of the 'connection').  
* Returns: [`<FakeSocket>`](#class-fakesocket) The socket itself.  
  
Sets this socket's counterpart socket, (should not be used unless you know what you're doing).  

### `FakeSocket.getCounterpart()`  
* Returns: [`<FakeSocket>`](#class-fakesocket) This socket's counterpart.  
  
Gets this socket's counterpart socket, (should not need to be used unless you know what you're doing).  

### `FakeSocket.emit(eventName[, ...args])`  
* See [`EventEmitter.emit`](https://nodejs.org/api/events.html#emitteremiteventname-args).  
  
Triggering this will make its counterpart emit the event, use [`FakeSocket._emit(event, ...data)`](#fakesocketemiteventname-args-1) if you want to actually make it emit an event.  

### `FakeSocket._emit(eventName[, ...args])`  
* See [`EventEmitter.emit`](https://nodejs.org/api/events.html#emitteremiteventname-args).  
  
Actually triggers the event specified, with the data specified.  

### `FakeSocket.mockConnect(server[, callback])`  
* `server` [`<net.Server>`](https://nodejs.org/api/net.html#class-netserver) The server to connect to.
* `callback` `<Function>` A function that is automatically called when the socket is ready to be used.  
* Returns: [`<FakeSocket>`](#class-fakesocket) The socket itself.  
  
This is required for making the socket actually connect to the server, similar to [`net.Socket.connect()`](https://nodejs.org/api/net.html#socketconnect).  

This method only exists by default if the socket is created through [`createFakeSocket()`](#createfakesockets).  

## `createFakeSocket()`  
* Returns: [`<FakeSocket>`](#class-fakesocket) A socket that is ready to be connected via [`FakeSocket.mockConnect`](#fakesocketmockconnectserver).  
  
This sets up a socket pair, that is ready to connect to a server via the returned socket's [`mockConnect`](#fakesocketmockconnectserver) method.  

## `createConnectionGenerator(server)`  
* `server` [`<net.Server>`](https://nodejs.org/api/net.html#class-netserver) Server to connect to.   
* Returns: `<Function>` A function that can be used in http/https request options.  
  
This is a generator function for a valid `createConnection` argument in a http request (See [`http.request`](https://nodejs.org/api/http.html#httprequestoptions-callback)). It only needs to be called once per server, as a single function will work for multiple requests.