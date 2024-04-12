"use strict;"

const { createServer } = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const { N2KEncoder, NMEA0183Encoder } = require('./n2kencoder.js');
const { Simulator } = require('./sim.js');

const server = createServer();
const ws183 = new WebSocketServer({ noServer: true });
const n2kraw = new WebSocketServer({ noServer: true });
const n2kparsed = new WebSocketServer({ noServer: true });

console.log("N2KEncoder ", N2KEncoder);
const n2kEncoder = new N2KEncoder();
const n183Encoder = new NMEA0183Encoder();
const sim = new Simulator();

const processConnection = (ws) => {
  ws.pgnconfig = ws.pgnconfig || {};
  ws.on('error', console.error);
  ws.on('message',  (data) => { processCommand(ws, data); });  
}
const processCommand = (ws, data) => {
    if ( data == "allpgns:1") {
      ws.pgnconfig.all = true;
    } else if ( data == "allpgns:0") {
      ws.pgnconfig.all = false;
    } else if ( data.startsWith("addpgn:")) {
      const pgn = +data.substring(7)
      if ( !ws.pgnconfig.pgns.includes(pgn)) {
        ws.pgnconfig.pgns.push(pgn);
      }
    } else if ( data.startsWith("rmpgn:")) {
      ws.pgnconfig.pgns = ws.pgnconfig.pgns.filter((p) => p !== pgn);
    }
    console.log('received: %s', data);
};
ws183.on('connection', processConnection);
n2kraw.on('connection', processConnection);
n2kparsed.on('connection', processConnection);

server.on('upgrade', function upgrade(request, socket, head) {
  const { pathname } = new URL(request.url, 'wss://base.url');


  if (pathname === '/ws/183') {
    ws183.handleUpgrade(request, socket, head, function done(ws) {
      ws183.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/2kraw') {
    n2kraw.handleUpgrade(request, socket, head, function done(ws) {
      n2kraw.emit('connection', ws, request);
    });
  } else if (pathname === '/ws/2kparsed') {
    n2kparsed.handleUpgrade(request, socket, head, function done(ws) {
      n2kparsed.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

const sendMessage = (wss,msgId, msg, isBinary) => {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        if ( msgId == 0 || client.pgnconfig.all || client.pgnconfig.pgns.includes(pgn)) {
          client.send(msg, { binary: isBinary });
        }
      }
    });
};



// need to simulate values correctly.
setInterval(() => {
  sendMessage(ws183,0, n183Encoder.encodeHDM(sim.hdm));
  sendMessage(ws183,0, n183Encoder.encodeDBT(sim.dbt));
  sendMessage(ws183,0, n183Encoder.encodeGLL(sim.secondsSinceMidnight, 
        sim.latitude, sim.longitude, 'A'));
  sendMessage(ws183,0, n183Encoder.encodeZDA(sim.secondsSinceMidnight, sim.daysSince1970));
}, 1000);

setInterval(() => {
  sendMessage(n2kparsed, 127258, n2kEncoder.encode127258(23, sim.daysSince1970, sim.variation));
  sendMessage(n2kparsed, 127250, n2kEncoder.encode127250(22, 23, 0.01, sim.variation, 3));
  sendMessage(n2kparsed, 127257, n2kEncoder.encode127257(25, 1.2, 0.03, sim.roll));
  sendMessage(n2kparsed, 128259, n2kEncoder.encode128259(36, sim.stw, sim.sog, 4));
  sendMessage(n2kparsed, 129029, n2kEncoder.encode129029(43, sim.daysSince1970, sim.secondsSinceMidnight, 
                      sim.latitude, sim.longitude, 8.1,
                         2, 3,
                        12, 2.01, 2.3, 10.8,
                     1, 2, 2024,
                     33, 1));
}, 1000);
setInterval(() => {
  const data = new DataView(new ArrayBuffer(12));
  for(let i = 0; i < 12; i++) {
    data.setUint8(0,i);
  }
  sendMessage(n2kraw, 127258, n2kEncoder.encodeBinarPGN({ PGN: 127258, Source:23, DataLen:12, Data: data.buffer }));
}, 1000);





server.listen(8080);