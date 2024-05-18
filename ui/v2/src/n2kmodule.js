/* eslint-disable no-underscore-dangle */

import { NMEA2000MessageDecoder } from './n2k/messages_decoder.js';
import { register as registerIsoMessages } from './n2k/messages_iso.js';
import { register as registerEngineMessages } from './n2k/messages_engine.js';
import { register as registerNavMessages } from './n2k/messages_nav.js';
import { EventEmitter } from './eventemitter.js';

import { Calculations } from './n2k/calculations.js';

import { LinearHistory, AngularHistory } from './histories.js';





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
        const canMessage = SeaSmartParser._parseSeaSmart(ssMessage);
        if (canMessage !== undefined) {
          this.emit('n2kraw', canMessage);
          const decoded = this.decoder.decode(canMessage);
          if (decoded !== undefined) {
            this.emit('n2kdecoded', decoded);
          }
        }
      }
    }
  }

  static _parseSeaSmart(sentence) {
    if (sentence.startsWith('$PCDIN,') && SeaSmartParser._checkSumOk(sentence)) {
      const parts = sentence.substring(0, sentence.length - 3).split(',');
      const canMessage = {
        // hex encoded 24 bit PGN, 3 bytes, bigendian ??? wtf?
        pgn: SeaSmartParser._toUint(parts[1]),
        timetamp: SeaSmartParser._toUint(parts[2]),
        source: SeaSmartParser._toUint(parts[3]),
        data: new DataView(SeaSmartParser._toBuffer(parts[4])),
      };
      return canMessage;
    }
    return undefined;
  }

  //
  static _toUint(asHex) {
    if ((asHex.length % 2) === 1) {
      return parseInt(`0${asHex}`, 16);
    }
    return parseInt(asHex, 16);
  }

  static _toBuffer(asHex) {
    const b = new Uint8Array(asHex.length / 2);
    for (let i = 0; i < b.length; i++) {
      b[i] = parseInt(asHex.substring(i * 2, i * 2 + 2), 16);
    }
    return b.buffer;
  }

  static _checkSumOk(sentence) {
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
    console.log('CS failed ', csCheck, sentence);
    return false;
  }
}

class SeaSmartStream {
  constructor(seasmartParser) {
    this.startsWith = undefined;
    this.seasmartParser = seasmartParser;
    this.keepUp = false;
    this.url = undefined;
    setInterval(() => {
      if (this.keepUp) {
        if ((Date.now() - this.lastMessage) > 10000) {
          console.log('Web Socket reconnect');
          this.keepRunning();
        }
      }
    }, 10000);
  }

  start(url) {
    this.keepUp = true;
    this.url = url;
    this.keepRunning();
  }

  stop() {
    this.keepUp = false;
    this.stopRunning();
  }

  keepRunning() {
    this.stopRunning();
    this.ws = new WebSocket(this.url);
    this.ws.onopen = () => {
      console.log('ws opened on browser');
      this.ws.send('hello world');
    };
    this.ws.onerror = (error) => {
      console.log('seasmart ws error', error);
    };

    this.ws.onmessage = (message) => {
      this.lastMessage = Date.now();
      this.seasmartParser.parseSeaSmartMessages(message);
    };
  }

  stopRunning() {
    if (this.ws !== undefined) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}

class Store extends EventEmitter {
  constructor() {
    super();
    this.state = {
      lastChange: Date.now(),
    };
    this.messages = {};
    // last time a valid update was recieved.
    // not all messages need this.
    this.lastUpdate = {};
    this.history = {
      awa: new AngularHistory(),
      aws: new LinearHistory(),
      tws: new LinearHistory(),
      twa: new AngularHistory(),
      stw: new LinearHistory(),
      cogt: new AngularHistory(),
      cogm: new AngularHistory(),
      sog: new LinearHistory(),
      hdt: new AngularHistory(),
      hdm: new AngularHistory(),
      gwdt: new AngularHistory(),
      gwdm: new AngularHistory(),
      vmg: new LinearHistory(),
      roll: new AngularHistory(),
      leeway: new AngularHistory(),
      variation: new AngularHistory(),
      polarSpeed: new LinearHistory(),
      polarSpeedRatio: new LinearHistory(),
      polarVmg: new LinearHistory(),
      targetVmg: new LinearHistory(),
      targetStw: new LinearHistory(),
      targetTwa: new AngularHistory(),
      targetAwa: new AngularHistory(),
      targetAws: new LinearHistory(),
      polarVmgRatio: new LinearHistory(),
      oppositeHeadingTrue: new AngularHistory(),
      oppositeTrackTrue: new AngularHistory(),
      oppositeTrackMagnetic: new AngularHistory(),
      oppositeHeadingMagnetic: new AngularHistory(),
      dbt: new LinearHistory(),
      alternatorVoltage_0: new LinearHistory(),
      atmosphericPressure_0: new LinearHistory(),
      atmosphericPressure_1: new LinearHistory(),
      atmosphericPressure_2: new LinearHistory(),
      current_0: new LinearHistory(),
      current_1: new LinearHistory(),
      engineCoolantTemperature_0: new LinearHistory(),
      fuelCapacity_0: new LinearHistory(),
      temperature_0: new LinearHistory(),
      voltage_0: new LinearHistory(),
      voltage_1: new LinearHistory(),

    };
    this.webContents = [];

    // Store API exposed to the UI.
    this.getState = this.getState.bind(this);
    this.getHistory = this.getHistory.bind(this);
    this.getKeys = this.getKeys.bind(this);
  }

