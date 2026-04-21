const { SerialPort } = require('serialport')
const path = process.argv[2];

  console.log("opening ", path);

const serialPort = new SerialPort({
  path,
  baudRate: 9600,
});

let voltage = 12.34;
let current = 4.5;
let capacity = 285;
let errors = 0x0000;
let ntc1 = 5;
let ntc2 = 10;
let ntc3 = 15;
let sent = {};
let lastSend = 0;

function updateBattery() {
  voltage = voltage - 0.01;
  current = current - 1.1;
  ntc1 = ntc1 + 1;
  if ( voltage < 11) {
    voltage = 15;
  }
  if ( current < -60) {
    current = 60;
  }
  if  (ntc1 > 50) {
    ntc1 = 0;
  }
  if ( ntc1 < 2) {
    errors = 1<<5 | 1<<7;
  } else if (ntc1 > 40 ) {
    errors = 1<<4 | 1<<6;
  } else {
    errors = 0;
  }
};

/**
 * the JBD BLE to Uart coverter sends these messages 4 times on startup
 * to enter factory mode.
 *
Got  <Buffer dd 5a 00 02 56 78 ff 30 77>
                ^^ write
                   ^^ register 0  factory mode
                      ^^ length 2
                         ^^^^^ Enter factory mode
                               ^^^^ checksum
Got  <Buffer dd 5a 00 02 56 78 ff 30 77>
Got  <Buffer dd 5a 00 02 56 78 ff 30 77>
Got  <Buffer dd 5a 00 02 56 78 ff 30 77>
*/

let rstate = 0;
let factoryMode = false;
let writeMode = false;
let reg = 0;
let inBuffer;
let inBufferLen = 0;
let csum = 0;
let lastByteMs = 0;
// 1 s is deliberately conservative. A legitimate 7-byte frame at 9600 baud
// takes ~7 ms end-to-end, but USB-UART adapters can batch packets with
// surprising latency under load. Any real stuck-mid-frame case still clears
// inside 1 s, and this threshold won't false-trip on a chunking hiccup.
const FRAME_IDLE_TIMEOUT_MS = 1000;

// Parser diagnostics — counters are printed every 10 s so you can tell at a
// glance why the firmware thinks a request went unanswered.
let stats = {
  frames: 0,
  checksumFail: 0,
  resync1: 0,     // state 1 got a non-a5/5a byte
  resync6: 0,     // state 6 got a non-0x77 byte
  timeout: 0,     // mid-frame idle timeout fired
  timeoutState: {}
};

function processFrame() {
  stats.frames++;
  const calcCsum = checksum(reg, inBuffer);
  if (calcCsum != csum) {
    stats.checksumFail++;
    console.log("Checksum failed reg=0x" + reg.toString(16)
      + " len=" + inBufferLen
      + " got=0x" + csum.toString(16)
      + " want=0x" + calcCsum.toString(16));
    return;
  }
  if (reg == 0x00) {
    if (inBufferLen == 2 && inBuffer[0] == 0x56 && inBuffer[1] == 0x78) {
      console.log("Switch on factoryMode ");
      factoryMode = true;
      sendOk(reg);
    }
  } else if (reg == 0x01) {
    if (inBufferLen == 2 && inBuffer[0] == 0x0 && inBuffer[1] == 0x0) {
      factoryMode = false;
      console.log("Switch off factoryMode ");
      sendOk(reg);
    } else if (inBufferLen == 2 && inBuffer[0] == 0x28 && inBuffer[1] == 0x28) {
      console.log("Switch off factoryMode and reset");
      factoryMode = false;
      sendOk(reg);
    }
  } else if (reg === 0x03) {
    if (lastSend !== 0x04 && lastSend !== 0x05) {
      console.log('Got 0x03, missed 0x04, got', lastSend);
    }
    updateBattery();
    send(0x03, 0x00, createReg03(voltage, current, capacity));
  } else if (reg == 0x04) {
    if (lastSend !== 0x03 && lastSend !== 0x05) {
      console.log('Got 0x04, missed 0x03, got', lastSend);
    }
    send(0x04, 0x00, createReg04());
  } else if (reg == 0x05) {
    send(0x05, 0x00, createReg05());
  } else if (reg == 0xAA) {
    send(0xAA, 0x00, createRegAA());
  } else if (reg == 0xFA) {
    send(0xFA, 0x00,
      createParameterReponse((inBuffer[0] << 8 | inBuffer[1] & 0xff),
        inBuffer[2]));
  } else if (reg == 0xA2) {
    console.log("Reg 0xA2");
    sendError(reg);
  } else {
    console.log("Error Unhandled reg, not factory mode ", reg, reg.toString(16));
    sendError(reg);
  }
}

