/*jshint node:false */
"use strict";


class JDBBMSReader {

    static START_BYTE = 0xDD;
    static STOP_BYTE = 0x77;
    static READ_BYTE = 0xA5;
    static READ_LENGTH = 0x00;

    // registers Ox03
    static REG_VOLTAGE_U16 = 0;
    static REG_CURRENT_S16 = 2;
    static REG_PACK_CAPACITY_U16 = 4;
    static REG_FULL_CAPACITY_U16 = 6;
    static REG_CHARGE_CYCLES_U16 = 8;
    static REG_PRODUCTION_DATE_U16 = 10;
    static REG_BAT0_15_STATUS_U16 = 12;
    static REG_BAT16_31_STATUS_U16 = 14;
    static REG_ERRORS_U16 = 16;
    static REG_SOFTWARE_VERSION_U8 = 18;
    static REG_SOC_U8 = 19;
    static REG_FET_STATUS_U8 = 20;
    static REG_NUMBER_OF_CELLS_U8 = 21;
    static REG_NTC_COUNT_U8 = 22;
    static REG_NTC_READINGS_U8 = 23;

    // BLE Service for the BMS
    static bmsService = '0000ff00-0000-1000-8000-00805f9b34fb';
    // Tx and Rx characteristics, connect to send and recieve on the BMS Uart
    static bmsTx = '0000ff02-0000-1000-8000-00805f9b34fb';
    static bmsRx = '0000ff01-0000-1000-8000-00805f9b34fb';

    // read register 0x03  
    static readReg3 = Uint8Array.of(0xdd, 0xa5, 0x3, 0x0, 0xff, 0xfd, 0x77);
    // read register 0x04
    static readReg4 = Uint8Array.of(0xdd, 0xa5, 0x4, 0x0, 0xff, 0xfc, 0x77);

    // holds last message packet when adding packets.
    _receivedData = undefined
    _listeners = {};

    constructor() {
        this.connectBMS = this.connectBMS.bind(this);
        this.disconnectBMS = this.disconnectBMS.bind(this);
    }


    async connectBMS() {

      let options = {
        filters: [
            {namePrefix: "JBD"},
            {services: [JDBBMSReader.bmsService]}
       ],
      };

      try {
        console.log('Requesting Bluetooth Device...');
        console.log('with ' + JSON.stringify(options));
        const device = await navigator.bluetooth.requestDevice(options);

        console.log('> Name:             ' + device.name);
        console.log('> Id:               ' + device.id);
        console.log('> Connected:        ' + device.gatt.connected);



        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(JDBBMSReader.bmsService);

        const Rx = await service.getCharacteristic(JDBBMSReader.bmsRx)
        const Tx = await service.getCharacteristic(JDBBMSReader.bmsTx)

        await Rx.startNotifications();
        const that = this;
        function rxMessage(event) {
            that._processMessage(new Uint8Array(event.target.value.buffer));
        }

        Rx.addEventListener('characteristicvaluechanged', rxMessage);
        await Tx.writeValue(JDBBMSReader.readReg3);



        let lastMessage = Uint8Array.of(0);
        async function pullData() {
          if (lastMessage == JDBBMSReader.readReg4) {
            lastMessage = JDBBMSReader.readReg3;
          } else {
            lastMessage = JDBBMSReader.readReg4;
          }
          await Tx.writeValue(lastMessage);

        }

        setInterval(function  () {
            pullData(); 
         }, 3000);

        this._emitEvent("connected", 1);

      } catch(error)  {
        console.log('Error connecting to BMS ' + error);
      }
    }

    async disconnectBMS() {

    }



    _processMessage(dataUInt8) {
        // Single line
        if (dataUInt8[0] == JDBBMSReader.START_BYTE && dataUInt8[dataUInt8.length-1] == JDBBMSReader.STOP_BYTE) {
            this._parseData (dataUInt8, dataUInt8.length);
            this._receivedData = undefined;
        } else {
            // Multi line, append until get a stop byte
            if (this._receivedData === undefined) {
                this._receivedData = new Uint8Array(dataUInt8);
            } else if (dataUInt8[0] != this._receivedData[0]) {
                const tmp = new Uint8Array(this._receivedData.length+dataUInt8.length);
                tmp.set(this._receivedData,0);
                tmp.set(dataUInt8,this._receivedData.length);
                this._receivedData = tmp;
                if (this._receivedData[0] == JDBBMSReader.START_BYTE && this._receivedData[this._receivedData.length - 1] == JDBBMSReader.STOP_BYTE) {
                    this._parseData (this._receivedData);
                    this._receivedData = undefined;
                }
            }
        }
    }

    _parseData (msg) {
      // app.debug('Incoming data: %j', rawData)
      if(this._validateChecksum(msg)) {
        switch(msg[1]) {
          case 0x03:
            const register3 = this._register0x03setData(msg);
            this._emitEvent("statusUpdate", register3);
            break;
          case 0x04:
            const register4 = this._register0x04setData(msg);
            this._emitEvent("cellUpdate", register4);
            break;
          default:
            console.log("Unexpected Register ", msg[1]);
            break; 
         }
      }
      else {
        console.log('Received invalid data from BMS!');
      }
    }

    // event emitter
    _emitEvent(name, value) {
        if ( this._listeners[name] !== undefined ) {
            this._listeners[name].forEach((f) => { f(value)});
        }
    }

    on(name, fn) {
        this._listeners[name] = this._listeners[name] || [];
        this._listeners[name].push(fn);
    }