  /*  Exposed API methods */
  getState(field) {
    return this.state[field];
  }

  getHistory(field) {
    if (this.history[field]) {
      return this.history[field];
    }
    return { value: 0, data: [] };
  }

  getKeys() {
    return Object.keys(this.state);
  }

  /* Non exposed API methods */

  // When using a NMEA0183 feed.
  updateFromNMEA0183Stream(sentence) {
    const newState = {};
    switch (sentence.id) {
      case 'MWV':
        if (sentence.fields[4] === 'A' && sentence.fields[1] === 'R' && sentence.fields[3] === 'N') {
          newState.awa = sentence.fields[0] * (Math.PI / 180);
          newState.aws = sentence.fields[2] * 0.514444;
        }
        break;
      case 'ROL':
        newState.roll = sentence.fields[0] * (Math.PI / 180);
        break;
      case 'VHW':
        newState.hdm = sentence.fields[2] * (Math.PI / 180);
        newState.stw = sentence.fields[4] * 0.514444;
        break;
      case 'HDG':
        newState.hdm = sentence.fields[0] * (Math.PI / 180);
        newState.variation = sentence.fields[3] * (Math.PI / 180);
        if (sentence.fields[4] === 'W') {
          newState.variation = -newState.variation;
        }
        break;
      case 'VTG':
        newState.cogt = sentence.fields[0] * (Math.PI / 180);
        newState.sog = sentence.fields[4] * 0.514444;
        break;
      default:
        break;
    }
    const now = Date.now();
    const changedState = {};
    for (const k in newState) {
      if (newState[k] !== this.state[k]) {
        this.state.lastChange = now;
        this.state[k] = newState[k];
        changedState[k] = {
          state: this.state[k],
          history: this.history[k],
        };
      }
    }
    this.emit('change', changedState);
  }

