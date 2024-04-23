"use strict";


class EventEmitter {
    constructor() {
        this.listeners = {};
    }
    emit(event, payload) {
        if (this.listeners[event]) {
            for (var i = 0; i < this.listeners[event].length; i++) {
                this.listeners[event][i](payload);
            }
        }
    }
    addListener(event, l) {
        this.listeners[event] = this.listeners[event] || [];
        this.listeners[event].push(l);
    } 
    removeListener(event, l) {
        if ( this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((f) => (f != l));
        }
    }

}


class SeaSmartParser extends EventEmitter {
    constructor(decoder) {
        super();
        this.decoder = decoder;
    };
    parseSeaSmartMessages(messages) {
        if ( messages !== undefined && messages.data) {
            let ndecoded = 0;
            let nparsed = 0;
            
            const sentences = messages.data.split('\n');
            for (var i = 0; i < sentences.length; i++) {
                const ssMessage = sentences[i].trim();
                const canMessage = this._parseSeaSmart(ssMessage);
                if ( canMessage !== undefined ) {
                    nparsed++;
                    this.emit("n2kraw", canMessage);
                    const decoded = this.decoder.decode(canMessage);
                    if ( decoded !== undefined ) {
                        this.emit("n2kdecoded",decoded);
                    }                   
                }
            }
        }
    };

    _parseSeaSmart(sentence) {

        if ( sentence.startsWith('$PCDIN,') && this._checkSumOk(sentence)) {
            const parts = sentence.substring(0,sentence.length-3).split(',');
            const canMessage = {
                pgn: this._toUint(parts[1]), // hex encoded 24 bit PGN, 3 bytes, bigendian ??? wtf?
                timetamp: this._toUint(parts[2]),
                source: this._toUint(parts[3]),
                data: new DataView(this._toBuffer(parts[4]))
            };
            return canMessage;
        }
        return undefined;
    };
    // 
    _toUint(asHex) {
      if ( (asHex.length%2) == 1) {
        asHex = '0'+asHex;
      }
      return parseInt(asHex,16);
    };
  
    _toBuffer(asHex) {
        const b = new Uint8Array(asHex.length/2);
        for (var i = 0; i < b.length; i++) {
            b[i] = parseInt(asHex.substring(i*2,i*2+2),16);
        }
        return b.buffer;
    };
    _checkSumOk(sentence) {
        let cs = 0;
        for (var i = 1; i < sentence.length-3; i++) {
            cs = (cs ^ sentence.charCodeAt(i));

        }
        const csCheck = cs.toString(16).padStart(2,'0').toUpperCase();
        const csSentence = sentence.substring(sentence.length-2);
        if ( csCheck == csSentence ) {
            return true;
        } else {
            console.log("CS failed ",csCheck, sentence);
            return false;
        }
    };
}

class SeaSmartStream {
    constructor(seasmartParser) {
        this.startsWith = undefined;
        this.seasmartParser = seasmartParser;
    }
    start(url) {
        this.stop();
        this.ws = new WebSocket(url);
        this.ws.onopen = () => {
          console.log('ws opened on browser')
          this.ws.send('hello world')
        }
        this.ws.onerror = (error) => {
          console.log('seasmart ws error',error);
        }

        this.ws.onmessage = (message) => {
            this.seasmartParser.parseSeaSmartMessages(message);
        }
    }
    stop() {
        if ( this.ws !== undefined ) {
            this.ws.close();
            this.ws = undefined;
        }
    }
}







class Store extends EventEmitter {
    constructor() {
        super();
        this.state = {
            lastChange: Date.now()
        };
        this.messages = {};
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
            voltage_1: new LinearHistory()


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
        if ( this.history[field]) {
            return this.history[field];
        } else {
            return {value: 0, data: []};
        }
    }
    getKeys() {
        return Object.keys(this.state);
    }

    /* Non exposed API methods */

    // When using a NMEA0183 feed.
    updateFromNMEA0183Stream(sentence) {
        const newState = {};
        switch(sentence.id) {
            case 'MWV':
                if ( sentence.fields[4] === 'A' && sentence.fields[1] === 'R' && sentence.fields[3] === 'N' ) {
                    newState.awa = sentence.fields[0]*Math.PI/180;
                    newState.aws = sentence.fields[2]*0.514444;
                }
                break;
            case 'ROL':
                newState.roll = sentence.fields[0]*Math.PI/180;
                break;
            case 'VHW':
                newState.hdm = sentence.fields[2]*Math.PI/180;
                newState.stw = sentence.fields[4]*0.514444;
                break;
            case 'HDG':
                newState.hdm = sentence.fields[0]*Math.PI/180;
                newState.variation = sentence.fields[3]*Math.PI/180;
                if ( sentence.fields[4] == 'W') {
                    newState.variation = -newState.variation;
                }
                break;
            case 'VTG':
                newState.cogt = sentence.fields[0]*Math.PI/180;
                newState.sog = sentence.fields[4]*0.514444;
                break;
        }
        const now = Date.now();
        const changedState = {};
        for ( let k in newState ) {
            if ( newState[k] !== this.state[k]) {
                this.state.lastChange = now;
                this.state[k]= newState[k];
                changedState[k] = {
                        state: this.state[k],
                        history: this.history[k]
                };

            }
        }
        this.emit("change", changedState);
    }


