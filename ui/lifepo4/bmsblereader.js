/* eslint-disable no-bitwise */

const START_BYTE = 0xDD;
const STOP_BYTE = 0x77;
// eslint-disable-next-line no-unused-vars
const READ_BYTE = 0xA5;
// eslint-disable-next-line no-unused-vars
const READ_LENGTH = 0x00;

// registers Ox03
const REG_VOLTAGE_U16 = 0;
const REG_CURRENT_S16 = 2;
const REG_PACK_CAPACITY_U16 = 4;
const REG_FULL_CAPACITY_U16 = 6;
const REG_CHARGE_CYCLES_U16 = 8;
const REG_PRODUCTION_DATE_U16 = 10;
const REG_BAT0_15_STATUS_U16 = 12;
// eslint-disable-next-line no-unused-vars
const REG_BAT16_31_STATUS_U16 = 14;
const REG_ERRORS_U16 = 16;
const REG_SOFTWARE_VERSION_U8 = 18;
const REG_SOC_U8 = 19;
const REG_FET_STATUS_U8 = 20;
const REG_NUMBER_OF_CELLS_U8 = 21;
const REG_NTC_COUNT_U8 = 22;
const REG_NTC_READINGS_U8 = 23;

// BLE Service for the BMS
const BMS_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
// Tx and Rx characteristics, connect to send and recieve on the BMS Uart
const BMS_TXCH_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';
const BMS_RXCH_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';

// read register 0x03
const BMS_READ_REG3 = Uint8Array.of(0xdd, 0xa5, 0x3, 0x0, 0xff, 0xfd, 0x77);
// read register 0x04
const BMS_READ_REG4 = Uint8Array.of(0xdd, 0xa5, 0x4, 0x0, 0xff, 0xfc, 0x77);

class JDBBMSReader {
  // holds last message packet when adding packets.

  constructor() {
    this.receivedData = undefined;
    this.listeners = {};
    this.connectBMS = this.connectBMS.bind(this);
    this.disconnectBMS = this.disconnectBMS.bind(this);
  }


