


// registers Ox03
const REG_VOLTAGE_U16 = 5;
const REG_CURRENT_S16 = 7;
const REG_PACK_CAPACITY_U16 = 9;
const REG_FULL_CAPACITY_U16 = 11;
const REG_CHARGE_CYCLES_U16 = 13;
const REG_PRODUCTION_DATE_U16 = 15;
const REG_BAT0_15_STATUS_U16 = 17;
const REG_BAT16_31_STATUS_U16 = 19;
const REG_ERRORS_U16 = 21;
const REG_SOFTWARE_VERSION_U8 = 23;
const REG_SOC_U8 = 24;
const REG_FET_STATUS_U8 = 25;
const REG_NUMBER_OF_CELLS_U8 = 26;
const REG_NTC_COUNT_U8 = 27;
const REG_NTC_READINGS_U8 = 28;

class NMEA2000JBDMessageDecoder {
  constructor() {
    this.messages = {};
  }



  decode(canMessage) {
    if (canMessage.pgn === 127508) {
      return {
        pgn: 127508,
        message: 'DCBatteryStatus',
        instance: canMessage.data.getUint8(0),
        batteryVoltage: this.get2ByteDouble(canMessage.data, 1, 0.01),
        batteryCurrent: this.get2ByteDouble(canMessage.data, 3, 0.1),
        batteryTemperature: this.get2ByteUDouble(canMessage.data, 5, 0.01),
        sid: canMessage.data.getUint8(7),
      };
    }
    if (canMessage.pgn === 130829) {
      if (canMessage.data.getUint16(0, true) === 0x9ffe) {
        const instance = canMessage.data.getUint8(2);
        const register = canMessage.data.getUint8(3);
        switch (register) {
          case 0x03: {
            const registerLength = canMessage.data.getUint8(4);
            if (registerLength === 0) {
              return {};
            }
            const nNTC = canMessage.data.getUint8(27);
            const endNTC = REG_NTC_READINGS_U8 + 2 * nNTC;
            /*
             const register03Format = {
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
            */
            // eslint-disable-next-line no-case-declarations
            return {
              pgn: canMessage.pgn,
              register,
              instance,
              chemistry: 'LifePO4',
              registerLength,
              voltage: this.get2ByteUDouble(canMessage.data, REG_VOLTAGE_U16, 0.01),
              current: this.get2ByteDouble(canMessage.data, REG_CURRENT_S16, 0.01),
              packBalCap: this.get2ByteUDouble(canMessage.data, REG_PACK_CAPACITY_U16, 0.01),
              capacity: {
                fullCapacity: this.get2ByteUDouble(canMessage.data, REG_FULL_CAPACITY_U16, 0.01),
                stateOfCharge: this.get1ByteUInt(canMessage.data, REG_SOC_U8),
              },
              chargeCycles: this.get2ByteUInt(canMessage.data, REG_CHARGE_CYCLES_U16),
              productionDate: this.decodeDate(
                canMessage.data.getUint16(REG_PRODUCTION_DATE_U16, true),
              ),
              balanceStatus0: this.get2ByteUInt(canMessage.data, REG_BAT0_15_STATUS_U16),
              balanceStatus1: this.get2ByteUInt(canMessage.data, REG_BAT16_31_STATUS_U16),
              protectionStatus: this.get2ByteUInt(canMessage.data, REG_ERRORS_U16),
              balanceActive: this.getBalanceStatus(canMessage.data),
              currentErrors: this.getCurrentErrors(canMessage.data),
              bmsSWVersion: this.get1ByteUDouble(canMessage.data, REG_SOFTWARE_VERSION_U8, 0.1),
              FETStatus: this.getFETStatus(canMessage.data),
              numberOfCells: this.get1ByteUInt(canMessage.data, REG_NUMBER_OF_CELLS_U8),
              tempSensorCount: nNTC,
              humidity: this.get1ByteUInt(canMessage.data, endNTC),
              alarmStatus: this.get2ByteUInt(canMessage.data, endNTC + 1),
              fullChargeCapacity: this.get2ByteUDouble(canMessage.data, endNTC + 3, 0.01),
              remainingChargeCapacity: this.get2ByteUDouble(canMessage.data, endNTC + 5, 0.01),
              ballanceCurrent: this.get2ByteUDouble(canMessage.data, endNTC + 7, 0.001),
              tempSensorValues: this.getNTCValues(canMessage.data),
            };
          }
          case 0x04: {
            const registerLength = canMessage.data.getUint8(4);
            if (registerLength === 0) {
              return {};
            }
            /*
            register04Format
                const dataView = new DataView(msg.buffer);
                const cellMv = [];
                const ncells = dataView.getUint8(3) / 2;
                for (let i = 0; i < ncells; i++) {
                  cellMv[i] = dataView.getUint16(4 + i * 2);
                }
                return { cellMv };
                */
            // eslint-disable-next-line no-case-declarations
            return {
              pgn: canMessage.pgn,
              register,
              instance,
              registerLength,
              cellMv: this.getCellMv(canMessage.data),
            };
          }
          default:
            return undefined;
        }
      }
    }
    return undefined;
  }


