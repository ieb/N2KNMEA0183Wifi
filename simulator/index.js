"use strict;"
const fs = require('node:fs');

const { createServer } = require('http');
const { N2KEncoder, NMEA0183Encoder } = require('./n2kencoder.js');
const { Simulator } = require('./sim.js');

const server = createServer();

let seaSmartResponses = [];
let nmea0183Responses = [];

console.log("N2KEncoder ", N2KEncoder);
const n2kEncoder = new N2KEncoder();
const n183Encoder = new NMEA0183Encoder();
const sim = new Simulator();



server.on('request', (req, res) => {
  if ( req.headers.origin ) {
    res.setHeader("Access-Control-Max-Age", "600");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "Authorization");
    // Origin from a browser is protected.
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");              
  }

  const { pathname } = new URL(req.url, 'http://base.url');
  if (pathname === '/api/seasmart') {
    console.log(`${req.method} ${req.url} 200`);
    res.writeHead(200, { 'Content-Type': 'text/plain', 'keep-alive': 'timeout=30' });
    seaSmartResponses.push(res);
    req.on('close', () => {
      console.log("Close seaSmartResponses");
      seaSmartResponses = seaSmartResponses.filter((r) => (r !== res));
    });
  } else if ( pathname === '/api/nmea0183') {
    console.log(`${req.method} ${req.url} 200`);
    res.writeHead(200, { 'Content-Type': 'text/plain', 'keep-alive': 'timeout=30'  });
    nmea0183Responses.push(res);
    req.on('close', () => {
      nmea0183Responses = nmea0183Responses.filter((r) => (r !== res));
    });    
  } else {
    console.log(`${req.method} ${req.url} 404`);
    console.log("Pathname ", pathname);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end("NotFound");

  }
});


const sendSeaSmartChunked = (msgId, msg) => {
    seaSmartResponses.forEach( (res) => {
      const pgns = new URL(res.req.url, "http://base.url").searchParams.get("pgn");
      if (pgns === null ||
        pgns.includes(msgId.toString()) ) {
        console.log(msg);
        res.write(msg+'\n');
        //res.uncork();
      }
    });
};

const sendmnea0183Chunked = (msg) => {
    nmea0183Responses.forEach( (res) => {
      res.write(msg+'\n');
    });
};





// need to simulate values correctly.
setInterval(() => {
  sendmnea0183Chunked(n183Encoder.encodeHDM(sim.hdm));
  sendmnea0183Chunked(n183Encoder.encodeDBT(sim.dbt));
  sendmnea0183Chunked(n183Encoder.encodeGLL(sim.secondsSinceMidnight, 
        sim.latitude, sim.longitude, 'A'));
  sendmnea0183Chunked(n183Encoder.encodeZDA(sim.secondsSinceMidnight, sim.daysSince1970));
}, 1000);


const parseCanData = (line) => {
  let canFrame = {};
  line = line.trim();
  if ( line.startsWith('$PCDIN') ) {
    const parts = line.split(',');
    canFrame.pgn = parseInt(parts[1], 16);
    canFrame.timestamp = parseInt(parts[2], 16); 
    canFrame.src = parseInt(parts[3], 16); 
    canFrame.msg = parts[4];
    canFrame.pcdin = line;
    return canFrame;
  }
  // 228849 : Pri:2 PGN:127257 Source:204 Dest:255 Len:8 Data:FF,9C,8,C7,0,21,0,FF
  // format 2 {n: 22, pgn: 127245, src: 205, msg: '00ffff7febfaffff'}
  if ( line.startsWith('{')) {
    line.substring(1, line.length-1).split(',').forEach((p) => {
      p = p.trim();
      if (p.startsWith('pgn:')) {
        canFrame.pgn = parseInt(p.substring(4));
      } else if (p.startsWith('src:')) {
        canFrame.src = parseInt(p.substring(4));
      } else if (p.startsWith('msg:')) {
        canFrame.msg = p.substring(4).replaceAll("'","").trim();
      }
    });
  } else {
    line.split(' ').forEach((p) => {
      if ( p.startsWith('PGN:')) {
        canFrame.pgn = parseInt(p.substring(4));
      } else if (p.startsWith("Source:")) {
        canFrame.src = parseInt(p.substring(7));
      } else if (p.startsWith("Data:")) {
        const parts = p.substring(5).split(",");
        for (var i = 0; i < parts.length; i++) {
          if (parts[i].length == 1) {
            parts[i] = '0'+parts[i];
          }
        }
        canFrame.msg = parts.join('');
      }
    });
    canFrame.sourceTimestamp = parseInt(line);
  }
  canFrame.timestamp = Date.now() & 0x7fffffff;
  if (canFrame.pgn && canFrame.src && canFrame.msg ) {
    canFrame.pcdin = '$PCDIN,'
      + canFrame.pgn.toString(16).toUpperCase().padStart(6,'0') + ','
      + canFrame.timestamp.toString(16).toUpperCase().padStart(8,'0') + ','
      + canFrame.src.toString(16).toUpperCase().padStart(2,'0')+ ','
      + canFrame.msg.toUpperCase();

    let checkSum = 0;
    for (let i = 1; i < canFrame.pcdin.length; i++) {
      checkSum^=canFrame.pcdin.charCodeAt(i);
    }
    canFrame.pcdin = canFrame.pcdin + "*"+checkSum.toString(16).padStart(2,'0').toUpperCase();
  }
  return canFrame;
};