    //validates the checksum of an incoming result
    _validateChecksum(msg) {
        //Payload is between the 4th and n-3th byte (last 3 bytes are checksum and stop byte)
        const sumOfPayload = msg.slice(4, msg.length-3).reduce((partial_sum, a) => partial_sum + a, 0);
        const checksum = 0x10000-(sumOfPayload+msg[3]);

        if ( (((checksum&0xff00)>>8) === msg[msg.length-3] && (checksum&0xff) === msg[msg.length-2])) {
            return true;
        } else {
            console.log("Bad checksum", checksum, ((checksum&0xff00)>>8), msg[msg.length-3], (checksum&0xff), msg[msg.length-2]  );
            return false;
        }
    }

    //https://github.com/FurTrader/OverkillSolarBMS/blob/master/Comm_Protocol_Documentation/JBD_REGISTER_MAP.md
    _register0x03setData(msg) {




        const dataView = new DataView(msg.buffer, 4);
        const obj = {
            chemistry: 'LifePO4',
            voltage: 0.01*dataView.getUint16(JDBBMSReader.REG_VOLTAGE_U16),  // 10mV U16
            current: 0.01*dataView.getInt16(JDBBMSReader.REG_CURRENT_S16),    // 10mA S16
            packBalCap: 0.01*dataView.getUint16(JDBBMSReader.REG_PACK_CAPACITY_U16), // 10mAh U16
            capacity: {
                fullCapacity: 0.01*dataView.getUint16(JDBBMSReader.REG_FULL_CAPACITY_U16),
                stateOfCharge: dataView.getUint8(JDBBMSReader.REG_SOC_U8), // fraction
            },
            chargeCycles: dataView.getUint16(JDBBMSReader.REG_CHARGE_CYCLES_U16),
            productionDate: this._getDate(dataView.getUint16(JDBBMSReader.REG_PRODUCTION_DATE_U16)),
            balanceActive: this._getBalanceStatus(dataView),
            currentErrors: this._getCurrentErrors(dataView),
            bmsSWVersion: (0.1*dataView.getUint8(JDBBMSReader.REG_SOFTWARE_VERSION_U8)).toFixed(1),
            FETStatus: this._getFETStatus(dataView.getUint8(JDBBMSReader.REG_FET_STATUS_U8)),
            numberOfCells: dataView.getUint8(JDBBMSReader.REG_NUMBER_OF_CELLS_U8),
            tempSensorCount: dataView.getUint8(JDBBMSReader.REG_NTC_COUNT_U8),
            tempSensorValues: this._getNTCValues(dataView)
          };
          return obj;
    }


    _register0x04setData (msg) {
        const dataView = new DataView(msg.buffer);
        var cellMv = [];
        const ncells=dataView.getUint8(3)/2;
        for (var i = 0; i < ncells; i++) {
            cellMv[i] = dataView.getUint16(4+i*2);
        }
        return { cellMv };
    }

    _getDate(dateU16) {
        const year = ((dateU16&0xfe00)>>9)+2000;
        const month = ((dateU16&0x01e0))>>5;
        const day = ((dateU16&0x0f));
        return new Date(year,month-1,day)
    }

    _getBalanceStatus(dataView) {
        const ncells = dataView.getUint8(JDBBMSReader.REG_NUMBER_OF_CELLS_U8);
        let status = dataView.getUint16(JDBBMSReader.REG_BAT0_15_STATUS_U16);
        const balanceActive = [];
        let mask = 0x01;
        for (var i = 0; i < ncells; i++) {
            if ( i == 16) {
                status = dataView.getUint16(JDBBMSReader.REG_BAT0_15_STATUS_U16);
                mask = 0x01;
            }
            balanceActive[i] = this._getBit(status, mask);
            mask = mask << 1;
        }
        return balanceActive;
    }
    _getBit(bitmap, mask) {
        if ( (bitmap&mask) == mask ) {
            return 1;
        }
        return 0;
    }

    _getCurrentErrors(dataView) {
        const status = dataView.getUint16(JDBBMSReader.REG_ERRORS_U16);
        const currentErrors = {    
            //bit0 - Single Cell overvolt
            singleCellOvervolt: this._getBit(status,0x01),
            //bit1 - Single Cell undervolt
            singleCellUndervolt:this._getBit(status,0x02),
            //bit2 - whole pack overvolt
            packOvervolt: this._getBit(status,0x04),
            //bit3 - whole pack undervolt
            packUndervolt: this._getBit(status,0x08),
            //bit4 - charging over temp
            chargeOvertemp: this._getBit(status,0x10),
            //bit5 - charging under temp
            chargeUndertemp: this._getBit(status,0x20),
            //bit6 - discharge over temp
            dischargeOvertemp:this._getBit(status,0x40),
            //bit7 - discharge under temp
            dischargeUndertemp:this._getBit(status,0x80),
            //bit8 - charge overcurrent
            chargeOvercurrent:this._getBit(status,0x100),
            //bit9 - discharge overcurrent   
            dischargeOvercurrent:this._getBit(status,0x200),
            //bit10 - short circut
            shortCircut:this._getBit(status,0x400),
            //bit11 - front-end detection ic error
            frontEndDetectionICError:this._getBit(status,0x800),
            //bit12 - software lock MOS
            softwareLockMOS:this._getBit(status,0x1000)
            //bit13-15 reserved/unused
        }
        return currentErrors;

    }

    _getFETStatus(byte) {
        return {
            "charging": this._getBit(byte,0x01),
            "discharging": this._getBit(byte,0x02)
        }
    }


    _getNTCValues(dataView) {
        const numNTCs = dataView.getUint8(JDBBMSReader.REG_NTC_COUNT_U8);
        const result = [];
        for (var i = 0; i < numNTCs; i++) {
            result[i] = Number.parseFloat((dataView.getUint16(JDBBMSReader.REG_NTC_READINGS_U8+2*i)*0.1-273.15).toFixed(1));
        }
        return result;
    }

}