  // eslint-disable-next-line class-methods-use-this
  getCellMv(dataView) {
    const nCells = dataView.getUint8(4) / 2;
    const cellMv = [];
    for (let i = 0; i < nCells; i++) {
      cellMv[i] = dataView.getUint16(5 + i * 2, true);
      if (cellMv[i] === 0xffff) {
        return undefined;
      }
    }
    return cellMv;
  }

  // eslint-disable-next-line class-methods-use-this
  decodeDate(dateU16) {
    if (dateU16 === 0xffff) {
      return undefined;
    }
    // eslint-disable-next-line no-bitwise
    const year = ((dateU16 & 0xfe00) >> 9) + 2000;
    // eslint-disable-next-line no-bitwise
    const month = ((dateU16 & 0x01e0)) >> 5;
    // eslint-disable-next-line no-bitwise
    const day = ((dateU16 & 0x1f));
    return new Date(year, month - 1, day);
  }

  getBalanceStatus(dataView) {
    let status = dataView.getUint16(REG_BAT0_15_STATUS_U16, true);
    if (status === 0xffff) {
      return undefined;
    }
    const ncells = dataView.getUint8(REG_NUMBER_OF_CELLS_U8);
    const balanceActive = [];
    let mask = 0x01;
    for (let i = 0; i < ncells; i++) {
      if (i === 16) {
        status = dataView.getUint16(REG_BAT0_15_STATUS_U16, true);
        mask = 0x01;
      }
      balanceActive[i] = this.getBit(status, mask);
      // eslint-disable-next-line no-bitwise
      mask <<= 1;
    }
    return balanceActive;
  }

  // eslint-disable-next-line class-methods-use-this
  getBit(bitmap, mask) {
    // eslint-disable-next-line no-bitwise
    if ((bitmap & mask) === mask) {
      return 1;
    }
    return 0;
  }

  getCurrentErrors(dataView) {
    const status = dataView.getUint16(REG_ERRORS_U16, true);
    if (status === 0xffff) {
      return undefined;
    }
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

  getFETStatus(dataView) {
    const byte = dataView.getUint8(REG_FET_STATUS_U8);
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
          dataView.getUint16(REG_NTC_READINGS_U8 + 2 * i, true) * 0.1 - 273.15
        ).toFixed(1),
      );
    }
    return result;
  }

  // eslint-disable-next-line class-methods-use-this
  get2ByteUInt(dataView, byteOffset) {
    if (dataView.byteLength < byteOffset + 2) {
      return undefined;
    }
    if (dataView.getUint8(byteOffset) === 0xff
          && dataView.getUint8(byteOffset + 1) === 0xff) {
      return undefined;
    }
    return dataView.getUint16(byteOffset, true);
  }

  // eslint-disable-next-line class-methods-use-this
  get1ByteUInt(dataView, byteOffset) {
    if (dataView.byteLength < byteOffset + 1) {
      return undefined;
    }
    if (dataView.getUint8(byteOffset) === 0xff) {
      return undefined;
    }
    return dataView.getUint8(byteOffset);
  }

  // eslint-disable-next-line class-methods-use-this
  get1ByteUDouble(dataView, byteOffset, factor) {
    if (dataView.byteLength < byteOffset + 1) {
      return undefined;
    }
    if (dataView.getUint8(byteOffset) === 0xff) {
      return undefined;
    }
    return factor * dataView.getUint8(byteOffset);
  }

  // eslint-disable-next-line class-methods-use-this
  get2ByteUDouble(dataView, byteOffset, factor) {
    if (dataView.byteLength < byteOffset + 2) {
      return undefined;
    }
    if (dataView.getUint8(byteOffset) === 0xff
          && dataView.getUint8(byteOffset + 1) === 0xff) {
      return undefined;
    }
    return factor * dataView.getUint16(byteOffset, true);
  }



  // eslint-disable-next-line class-methods-use-this
  get2ByteDouble(dataView, byteOffset, factor) {
    if (dataView.byteLength < byteOffset + 2) {
      return undefined;
    }
    if (dataView.getUint8(byteOffset) === 0xff
          && dataView.getUint8(byteOffset + 1) === 0x7f) {
      return undefined;
    }
    return factor * dataView.getInt16(byteOffset, true);
  }
}


