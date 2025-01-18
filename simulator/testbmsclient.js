const { SerialPort } = require('serialport')
const path = process.argv[2];

  console.log("opening ", path);

const serialPort = new SerialPort({
  path,
  baudRate: 9600,
});


function checksum(status, buffer, csum) {
     let sum =  status; //reg;
     console.log("status", status.toString(16), sum.toString(16));
     if ( buffer ) {
       sum = (sum+buffer.length)& 0xffff;
       console.log("len", buffer.length.toString(16), sum.toString(16));
       for (var i = 0; i < buffer.length; i++) {
         sum = (sum+buffer[i])& 0xffff;
         console.log("Sum", buffer[i].toString(16), sum.toString(16));
       }      
     } 
    sum = 0x10000-sum;
    console.log("Final Sum", sum.toString(16), sum.toString(2));
    console.log("Messg Sum", csum.toString(16), csum.toString(2));
    console.log("Diff", (csum - sum).toString(16), (csum - sum).toString(2));
    return sum;
}

let rstate = 0;
let status, reg, inBuffer, inBufferLen, csum;
serialPort.on('data', function (data) {
  console.log("Got ",data);
  data.forEach((val) => {
    if ( rstate === 0 && val === 0xdd) {
        rstate = 1;
    } else if ( rstate === 1  ) {
        reg = val;
        rstate = 2;
    } else if ( rstate === 2  ) {
        status = val;
        rstate = 3;
    } else if ( rstate === 3 ) {
      if( val === 0x00  ) {
        rstate = 4;
        inBuffer = undefined;
      } else {
        inBuffer = [];
        inBufferLen = val;
        rstate = 41;
      }
    } else if ( rstate == 41 ) {
      inBuffer.push(val);
      if ( inBufferLen == inBuffer.length ) {
        rstate = 4;
      }
    } else if ( rstate === 4 ) {
        csum = val<<8;
        rstate = 5;
    } else if ( rstate === 5 ) {
        csum = csum | val;
        rstate = 6;
    } else if ( rstate === 6 ) {
        if ( val == 0x77 ) {
             console.log(`End of package reg:${reg} csum:${csum} inbufferLen:${inBufferLen}`);
            const calcCsum = checksum(status, inBuffer, csum);
            if ( calcCsum != csum ) {
              console.log("Checksum failed ", csum.toString(16), calcCsum.toString(16));
            }
        }
        console.log("Back to state 0");
        rstate = 0;
    }
    return 1;
  });
});

let msg = 0;
serialPort.on("open", function() {
  console.log("-- Connection opened --, starting requests");
  setInterval(() => {
    if (msg == 0) {
      serialPort.write(Uint8Array.from([ 0xdd, 0xA5, 0x03, 0x00, 0xFF, 0xFD, 0x77 ]));
      msg = 1;
    } else if ( msg == 1) {
      serialPort.write(Uint8Array.from([ 0xdd, 0xA5, 0x04, 0x00, 0xFF, 0xFC, 0x77 ]));
      msg = 2;
    } else if ( msg == 2) {
      serialPort.write(Uint8Array.from([ 0xdd, 0xA5, 0x05, 0x00, 0xFF, 0xFB, 0x77 ]));
      msg = 0;
    }
  }, 1000);
});