  // When streaming NMEA2000 messages.
  updateFromNMEA2000Stream(message) {
    // only messages where there is a value in putting them into the store\
    // should be added to the store. Forother messages simply subscribe directly to the message
    // in the visualisation. (how TBD)
    // Reasoning, is to mimimise CPU usage by not doing unecessary work that isnt used.
    const newState = {};
    const now = Date.now();

    switch (message.pgn) {
      case 127250: // Heading
        if (message.ref.name === 'Magnetic') {
          newState.hdm = message.heading;
          if (this.state.variationSource === undefined) {
            newState.variation = message.variation;
          }
          newState.deviation = message.deviation;
        }
        break;
      case 127257: // attitude
        newState.yaw = message.yaw;
        newState.pitch = message.pitch;
        newState.roll = message.roll;
        break;
      case 127258: // variation
        // Use heading message
        // {"pgn":127258,"src":30,"count":906,"message":"N2K Magnetic Variation",
        // "sid":89,"source":{"id":8,"name":"wmm2020"},"daysSince1970":19827,
        // "variation":0.219}

        if (this.state.variationSource === undefined
                    || (message.source
                         && message.source.p >= this.state.variationSource.p)) {
          newState.variation = message.variation;
          newState.variationdaysSince1970 = message.daysSince1970;
          newState.variationSource = message.source;
        }
        break;
      case 128259: // speed
        newState.stw = message.waterReferenced;
        newState.speedGroundReferenced = message.groundReferenced;
        newState.swrt = message.swrt;
        break;
      case 128267: // depth
        newState.dbt = message.depthBelowTransducer;
        newState.depthOffset = message.offset;
        break;
      case 128275: // log
        // newState.logSecondsSinceMidnight = message.secondsSinceMidnight;
        // newState.logDaysSince1970 = message.daysSince1970;
        newState.log = message.log;
        newState.tripLog = message.tripLog;
        break;
      case 129025: // rapid possition
        // {"pgn":129025,"src":30,"count":5242,"message":"N2K Rapid Positions",
        // "latitude":51.9589473,"longitude":1.2762917999999999}
        if (message.src === this.state.gnssSource) {
          newState.latitude = message.latitude;
          newState.longitude = message.longitude;
        }
        break;
      case 129026: // sog cog rapid
        if (message.src === this.state.gnssSource) {
          if (message.ref.name === 'True') {
            newState.cogt = message.cog;
            newState.sog = message.sog;
          } else if (message.ref.name === 'Magnetic') {
            newState.cogx = message.cog;
            newState.sog = message.sog;
          }
        }
        break;
      case 129029: // GNSS
        // if a more complete view of GNSS is required, then create a subscriber to the
        // messages directly.
        // use the most prefered source available.
        // this will also select other messages from the gnss source.
        if (this.state.GNSStype === undefined
                    || (message.GNSStype && message.GNSStype.p >= this.state.GNSStype.p)) {
          newState.GNSStype = message.GNSStype;
          newState.gnssSource = message.src;
          newState.latitude = message.latitude;
          newState.longitude = message.longitude;
          newState.gnssIntegrety = message.integrety;
          newState.gpsDaysSince1970 = message.daysSince1970;
          newState.gpsSecondsSinceMidnight = message.secondsSinceMidnight;
          newState.gnssLastUpdate = now;
        } else {
          return; // dont save message as its come from an untrusted gnss source with
          // an unrecognized GNSS type
        }
        break;
      case 126992: // System time
        // Use GNSS message
        // if ( message.timeSource.name === "GPS") {
        //    newState.systemDate = message.systemDate;
        //    newState.systemTime = message.systemTime;
        // }
        break;
      case 129283: // XTE
        // ignore for now.
        break;
      case 130306: // wind
        if (message.windReference.name === 'Apparent') {
          newState.aws = message.windSpeed;
          newState.awa = message.windAngle;
        } else if (message.windReference.name === 'True') {
          newState.tws = message.windSpeed;
          newState.twa = message.windAngle;
        }
        break;
      case 127506: // DC Status
        // ignore for now, may be able to get from LifePO4 BT adapter
        break;
      case 127508: // DC Bat status
        newState[`voltage_${message.instance}`] = message.batteryVoltage;
        newState[`current_${message.instance}`] = message.batteryCurrent;
        newState[`temperature_${message.instance}`] = message.batteryTemperature;
        break;
      case 130312: // temp

        /*

        "temperatureSource": {
            0: { id: 0, name:"Sea Temperature"},
            1: { id: 1, name:"Outside Temperature"},
            2: { id: 2, name:"Inside Temperature"},
            3: { id: 3, name:"Engine Room Temperature"},
            4: { id: 4, name:"Main Cabin Temperature"},
            5: { id: 5, name:"Live Well Temperature"},
            6: { id: 6, name:"Bait Well Temperature"},
            7: { id: 7, name:"Refrigeration Temperature"},
            8: { id: 8, name:"Heating System Temperature"},
            9: { id: 9, name:"Dew Point Temperature"},
            10: { id: 10, name:"Apparent Wind Chill Temperature"},
            11: { id: 11, name:"Theoretical Wind Chill Temperature"},
            12: { id: 12, name:"Heat Index Temperature"},
            13: { id: 13, name:"Freezer Temperature"},
            14: { id: 14, name:"Exhaust Gas Temperature"},
            15: { id: 15, name:"Shaft Seal Temperature"},
        },

                        return  {
            pgn: 130312,
            message: "Temperature",
            sid: this.getByte(message,0),
            instance: this.getByte(message,1),
            source: NMEA2000Reference.lookup("temperatureSource",this.getByte(message,2)),
            actualTemperature: this.get2ByteUDouble(message, 3,0.01),
            requestedTemperature: this.get2ByteUDouble(message, 5,0.01)
        };
*/

        switch (message.source.id) {
          case 0: // sea temperature
            newState.seaTemperature = message.actualTemperature;
            break;
          case 3: // engine room temperature
            newState.engineRoomTemperature = message.actualTemperature;
            break;
          case 4: // engine room temperature
            newState.mainCabinTemperature = message.actualTemperature;
            break;
          case 14: // exhaust temperature
            newState.exhaustTemperature = message.actualTemperature;
            break;
          case 15: // exhaust temperature
            newState.alternatorTemperature = message.actualTemperature;
            break;
          default:
            break;
        }

        break;
      case 127505: // fluid level
        if (message.fluidType.name === 'Fuel') {
          newState[`fuelLevel_${message.instance}`] = message.fluidLevel;
          newState[`fuelCapacity_${message.instance}`] = message.fluidCapacity;
        }
        break;
      case 127489: // Engine Dynamic params
        // ignore most fields for storage
        newState[`engineCoolantTemperature_${message.engineInstance}`] = message.engineCoolantTemperature;
        newState[`alternatorVoltage_${message.engineInstance}`] = message.alternatorVoltage;
        // this is an abuse, specific to my boat which has LiFePo4 and the
        // oil temperature sensor is on the alternator to warn of overheating.
        newState[`alternatorTemperature_${message.engineInstance}`] = message.engineOilTemperature;
        break;
      case 127488: // Engine Rapiod
        newState[`engineSpeed_${message.engineInstance}`] = message.engineSpeed;
        break;
      case 130314: // pressure
        if (message.pressureSource.name === 'Atmospheric') {
          newState[`atmosphericPressure_${message.pressureInstance}`] = message.actualPressure;
        }
        break;
      case 127245: // rudder
        // sometimes multiple rudder sources cause the possition to flip.
        if (message.rudderPosition !== -1e9) {
          newState.rudderPosition = message.rudderPosition;
          this.lastUpdate[127245] = now;
        } else if (this.lastUpdate[127245] === undefined) {
          newState.rudderPosition = -1e9;
        } else if ((now - this.state[127245]) > 10000) {
          newState.rudderPosition = -1e9;
        }
        break;
      default:
        break;
    }
    if (this.messages[message.pgn] !== undefined) {
      message.count = this.messages[message.pgn].count + 1;
    }
    this.messages[message.pgn] = message;

    const changedState = {};
    for (const k of Object.keys(newState)) {
      if (newState[k] !== this.state[k]) {
        this.state.lastChange = now;
        this.state[k] = newState[k];
        changedState[k] = {
          state: this.state[k],
          history: this.history[k],
        };
      }
    }
    this.emit('change', changedState);
  }