class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  emitEvent(event, payload) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        this.listeners[event][i](payload);
      }
    }
    if (this.listeners['*']) {
      for (let i = 0; i < this.listeners['*'].length; i++) {
        this.listeners['*'][i](event, payload);
      }
    }
  }

  on(event, l) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(l);
  }

  removeListener(event, l) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((f) => (f !== l));
    }
  }
}


class SeaSmartParser extends EventEmitter {
  constructor(decoder) {
    super();
    this.decoder = decoder;
  }

  parseSeaSmartMessages(messages) {
    if (messages !== undefined && messages.data) {
      const sentences = messages.data.split('\n');
      for (let i = 0; i < sentences.length; i++) {
        const ssMessage = sentences[i].trim();
        const canMessage = SeaSmartParser.parseSeaSmart(ssMessage);
        if (canMessage !== undefined) {
          this.emitEvent('n2kraw', canMessage);
          const decoded = this.decoder.decode(canMessage);
          if (decoded !== undefined) {
            this.emitEvent('n2kdecoded', decoded);
          }
        }
      }
    }
  }

  static parseSeaSmart(sentence) {
    if (sentence.startsWith('$PCDIN,') && SeaSmartParser.checkSumOk(sentence)) {
      const parts = sentence.substring(0, sentence.length - 3).split(',');
      const canMessage = {
        // hex encoded 24 bit PGN, 3 bytes, bigendian ??? wtf?
        pgn: SeaSmartParser.toUint(parts[1]),
        timetamp: SeaSmartParser.toUint(parts[2]),
        source: SeaSmartParser.toUint(parts[3]),
        data: new DataView(SeaSmartParser.toBuffer(parts[4])),
      };
      return canMessage;
    }
    return undefined;
  }

  //
  static toUint(asHex) {
    if ((asHex.length % 2) === 1) {
      return parseInt(`0${asHex}`, 16);
    }
    return parseInt(asHex, 16);
  }

  static toBuffer(asHex) {
    const b = new Uint8Array(asHex.length / 2);
    for (let i = 0; i < b.length; i++) {
      b[i] = parseInt(asHex.substring(i * 2, i * 2 + 2), 16);
    }
    return b.buffer;
  }

  static checkSumOk(sentence) {
    let cs = 0;
    for (let i = 1; i < sentence.length - 3; i++) {
      /* eslint-disable-next-line no-bitwise */
      cs ^= sentence.charCodeAt(i);
    }
    const csCheck = cs.toString(16).padStart(2, '0').toUpperCase();
    const csSentence = sentence.substring(sentence.length - 2);
    if (csCheck === csSentence) {
      return true;
    }
    // eslint-disable-next-line no-console
    console.log('SeaSmart message checksum failed ', csCheck, sentence);
    return false;
  }
}



/**
 * Internal class that manages a chunked stream handling restarts and timeouts.
 * Once started it will run until stopped.
 * Cannot be restarted once stopped.
 * Cannot be started again once started.
 * public methods are start and stop.
 * emits events:
 *   connected, true or false
 *   statusCode with the status code of the current fetch after a response is received.
 *   metrics, are metrics.
 *   statusUpdate the BLE status updates.
 *
 *
 */
class ChunkedSeaSmartStream extends EventEmitter {
  constructor(url, seasmartParser) {
    super();
    this.seasmartParser = seasmartParser;
    this.running = false;
    this.timeouts = 0;
    this.connections = 0;
    this.url = url;
  }


  /*
   * started goes from false to true, but is never reset.
   * once started, running is set to true, and then false, never reset.
   * end state is started == true and running == false.
   *
   */
  start() {
    if (!this.started) {
      this.started = true;
      this.running = true;
      this.restartDelay = 5000;
      this.streamId = Date.now();
      this.restart();
      const that = this;

      const timeoutCheck = setInterval(() => {
        if (that.running) {
          console.debug(`${Date.now()} ${this.streamId} Timeout `, (Date.now() - that.lastMessage));
          if ((Date.now() - that.lastMessage) > 10000) {
            // eslint-disable-next-line no-console
            that.restartDelay = 100;
            that.controller.abort('timeout');
            that.timeouts++;
            console.log(`${Date.now()} ${this.streamId} Timeout on receive, trigger restart`);
          }
        } else {
          clearInterval(timeoutCheck);
        }
      }, 1000);
    }
  }

  stop() {
    console.log(`${Date.now()} ${this.streamId} Stopping`);
    const that = this;
    return new Promise((resolve) => {
      if (that.running) {
        that.on('connected', (connected) => {
          if (!connected) {
            console.log(`${Date.now()} ${that.streamId} Stopped, even connected == false`);
            resolve();
          }
        });
        that.running = false;
        console.log(`${Date.now()} ${that.streamId} Signalling stop `, that.running);
        that.controller.abort('stopped');
        console.log(`${Date.now()} ${that.streamId} Signaled stop `, that.running);
      } else {
        console.log(`${Date.now()} ${that.streamId} Already stopped `, that.running);
        resolve();
      }
    });
  }


