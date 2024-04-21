"use strict";
import { CANMessage } from './messages_decoder.js';
 
class PGN60928_IsoAddressClaim  extends CANMessage {
    constructor() {
        super();
    }
    fromMessage(message) {
        const codeAndManNumber = message.data.getUint32(0, true);
        const industryGroupAndSystemInstance = message.data.getUint8(7);
        return {
            pgn: 60928,
            count: 1,
            message: "IsoAddressClaim",
            manufacturerCode: (codeAndManNumber>>21)&0x07ff, // top 11 bits
            uniqueNumber: (codeAndManNumber)&0x1fffff, // lower 21 bits
            deviceInstance: message.data.getUint8(4),
            deviceFunction: message.data.getUint8(5),
            deviceClass: message.data.getUint8(6),
            industryGroup: (industryGroupAndSystemInstance>>4)&0x0f,
            systemInstance: (industryGroupAndSystemInstance)&0x0f
        }
    }    
}
class PGN126993_HeartBeat  extends CANMessage {
    constructor() {
        super();
    }
    fromMessage(message) {
       return {
            pgn: 126993,
            count: 1,
            message: "Heartbeat"
        }
    }
}


const register = (pgnRegistry) => {
    pgnRegistry[60928] = new PGN60928_IsoAddressClaim();
    pgnRegistry[126993] = new PGN126993_HeartBeat();

}



export { 
    register
};