  getMessages() {
    return this.messages;
  }

  mergeUpdate(calculations) {
    const now = Date.now();
    const changedState = {};
    // calculate new values based on the store before updating history.
    const calculatedValues = calculations.update(this);
    for (const k in calculatedValues) {
      if (calculatedValues[k] !== this.state[k]) {
        this.state.lastChange = now;
        this.state[k] = calculatedValues[k];
        changedState[k] = {
          state: this.state[k],
          history: this.history[k],
        };
      }
    }
    this.updateHistory();
    this.emit('change', changedState);
  }

  updateHistory() {
    for (const k of Object.keys(this.history)) {
      this.history[k].updateSample(this.state[k]);
    }
  }
}

class StoreAPIImpl {
  constructor() {
    this.store = new Store();
    this.calculations = new Calculations();
    this.decoder = new NMEA2000MessageDecoder();
    registerIsoMessages(this.decoder.messages);
    registerIsoMessages(this.decoder.messages);
    registerEngineMessages(this.decoder.messages);
    registerNavMessages(this.decoder.messages);

    this.seasmartParser = new SeaSmartParser(this.decoder);
    this.seasmart = new SeaSmartStream(this.seasmartParser);
    this.messageCount = 0;
    if (window.location.protocol === 'https') {
      this.url = `wss://${window.location.hostname}/ws/seasmart`;
    } else {
      this.url = `ws://${window.location.hostname}/ws/seasmart`;
    }
    this.seasmartParser.addListener('n2kdecoded', (decoded) => {
      this.messageCount++;
      this.store.updateFromNMEA2000Stream(decoded);
    });
    setInterval(() => {
      this.store.mergeUpdate(this.calculations);
    }, 1000);
  }



  start(url) {
    // if host is set, save the host config in local storage
    // otherwise try and get from local storage.
    // if nothing in local storage do nothing.
    if (url) {
      if (url.port !== '') {
        this.url = `ws://${url.host}:${url.port}/ws/seasmart`;
      } else {
        this.url = `ws://${url.host}/ws/seasmart`;
      }
    }
    console.log('Starting websocket on ', this.url);
    this.seasmart.start(this.url);
  }

  stop() {
    this.seasmart.stop();
  }

  getPacketsRecieved() {
    return this.messageCount;
  }

  getState(field) {
    return this.store.getState(field);
  }

  getHistory(field) {
    return this.store.getHistory(field);
  }

  getStore() {
    return this.store;
  }

  getKeys() {
    return this.store.getKeys();
  }

  getMessages() {
    return this.store.getMessages();
  }

  addListener(event, fn) {
    if (event.startsWith('n2k')) {
      console.log('Add ', event, fn);
      this.seasmartParser.addListener(event, fn);
    } else {
      this.store.addListener(event, fn);
    }
  }

  removeListener(event, fn) {
    if (event.startsWith('n2k')) {
      console.log('Remove ', event, fn);
      this.seasmartParser.removeListener(event, fn);
    } else {
      this.store.removeListener(event, fn);
    }
  }

  getNmea0183Address() {
    return this.host;
  }

  /* eslint-disable-next-line class-methods-use-this */
  getConnectedClients() {
    return '';
  }
}




export { StoreAPIImpl };
