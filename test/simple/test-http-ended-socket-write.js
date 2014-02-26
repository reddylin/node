// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var common = require('../common');
var assert = require('assert');

// Verify that ECONNRESET is raised when writing to a http request
// where the server has ended the socket.


var http = require('http');
var net = require('net');
var server = http.createServer(function(req, res) {
  setTimeout(function() {
    res.end('hallo wereld\n');
  }, 50);
});

server.listen(common.PORT, function() {
  
  var req = http.request({
    port: common.PORT,
    path: '/',
    method: 'POST'
  });

  var timer = setTimeout(write, 200);
  var writes = 0;
  var sawFalseWrite;

  var gotError = false;
  req.on('error', function(er) {
    assert.equal(gotError, false);
    gotError = true;
    assert(er.code === 'ECONNRESET');
    clearTimeout(timer);
    console.log('ECONNRESET was raised after %d writes', writes);
    test();
  });

  function write() {
    if (++writes === 640) {
      clearTimeout(timer);
      req.end();
      test();
    } else {
      timer = setTimeout(write);
      var writeRet = req.write(new Buffer('hello'));

      // Once we find out that the connection is destroyed, every
      // write() returns false
      if (sawFalseWrite)
        assert.equal(writeRet, false);
      else
        sawFalseWrite = writeRet === false;
    }
  }

  req.on('response', function(res) {
    res.on('data', function(chunk) {
      console.error('saw data: ' + chunk);
    });
    res.on('end', function() {
      console.error('saw end');
    });
  });

  function test() {
    server.close();
    if (req.output.length || req.outputEncodings.length)
      console.error('bad happened', req.output, req.outputEncodings);
    assert.equal(req.output.length, 0);
    assert.equal(req.outputEncodings, 0);
    assert(gotError);
    console.log('ok');
  }
});