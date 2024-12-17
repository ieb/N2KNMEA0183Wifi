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

function updateBattery() {
  voltage = voltage - 0.01;
  current = current - 1.1;
  if ( voltage < 11) {
    voltage = 15;
  }
  if ( current < -60) {
    current = 60;
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
serialPort.on('data', function (data) {
  console.log("Got ",data);
  data.forEach((val) => {
    if ( rstate === 0 && val === 0xdd) {
        rstate = 1;
    } else if ( rstate === 1 ) {
        if ( val === 0xa5 ) {
            rstate = 2;
            writeMode = true;
        } else if ( val === 0x5a ) {
            rstate = 2;
            writeMode = false;
        } else {
            rstate = 0;
        }
    } else if ( rstate === 2  ) {
        reg = val;
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
             console.log(`End of package writeMode:${writeMode} factoryMode:${factoryMode} reg:${reg} csum:${csum} inbufferLen:${inBufferLen}`);
            const calcCsum = checksum(reg, inBuffer);
            if ( calcCsum != csum ) {
              console.log("Checsum failed");
            } else {
              if ( reg == 0x00 ) {
                if ( inBufferLen == 2 
                  && inBuffer[0] == 0x56 
                  && inBuffer[1] == 0x78  ) {
                  // enter factor mode
                  console.log("Switch on factoryMode ");
                  factoryMode = true;
                  sendOk(reg);
                }
              } else if ( reg == 0x01 ) {
                if ( inBufferLen == 2 
                  && inBuffer[0] == 0x0 
                  && inBuffer[1] == 0x0 ) {
                  // edit factory mode
                  factoryMode = false;
                  console.log("Switch off factoryMode ");
                  sendOk(reg);
                } else if (inBufferLen == 2 
                  && inBuffer[0] == 0x28 
                  && inBuffer[1] == 0x28) {
                  // edit factory mode and reset counters
                  console.log("Switch off factoryMode and reset");
                  factoryMode = false;
                  sendOk(reg);
                }
              } else if ( reg === 0x03 ) {
                updateBattery();
                send(0x03, 0x00, createReg03(voltage,current,capacity));
              } else if ( reg == 0x04  ) {
                send(0x04, 0x00, createReg04());
              } else if ( reg == 0x05 ) {
                send(0x05, 0x00, createReg05());
              } else if ( reg == 0xAA ) {
                send(0xAA, 0x00, createRegAA());
              } else if ( reg == 0xFA ) {
                send(0xFA, 0x00, 
                  createParameterReponse((inBuffer[0]<<8 | inBuffer[1]&0xff),
                  inBuffer[2]));                                          
              } else if ( reg == 0xA2 ) {
                console.log("Reg 0xA2");
                sendError(reg);
              } else {
                console.log("Error Unhandled reg, not factory mode ", reg, reg.toString(16));
                sendError(reg);
              }
            }
        }
        console.log("Back to state 0");
        rstate = 0;
    }
    return 1;
  });
});

serialPort.on("open", function() {
  console.log("-- Connection opened --");
});


function createReg03(voltage, current, capacity) {
  console.log("V, C ", voltage, current);
  const buffer = new ArrayBuffer(38);
  const view = new DataView(buffer);
  view.setUint16(0, voltage/0.01); //REG_VOLTAGE_U16
  view.setInt16(2, current/0.01); //REG_CURRENT_S16
  view.setUint16(4, capacity/0.01); //REG_PACK_CAPACITY_U16
  view.setUint16(6, 304.0/0.01); //REG_FULL_CAPACITY_U16
  view.setUint16(8, 386);  //REG_CHARGE_CYCLES_U16
  view.setUint16(10, encodeDate(2020,12,24)); //REG_PRODUCTION_DATE_U16
  view.setUint16(12, 0x05);  //REG_BAT0_15_STATUS_U16
  view.setUint16(14, 0xf0f0);  //REG_BAT16_31_STATUS_U16
  view.setUint16(16, 0xf0f0);  //REG_ERRORS_U16
  view.setUint8(18, 0x11);  //REG_SOFTWARE_VERSION_U8
  view.setUint8(19, 89);  //REG_SOC_U8
  view.setUint8(20, 0x03);  //REG_FET_STATUS_U8
  view.setUint8(21, 4);  //REG_NUMBER_OF_CELLS_U8
  view.setUint8(22, 3);  //REG_NTC_COUNT_U8
  view.setUint16(23, (27.3+273.15)/0.1);  //REG_NTC_READINGS_U16
  view.setUint16(25, (23.3+273.15)/0.1);  //REG_NTC_READINGS_U16
  view.setUint16(27, (22.3+273.15)/0.1);  //REG_NTC_READINGS_U16
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
  const b = new Uint8Array(6);
  b[0] = 5;
  b[1] = 'M';
  b[2] = 'Y';
  b[3] = 'B';
  b[4] = 'M';
  b[5] = 'S';
  return b;
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
  return b
}
function createParameterReponse(start, len) {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint16(0,(305/0.01)); // nominal capacity
  view.setUint16(0,(286/0.01)); // nominal capacity
  view.setUint16(0,(3412/0.001)); // full voltage
  view.setUint16(0,(2600/0.001)); // vent voltage
  view.setUint16(0,25); // power consumption

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
  console.log("Sending ", regNo, buffer);
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