serialPort.on('data', function (data) {
  data.forEach((val) => {
    lastByteMs = Date.now();
    // Resync-safe parser: on any unexpected byte, drop back to state 0 and
    // re-examine the same byte so a stray or misaligned 0xdd still starts a
    // new frame. The `step` flag implements that re-dispatch.
    let step = true;
    while (step) {
      step = false;
      switch (rstate) {
        case 0:
          if (val === 0xdd) rstate = 1;
          break;
        case 1:
          if (val === 0xa5) {
            writeMode = false;
            rstate = 2;
          } else if (val === 0x5a) {
            writeMode = true;
            rstate = 2;
          } else {
            stats.resync1++;
            rstate = 0;
            step = true; // re-examine val as possible SOF
          }
          break;
        case 2:
          reg = val;
          rstate = 3;
          break;
        case 3:
          if (val === 0x00) {
            inBuffer = undefined;
            inBufferLen = 0;
            rstate = 4;
          } else {
            inBuffer = [];
            inBufferLen = val;
            rstate = 41;
          }
          break;
        case 41:
          inBuffer.push(val);
          if (inBufferLen === inBuffer.length) {
            rstate = 4;
          }
          break;
        case 4:
          csum = val << 8;
          rstate = 5;
          break;
        case 5:
          csum = csum | val;
          rstate = 6;
          break;
        case 6:
          if (val === 0x77) {
            processFrame();
            rstate = 0;
          } else {
            stats.resync6++;
            rstate = 0;
            step = true; // re-examine val as possible SOF
          }
          break;
        default:
          rstate = 0;
          step = true;
          break;
      }
    }
  });
});

// If we're stuck mid-frame (byte loss, firmware reboot, truncated frame),
// reset to state 0 so the next SOF can restart parsing. Without this, a
// single dropped byte can silently consume every subsequent frame.
setInterval(() => {
  if (rstate !== 0 && lastByteMs !== 0
      && (Date.now() - lastByteMs) > FRAME_IDLE_TIMEOUT_MS) {
    stats.timeout++;
    stats.timeoutState[rstate] = (stats.timeoutState[rstate] || 0) + 1;
    rstate = 0;
  }
}, 250);

setInterval(() => {
  console.log("stats", JSON.stringify(stats));
}, 10000);

serialPort.on("open", function() {
  console.log("-- Connection opened --");
});


function createReg03(voltage, current, capacity) {
  //console.log("V, C ", voltage, current);
  const buffer = new ArrayBuffer(38);
  const view = new DataView(buffer);
  view.setUint16(0, voltage/0.01); //REG_VOLTAGE_U16
  view.setInt16(2, current/0.01); //REG_CURRENT_S16
  view.setUint16(4, capacity/0.01); //REG_PACK_CAPACITY_U16
  view.setUint16(6, 304.0/0.01); //REG_FULL_CAPACITY_U16
  view.setUint16(8, 386);  //REG_CHARGE_CYCLES_U16
  view.setUint16(10, encodeDate(2020,12,24)); //REG_PRODUCTION_DATE_U16
  view.setUint16(12, 0x05);  //REG_BAT0_15_STATUS_U16
  view.setUint16(14, 0x00);  //REG_BAT16_31_STATUS_U16
  view.setUint16(16, errors);  //REG_ERRORS_U16
  view.setUint8(18, 0x11);  //REG_SOFTWARE_VERSION_U8
  view.setUint8(19, 89);  //REG_SOC_U8
  view.setUint8(20, 0x03);  //REG_FET_STATUS_U8
  view.setUint8(21, 4);  //REG_NUMBER_OF_CELLS_U8
  view.setUint8(22, 3);  //REG_NTC_COUNT_U8
  view.setUint16(23, (ntc1+273.15)/0.1);  //REG_NTC_READINGS_U16
  view.setUint16(25, (ntc2+273.15)/0.1);  //REG_NTC_READINGS_U16
  view.setUint16(27, (ntc3+273.15)/0.1);  //REG_NTC_READINGS_U16
  view.setUint8(29, 55);  //55% humidity
  view.setUint16(30, 0x0);  //Alarm status
  view.setUint16(32, 304/0.01);  //full charge capacit
  view.setUint16(34, capacity/0.01);  //remaining capacity
  view.setUint16(36, 0.5582/0.001);  //balance current
  // total length 38
  return new Uint8Array(buffer);
}
function createReg04() {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint16(0, 3.123/0.001); //REG_VOLTAGE_U16
  view.setUint16(2, 3.14/0.001); //REG_VOLTAGE_U16
  view.setUint16(4, 3.15/0.001); //REG_VOLTAGE_U16
  view.setUint16(6, 3.15/0.001); //REG_VOLTAGE_U16
  return new Uint8Array(buffer);
}
function createReg05() {
  const hw = Buffer.from(' fw:1.0 sw:2.3');
  hw[0] = hw.length-1;
  return new Uint8Array(hw);
}