    // When streaming NMEA2000 messages.
    updateFromNMEA2000Stream(message) {
        // only messages where there is a value in putting them into the store\
        // should be added to the store. Forother messages simply subscribe directly to the message
        // in the visualisation. (how TBD)
        // Reasoning, is to mimimise CPU usage by not doing unecessary work that isnt used.
        const newState = {};
        switch(message.pgn) {
            case 126992: // System time
                // Use GNSS message
                //if ( message.timeSource.name === "GPS") {
                //    newState.systemDate = message.systemDate;
                //    newState.systemTime = message.systemTime;
                //}
                break;
            case 127250: // Heading
                if ( message.ref.name === "Magnetic") {
                    newState.hdm = message.heading;
                    newState.deviation = message.deviation;
                    newState.variation = message.variation;
                }
                break;
            case 127257: // attitude
                newState.yaw = message.yaw;
                newState.pitch = message.pitch;
                newState.roll = message.roll;
                break;
            case 127258: // variation
                // Use heading message
                //newState.variationValue = message.variation;
                //newState.variationdaysSince1970 = message.daysSince1970;
                //newState.variationModel = message.source.name;
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
                //newState.logSecondsSinceMidnight = message.secondsSinceMidnight;
                //newState.logDaysSince1970 = message.daysSince1970;
                newState.log = message.log;
                newState.tripLog = message.tripLog;
                break;
            case 129029: // GNSS
                // if a more complete view of GNSS is required, then create a subscriber to the 
                // messages directly.
                if ( message.GNSStype && message.GNSStype.id < 9 ) {
                    newState.latitude = message.latitude;
                    newState.longitude = message.longitude;
                    newState.gpsDaysSince1970 = message.daysSince1970;
                    newState.gpsSecondsSinceMidnight = message.secondsSinceMidnight;                    
                } else  {
                    return; // dont save message as its come from an untrusted gnss source with an unrecognized GNSS type
                }
                break;
            case 129026: // sog cog rapid
                if ( message.ref.name === "True" ) {
                    newState.cogt = message.cog;
                    newState.sog = message.sog;
                } else if ( message.ref.name === "Magnetic" ) {
                    newState.cogm = message.cog;
                    newState.sog = message.sog;
                }
                break;
            case 129283: // XTE
                // ignore for now.
                break;
            case 130306: // wind
                if (message.windReference.name === "Apparent" ) {
                    newState.aws = message.windSpeed;
                    newState.awa = message.windAngle;
                } else if (message.windReference.name === "True" ) {
                    newState.tws = message.windSpeed;
                    newState.twa = message.windAngle;
                }
                break;
            case 127506: // DC Status
                // ignore for now, may be able to get from LifePO4 BT adapter
                break;
            case 127508: // DC Bat status
                newState["voltage_"+message.instance] = message.batteryVoltage;
                newState["current_"+message.instance] = message.batteryCurrent;
                newState["temperature_"+message.instance] = message.batteryTemperature;
                break;
            case 130312: // temp


/*
Dont store 

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


                break;
            case 127505: // fluid level
                if (message.fluidType.name === "Fuel" ) {
                    newState["fuelLevel_"+message.instance] = message.fluidLevel;
                    newState["fuelCapacity_"+message.instance] = message.fluidCapacity;
                }
                break;
            case 127489: // Engine Dynamic params
                // ignore most fields for storage
                newState["engineCoolantTemperature_"+message.engineInstance] = message.engineCoolantTemperature;
                newState["alternatorVoltage_"+message.engineInstance] = message.alternatorVoltage;
                break;
            case 127488: // Engine Rapiod
                newState["engineSpeed_"+message.engineInstance] = message.engineSpeed;
                break;
            case 130314: // pressure
                if (message.pressureSource.name === "Atmospheric" ) {
                    newState["atmosphericPressure_"+message.pressureInstance] = message.actualPressure;
                }
                break;
            case 127245: // rudder
                newState.rudderPosition = message.rudderPosition;
                break;
            }
            if ( this.messages[message.pgn] !== undefined ) {
                message.count = this.messages[message.pgn].count + 1;
            } 
            this.messages[message.pgn] = message;


            const now = Date.now();
            const changedState = {};
            for ( let k in newState ) {
                if ( newState[k] !== this.state[k]) {
                    this.state.lastChange = now;
                    this.state[k]= newState[k];
                    changedState[k] = {
                            state: this.state[k],
                            history: this.history[k]
                    };

                }
            }
            this.emit("change", changedState);
    }

    getMessages() {
        return this.messages;
    }

    mergeUpdate(calculations) {
        const now = Date.now();
        const changedState = {};
        // calculate new values based on the store before updating history.
        const calculatedValues = calculations.update(this);
        for ( let k in calculatedValues ) {
            if ( calculatedValues[k] !== this.state[k]) {
                this.state.lastChange = now;
                this.state[k]= calculatedValues[k];
                changedState[k] = {
                        state: this.state[k],
                        history: this.history[k]
                };
            }
        }
        this.updateHistory();
        this.emit("change", changedState);
    }

    updateHistory() {
        for (var k in this.history) {
            this.history[k].updateSample(this.state[k]);
        }

    }
}

class LinearHistory {
    constructor(samplePeriod, storePeriod, maxLength) {
        this.nextSample = 0;
        this.nextStore = 0;
        this.samplePeriod = samplePeriod || 1000;
        this.storePeriod = storePeriod || 5000;  // 10s
        this.nsamples = Math.round(this.storePeriod/this.samplePeriod);
        this.maxLength =  maxLength || 180; // default 1800s or 30m
        this.value = 0.0;
        this.mean = 0.0;
        this.stdev = 0.0;
        this.min = 0.0;
        this.max = 0.0;
        this.data = [];
    }

    updateSample(v) {
        const now = Date.now();
        if ( this.nextSample < now) {
            this.nextSample = now + this.samplePeriod;
            if ( v !== undefined && !Number.isNaN(v) && v != -1E9 ) {
                if ( this.value == undefined  ) {
                    this.value = v;
                } else {
                    this.value = (this.value*(this.nsamples-1)+v)/(this.nsamples);
                }                
            }
        }
        if ( this.nextStore < now) {
            this.nextStore = now + this.storePeriod;
            this.data.push(this.value);
            if ( this.data.length > this.maxLength ) {
                this.data.shift()
            }
            let sum = 0.0;
            let n = 0.0;
            for (let i = 0; i < this.data.length; i++) {
                const weight = (i+1)/2;
                sum += this.data[i]*weight;
                n += weight;
            }
            this.mean = sum/n;
            sum = 0.0;
            n = 0.0;
            for (let i = 0; i < this.data.length; i++) {
                const weight = (i+1)/2;
                sum += (this.data[i]-this.mean)*(this.data[i]-this.mean)*weight;
                n += weight;
            }
            this.stdev = Math.sqrt(sum/n);
            this.min = this.mean;
            this.max = this.mean;
            for (let i = this.data.length - 1; i >= 0; i--) {
                this.min = Math.min(this.data[i],this.min);
                this.max = Math.max(this.data[i],this.max);
            }
        }
    }
}

class AngularHistory {
    constructor(samplePeriod, storePeriod, nsamples, maxLength) {
        this.nextSample = 0;
        this.nextStore = 0;
        this.samplePeriod = samplePeriod || 1000;
        this.storePeriod = storePeriod || 10000;  // 10s
        this.nsamples = Math.round(this.storePeriod/this.samplePeriod);
        this.maxLength =  maxLength || 180; // default 1800s or 30m
        this.value = 0.0;
        this.sinValue = 0.0;
        this.cosValue = 0.0;
        this.mean = 0.0;
        this.stdev = 0.0;
        this.min = 0.0;
        this.max = 0.0;
        this.data = [];
        this.sinData = [];
        this.cosData = [];
    }

    updateSample(v) {
        const now = Date.now();
        if ( this.nextSample < now) {
            this.nextSample = now + this.samplePeriod;
            // calculate the angular mean.
            // if standard deviation was required then we would need to hold
            // store the samples.
            if ( v !== undefined  && !Number.isNaN(v) ) {
                if ( this.value == undefined ) {
                    this.sinValue = Math.sin(v);
                    this.cosValue = Math.cos(v);
                    this.value = v;
                } else {
                    this.sinValue = (this.sinValue*(this.nsamples-1)+Math.sin(v))/this.nsamples;
                    this.cosValue = (this.cosValue*(this.nsamples-1)+Math.cos(v))/this.nsamples;
                    this.value = Math.atan2(this.sinValue, this.cosValue);
                }
            }
        }
        if ( this.nextStore < now) {
            this.nextStore = now + this.storePeriod;
            if ( this.value != undefined ) {

                this.data.push(this.value);
                this.sinData.push(this.sinValue);
                this.cosData.push(this.cosValue);
                if ( this.data.length > this.maxLength ) {
                    this.data.shift()
                    this.sinData.shift()
                    this.cosData.shift()
                } 


                let sinsum = 0.0, cossum= 0.0;
                let n = 0.0;
                for (let i = 0; i < this.data.length; i++) {
                    const weight = (i+1)/2;
                    sinsum += this.sinData[i]*weight;
                    cossum += this.cosData[i]*weight;
                    n += weight;
                }
                this.mean = Math.atan2(sinsum/n,cossum/n);

                // probably not the right way of calculating a SD of a circular
                // value, however it does produces a viable result.
                // other methods are estimates.
                // Not 100% certain about the weighting here.
                let diffsum = 0.0;
                n = 0.0;
                for (let i = 0; i < this.data.length; i++) {
                    const weight = (i+1)/2;
                    let a = this.data[i]-this.mean;
                    // find the smallest sweep from the mean.
                    if ( a > Math.PI ) {
                        a = a - 2*Math.PI;
                    } else if ( a < -Math.PI ) {
                        a = a + 2*Math.PI;
                    }
                    diffsum += a*a*weight;
                    n += weight;
                }
                this.stdev = Math.sqrt(diffsum/n);
                this.min = this.mean;
                this.max = this.mean;
                for (var i = this.data.length - 1; i >= 0; i--) {
                    this.min = Math.min(this.data[i],this.min);
                    this.max = Math.max(this.data[i],this.max);
                }
            }
        }
    }    
}




import {NMEA2000MessageDecoder} from './n2k/messages_decoder.js';
import {register as registerIsoMessages} from './n2k/messages_iso.js';
import {register as registerEngineMessages} from './n2k/messages_engine.js';
import {register as registerNavMessages} from './n2k/messages_nav.js';

registerIsoMessages(NMEA2000MessageDecoder.messages);
registerEngineMessages(NMEA2000MessageDecoder.messages);
registerNavMessages(NMEA2000MessageDecoder.messages);


import {Calculations} from './n2k/calculations.js';


class StoreAPIImpl {
    constructor() {
        this.store = new Store();
        this.calculations = new Calculations();
        this.decoder = new NMEA2000MessageDecoder();
        this.seasmartParser = new SeaSmartParser(this.decoder);
        this.seasmart = new SeaSmartStream(this.seasmartParser);
        this.messageCount = 0;
        this.host = "192.168.1.11";
        this.seasmartParser.addListener("n2kdecoded", (decoded) => {
            this.messageCount++;
            this.store.updateFromNMEA2000Stream(decoded);
        });
        setInterval(() => {
            this.store.mergeUpdate(this.calculations);
        },1000);

    }
    start(host) {
        // if host is set, save the host config in local storage
        // otherwise try and get from local storage.
        // if nothing in local storage do nothing.
        host = host || "192.168.1.11";
        this.seasmart.start(`ws://${host}/ws/seasmart`);
        this.host = host;
    }
    stop() {
    }









        getPacketsRecieved() { 
//            console.log('storeApi->getPacketsRecieved'); 
            return this.messageCount;
        };
        getState(field) {
            return this.store.getState(field);
        };
        getHistory(field) {
            return this.store.getHistory(field);
        };

        getStore() {
            return this.store;
        }
        getKeys() {
            return this.store.getKeys();
        };
        getMessages() {
            return this.store.getMessages();
        };
        addListener(event, fn) { 
            if ( event.startsWith("n2k")) {
                console.log("Add ",event, fn);
                this.seasmartParser.addListener(event, fn);
            } else {
                this.store.addListener(event, fn);
            }
        };
        removeListener(event, fn) { 
            if ( event.startsWith("n2k")) {
                console.log("Remove ",event, fn);
                this.seasmartParser.removeListener(event, fn);
            } else {
                this.store.removeListener(event, fn);
            }
        };
        getNmea0183Address() {
            return this.host;
        };
        getConnectedClients() {
            return "";
        };

}

class MainAPIImpl {
        onPlaybackEnd() { 
            console.log('mainAPI->onPlaybackEnd'); 
            return 100;
        };
        addListener() { 
            console.log('mainAPI->addListener'); 
            return 100;
        };
        onCanFrame() { 
            console.log('mainAPI->onCanFrame'); 
            return 100;
        };
        onCanMessage() { 
            console.log('mainAPI->onCanMessage'); 
            return 100;
        };
        onLogMessage() { 
            console.log('mainAPI->onLogMessage'); 
            return 100;
        };
}





export {StoreAPIImpl, MainAPIImpl};