  async connectBMS() {
    const options = {
      filters: [
        { namePrefix: 'JBD' },
        { services: [BMS_SERVICE_UUID] },
      ],
    };

    try {
      console.log('Requesting Bluetooth Device...');
      console.log(`with ${JSON.stringify(options)}`);
      const device = await navigator.bluetooth.requestDevice(options);

      console.log(`> Name:             ${device.name}`);
      console.log(`> Id:               ${device.id}`);
      console.log(`> Connected:        ${device.gatt.connected}`);



      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BMS_SERVICE_UUID);

      const Rx = await service.getCharacteristic(BMS_RXCH_UUID);
      const Tx = await service.getCharacteristic(BMS_TXCH_UUID);

      await Rx.startNotifications();

      Rx.addEventListener('characteristicvaluechanged', (event) => {
        this.processMessage(new Uint8Array(event.target.value.buffer));
      });
      await Tx.writeValue(BMS_READ_REG3);



      let lastMessage = Uint8Array.of(0);

      setInterval(async () => {
        if (lastMessage === BMS_READ_REG4) {
          lastMessage = BMS_READ_REG3;
        } else {
          lastMessage = BMS_READ_REG4;
        }
        await Tx.writeValue(lastMessage);
      }, 3000);

      this.emtEvent('connected', 1);
    } catch (error) {
      console.log(`Error connecting to BMS ${error}`);
    }
  }

  async disconnectBMS() {
    console.log("Disconnect not implemented, TODO");
  }



  processMessage(dataUInt8) {
    // Single line
    if (dataUInt8[0] === START_BYTE && dataUInt8[dataUInt8.length - 1] === STOP_BYTE) {
      this.parseData(dataUInt8, dataUInt8.length);
      this.receivedData = undefined;
    } else if (this.receivedData === undefined) {
      this.receivedData = new Uint8Array(dataUInt8);
    } else if (dataUInt8[0] !== this.receivedData[0]) {
      const tmp = new Uint8Array(this.receivedData.length + dataUInt8.length);
      tmp.set(this.receivedData, 0);
      tmp.set(dataUInt8, this.receivedData.length);
      this.receivedData = tmp;
      if (this.receivedData[0] === START_BYTE
        && this.receivedData[this.receivedData.length - 1] === STOP_BYTE) {
        this.parseData(this.receivedData);
        this.receivedData = undefined;
      }
    }
  }

  parseData(msg) {
    // app.debug('Incoming data: %j', rawData)
    if (this.validateChecksum(msg)) {
      switch (msg[1]) {
        case 0x03:
          this.emtEvent('statusUpdate', this.register0x03setData(msg));
          break;
        case 0x04:
          this.emtEvent('cellUpdate', this.register0x04setData(msg));
          break;
        default:
          console.log('Unexpected Register ', msg[1]);
          break;
      }
    } else {
      console.log('Received invalid data from BMS!');
    }
  }

  // event emitter
  emtEvent(name, value) {
    if (this.listeners[name] !== undefined) {
      this.listeners[name].forEach((f) => { f(value); });
    }
  }

  on(name, fn) {
    this.listeners[name] = this.listeners[name] || [];
    this.listeners[name].push(fn);
  }


  // validates the checksum of an incoming result
  // eslint-disable-next-line class-methods-use-this
  validateChecksum(msg) {
    // Payload is between the 4th and n-3th byte (last 3 bytes are checksum and stop byte)
    const sumOfPayload = msg
      .slice(4, msg.length - 3)
      .reduce((partialSum, a) => partialSum + a, 0);
    const checksum = 0x10000 - (sumOfPayload + msg[3]);

    if ((((checksum & 0xff00) >> 8) === msg[msg.length - 3]
      && (checksum & 0xff) === msg[msg.length - 2])) {
      return true;
    }
    console.log('Bad checksum', checksum, ((checksum & 0xff00) >> 8), msg[msg.length - 3], (checksum & 0xff), msg[msg.length - 2]);
    return false;
  }

  // https://github.com/FurTrader/OverkillSolarBMS/blob/master/Comm_Protocol_Documentation/JBD_REGISTER_MAP.md
  register0x03setData(msg) {
    const dataView = new DataView(msg.buffer, 4);
    const obj = {
      chemistry: 'LifePO4',
      voltage: 0.01 * dataView.getUint16(REG_VOLTAGE_U16), // 10mV U16
      current: 0.01 * dataView.getInt16(REG_CURRENT_S16), // 10mA S16
      packBalCap: 0.01 * dataView.getUint16(REG_PACK_CAPACITY_U16), // 10mAh U16
      capacity: {
        fullCapacity: 0.01 * dataView.getUint16(REG_FULL_CAPACITY_U16),
        stateOfCharge: dataView.getUint8(REG_SOC_U8), // fraction
      },
      chargeCycles: dataView.getUint16(REG_CHARGE_CYCLES_U16),
      productionDate: this.getDate(dataView.getUint16(REG_PRODUCTION_DATE_U16)),
      balanceActive: this.getBalanceStatus(dataView),
      currentErrors: this.getCurrentErrors(dataView),
      bmsSWVersion: (0.1 * dataView.getUint8(REG_SOFTWARE_VERSION_U8)).toFixed(1),
      FETStatus: this.getFETStatus(dataView.getUint8(REG_FET_STATUS_U8)),
      numberOfCells: dataView.getUint8(REG_NUMBER_OF_CELLS_U8),
      tempSensorCount: dataView.getUint8(REG_NTC_COUNT_U8),
      tempSensorValues: this.getNTCValues(dataView),
    };
    return obj;
  }


  // eslint-disable-next-line class-methods-use-this
  register0x04setData(msg) {
    const dataView = new DataView(msg.buffer);
    const cellMv = [];
    const ncells = dataView.getUint8(3) / 2;
    for (let i = 0; i < ncells; i++) {
      cellMv[i] = dataView.getUint16(4 + i * 2);
    }
    return { cellMv };
  }

  // eslint-disable-next-line class-methods-use-this
  getDate(dateU16) {
    const year = ((dateU16 & 0xfe00) >> 9) + 2000;
    const month = ((dateU16 & 0x01e0)) >> 5;
    const day = ((dateU16 & 0x0f));
    return new Date(year, month - 1, day);
  }

  getBalanceStatus(dataView) {
    const ncells = dataView.getUint8(REG_NUMBER_OF_CELLS_U8);
    let status = dataView.getUint16(REG_BAT0_15_STATUS_U16);
    const balanceActive = [];
    let mask = 0x01;
    for (let i = 0; i < ncells; i++) {
      if (i === 16) {
        status = dataView.getUint16(REG_BAT0_15_STATUS_U16);
        mask = 0x01;
      }
      balanceActive[i] = this.getBit(status, mask);
      mask <<= 1;
    }
    return balanceActive;
  }

  // eslint-disable-next-line class-methods-use-this
  getBit(bitmap, mask) {
    if ((bitmap & mask) === mask) {
      return 1;
    }
    return 0;
  }

  getCurrentErrors(dataView) {
    const status = dataView.getUint16(REG_ERRORS_U16);
    const currentErrors = {
      // bit0 - Single Cell overvolt
      singleCellOvervolt: this.getBit(status, 0x01),
      // bit1 - Single Cell undervolt
      singleCellUndervolt: this.getBit(status, 0x02),
      // bit2 - whole pack overvolt
      packOvervolt: this.getBit(status, 0x04),
      // bit3 - whole pack undervolt
      packUndervolt: this.getBit(status, 0x08),
      // bit4 - charging over temp
      chargeOvertemp: this.getBit(status, 0x10),
      // bit5 - charging under temp
      chargeUndertemp: this.getBit(status, 0x20),
      // bit6 - discharge over temp
      dischargeOvertemp: this.getBit(status, 0x40),
      // bit7 - discharge under temp
      dischargeUndertemp: this.getBit(status, 0x80),
      // bit8 - charge overcurrent
      chargeOvercurrent: this.getBit(status, 0x100),
      // bit9 - discharge overcurrent
      dischargeOvercurrent: this.getBit(status, 0x200),
      // bit10 - short circut
      shortCircut: this.getBit(status, 0x400),
      // bit11 - front-end detection ic error
      frontEndDetectionICError: this.getBit(status, 0x800),
      // bit12 - software lock MOS
      softwareLockMOS: this.getBit(status, 0x1000),
      // bit13-15 reserved/unused
    };
    return currentErrors;
  }

  getFETStatus(byte) {
    return {
      charging: this.getBit(byte, 0x01),
      discharging: this.getBit(byte, 0x02),
    };
  }


  // eslint-disable-next-line class-methods-use-this
  getNTCValues(dataView) {
    const numNTCs = dataView.getUint8(REG_NTC_COUNT_U8);
    const result = [];
    for (let i = 0; i < numNTCs; i++) {
      result[i] = Number.parseFloat(
        (
          dataView.getUint16(REG_NTC_READINGS_U8 + 2 * i) * 0.1 - 273.15
        ).toFixed(1),
      );
    }
    return result;
  }
}


export {
  JDBBMSReader,
};