  // restarts the connection.
  restart() {
    if (!this.running) {
      this.emitEvent('connected', false);
      return;
    }
    const that = this;
    this.keepRunning().then(() => {
      if (that.running) {
        console.log(`${Date.now()} ${that.streamId} Schedule Normal Restart in ${that.restartDelay}`);
        setTimeout(() => {
          that.restartDelay = 5000;
          that.restart();
        }, that.restartDelay);
      } else {
        console.log(`${Date.now()} ${that.streamId} No Restart`);
      }
    }).catch((e) => {
      console.log(`${Date.now()} ${that.streamId} Fetch Error `, e);
      if (e.message === 'Failed to fetch') {
        // net::ERR_CONNECTION_REFUSED
        that.running = false;
        that.emitEvent('statusCode', 504);
        console.log(`${Date.now()} ${that.streamId} No Restart`);
      } else if (that.running) {
        console.log(`${Date.now()} ${that.streamId} Schedule Error Restart in ${that.restartDelay}`);
        setTimeout(() => {
          that.restartDelay = 5000;
          that.restart();
        }, that.restartDelay);
      } else {
        that.running = false;
        that.emitEvent('connected', false);
        console.log(`${Date.now()} ${that.streamId} No Restart`);
      }
    });
  }

  // the running stream to be kept running at all costs.
  async keepRunning() {
    console.log(`${Date.now()} ${this.streamId} Start keepRunning`);
    this.lastMessage = Date.now();
    this.controller = new AbortController();
    this.connections++;
    const response = await fetch(this.url, { signal: this.controller.signal });
    console.log(`${Date.now()} ${this.streamId} Connected keepRunning`);
    this.emitEvent('statusCode', response.status);
    this.emitEvent('connected', true);
    let buffer = '';
    const that = this;
    // this loop will pause when there is nothing on the http stream,
    // which blocks any
    for await (const chunk of response.body.pipeThrough(new TextDecoderStream())) {
      if (!that.running) {
        break;
      }
      // Do something with each "chunk"
      // the chunk may be incomplete, so we need the parser to return what it didnt parse.
      buffer += chunk;
      that.lastMessage = Date.now();
      const lastNL = buffer.lastIndexOf('\n');
      if (lastNL !== -1) {
        try {
          that.seasmartParser.parseSeaSmartMessages({ data: buffer.substring(0, lastNL + 1) });
        } catch(e) {
          console.error('Failed tp parse message ', e, buffer.substring(0, lastNL + 1));
        }
        buffer = buffer.substring(lastNL + 1);
      }
    }
    that.emitEvent('connected', false);
    console.log(`${Date.now()} ${this.streamId} End keepRunning`);
  }
}

/**
 * Read registers from a http seasmart stream of DCIM sentences.
 * This requires no special permissions once the http service has been found.
 *
 */
class JDBBMSReaderSeasmart extends EventEmitter {
  constructor() {
    super();
    this.streamCount = 0;
    this.messagesRecieved = 0;
    this.messagedDecoded = 0;
    const decoder = new NMEA2000JBDMessageDecoder();
    this.parser = new SeaSmartParser(decoder);
    const that = this;
    this.parser.on('n2kraw', (rawMessage) => {
      if (rawMessage.pgn === 130829) {
        console.debug('BLE Message', rawMessage);
      } else if (rawMessage.pgn === 127508) {
        console.debug('BattereyStatus Message', rawMessage);
      }
      this.messagesRecieved++;
    });
    this.parser.on('n2kdecoded', (decodedMessage) => {
      try {
        this.messagedDecoded++;
        that.emitEvent('n2kdecoded', decodedMessage);
      } catch (e) {
        console.error('Failed to process decoded message', e);
      }
    });
    setInterval(() => {
      that.emitEvent('metrics', {
        messagesRecieved: that.messagesRecieved,
        messagedDecoded: that.messagedDecoded,
        streams: that.streamCount,
        connections: (that.stream) ? that.stream.connections : undefined,
        timeouts: (that.stream) ? that.stream.timeouts : undefined,
      });
    }, 1000);
  }

  async connectBMS(url) {
    if (!this.stream) {
      console.log('Starting connection to ', url);
      this.streamCount++;
      this.stream = new ChunkedSeaSmartStream(url, this.parser);
      const that = this;
      this.stream.on('*', (event, v) => {
        that.emitEvent(event, v);
      });
      this.stream.start();
    } else {
      console.log('Already connected');
    }
  }

  async disconnectBMS() {
    this.url = undefined;
    await this.stream.stop();
    console.log('Stopped');
    this.stream = undefined;
  }
}

export {
  JDBBMSReaderSeasmart,
};