function createRegAA() {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint16(0, 0); //Short circuit protection times
  view.setUint16(2, 0); //Number of charging overcurrents
  view.setUint16(4, 0); //Discharge overcurrent times
  view.setUint16(6, 0); // Number of monomer overvoltages
  view.setUint16(8, 0); //Number of times of single unit undervoltage
  view.setUint16(10, 0); //High temperature charging times
  view.setUint16(12, 0); // Number of low temperature charges
  view.setUint16(14, 0); //Discharge high temperature times
  view.setUint16(16, 0); //Discharge low temperature times
  view.setUint16(18, 10); //Overall number of overvoltages
  view.setUint16(20, 0); //Overall undervoltage times
  view.setUint16(22, 121);//Number of system restarts
  return new Uint8Array(buffer);
}
function createParameterReponse(start, len) {
  const buffer = new ArrayBuffer(10);
  const view = new DataView(buffer);
  view.setUint16(0, (305/0.01)); // nominal capacity
  view.setUint16(2, (286/0.01)); // cycle capacity
  view.setUint16(4, (3412/0.001)); // full voltage
  view.setUint16(6, (2600/0.001)); // vent voltage
  view.setUint16(8, 25); // power consumption
  return new Uint8Array(buffer);
}
function encodeDate(y,m,d) {
  return (d&0x1f) | (((m&0xff)<<5)&0x1e0) | ((((y-2000)&0xff)<<9)&0xfe00);
}

function sendError(regNo) {
  console.log("Sending Error ", regNo);
  const csum = 0x10000 - 0x80;
  serialPort.write(Uint8Array.from([ 0xdd, regNo, 0x80, 0, (csum&0xff00)>>8, (csum&0xff), 0x77 ]));

}

function sendOk(regNo) {
  console.log("Sending Ok ", regNo);
  const csum = 0x10000;
  serialPort.write(Uint8Array.from([ 0xdd, regNo, 0x00, 0, (csum&0xff00)>>8, (csum&0xff), 0x77 ]));

}

function send(regNo, response, buffer) {
  //console.log("Sending ", regNo, buffer);
  if ( sent[regNo] == undefined ) {
    sent[regNo] = {
      last: Date.now(),
      sum: 0,
      min: 1000000,
      max: 0,
      count: 0,
    };
  } else {
    const period = Date.now()- sent[regNo].last;
    sent[regNo].last = Date.now();
    sent[regNo].min = Math.min(sent[regNo].min, period);
    sent[regNo].max = Math.max(sent[regNo].max, period);
    sent[regNo].sum = sent[regNo].sum + period;
    sent[regNo].count++;
  }
  lastSend = regNo;

  serialPort.write(Uint8Array.from([ 0xdd, regNo, response, buffer.length]));
  serialPort.write(buffer);
  const csum = checksum(response, buffer)
  serialPort.write(Uint8Array.from([ (csum&0xff00)>>8, (csum&0xff), 0x77]));
}

function checksum(response, buffer) {
     let sum = response;
     if ( buffer ) {
       sum = (sum+buffer.length)& 0xffff;
       for (var i = 0; i < buffer.length; i++) {
         sum = (sum+buffer[i])& 0xffff;
       }
     }
    return 0x10000-sum;
}

