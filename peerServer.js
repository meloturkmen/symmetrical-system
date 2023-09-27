// peer_server
var ExpressPeerServer = require('peer').ExpressPeerServer;
var peerExpress = require('express');
var peerApp = peerExpress();
var peerServer = require('http').createServer(peerApp);
var options = { debug: true }
var peerPort = 9000;

peerApp.use('/peerjs', ExpressPeerServer(peerServer, options));

peerServer.listen(peerPort, () => console.log(`Peer server listening on port ${peerPort}`));