// load the sample data
/*
const canData1 = fs.readFileSync('samplecandata.txt', 'utf8').split('\n');
for (var i = 0; i < canData1.length; i++) {
  canData1[i] = parseCanData(canData1[i]);
}
const canData2 = fs.readFileSync('samplecandata2.txt', 'utf8').split('\n');
for (var i = 0; i < canData2.length; i++) {
  canData2[i] = parseCanData(canData2[i]);
}
const canData = canData1.concat(canData2);
*/
const canData = fs.readFileSync('seasmartsample.txt', 'utf8').split('\n');
for (var i = 0; i < canData.length; i++) {
  canData[i] = parseCanData(canData[i]);
}
//console.log("CanData", canData);



// send frames in a loop.
let line = 0;
let lastFrame = Date.now();
const emitFrame = () => {
  const f = canData[line];
  if (f.pcdin) {
    sendSeaSmartChunked(f.pgn, f.pcdin);
  }
  line = (line+1)%canData.length;
  while(!canData[line].pcdin ) {
    line = (line+1)%canData.length;
  }  
  let delay = 200;
  if (f.timestamp && canData[line].timestamp) {
    if ( (canData[line].timestamp - f.timestamp) > 0 ) {
      delay = canData[line].timestamp - f.timestamp;
    }
  }
  if (delay > 1000) {
    console.log("Stalled");
    delay = 1000;
  }
  setTimeout(emitFrame, delay);
};
setTimeout(emitFrame, 200);




/*
setInterval(() => {
  const data = new DataView(new ArrayBuffer(12));
  for(let i = 0; i < 12; i++) {
    data.setUint8(0,i);
  }
  sendMessage(n2kraw, 127258, n2kEncoder.encodeBinarPGN({ PGN: 127258, Source:23, DataLen:12, Data: data.buffer }));
}, 1000);
*/
const { networkInterfaces } = require('os');
const candidates = [];
const nets = networkInterfaces();
Object.keys(nets).forEach((interfaceName) => {
  nets[interfaceName].forEach((ip) => {
    if ( !ip.internal && ip.family == 'IPv4' ) {
      candidates.push(ip);
      console.log("Candidate ", interfaceName, ip);
    }
  });
});
const ipAddress = candidates[0].address;
// MDNS support
var mdns = require('multicast-dns')()

mdns.on('response', function(response) {
  //console.log('got a response packet:', response)
  console.log('Answers:',JSON.stringify(response.answers, (key, value) => {
    if ( value.data && value.type == 'Buffer' ) {
      const byteA = new Uint8Array(value.data);
      const s = new TextDecoder().decode(byteA);
      return s;
    }
    return value;
  }, 2));
})

mdns.on('query', function(query) {
//  console.log('got a query packet:', query);
  //console.log('Questions:', JSON.stringify(query.questions,null,2));
    query.questions.forEach((q)=> {
      if ( q.type == 'A' && (q.class == 'UNKNOWN_32769') || (q.class === 'IN') ) {
        if ( q.name === 'boatsimulator.local' ) {
          mdns.respond({
            answers: [{
              name: 'boatsimulator.local',
              type: 'A',
              class: 'IN',
              ttl: 300,
              data: `${ipAddress}`
            }            
            ]
          }); 
        }
      }
  });

})




server.listen(8080);