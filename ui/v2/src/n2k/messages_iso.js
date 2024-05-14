/* eslint-disable no-bitwise, camelcase, class-methods-use-this */

import { CANMessage } from './messages_decoder.js';

class PGN60928_IsoAddressClaim extends CANMessage {
  fromMessage(message) {
    const codeAndManNumber = message.data.getUint32(0, true);
    const industryGroupAndSystemInstance = message.data.getUint8(7);
    return {
      pgn: 60928,
      src: message.source,
      count: 1,
      message: 'IsoAddressClaim',
      manufacturerCode: (codeAndManNumber >> 21) & 0x07ff, // top 11 bits
      uniqueNumber: (codeAndManNumber) & 0x1fffff, // lower 21 bits
      deviceInstance: message.data.getUint8(4),
      deviceFunction: message.data.getUint8(5),
      deviceClass: message.data.getUint8(6),
      industryGroup: (industryGroupAndSystemInstance >> 4) & 0x0f,
      systemInstance: (industryGroupAndSystemInstance) & 0x0f,
    };
  }
}
class PGN126993_HeartBeat extends CANMessage {
  fromMessage(message) {
    return {
      pgn: 126993,
      src: message.source,
      count: 1,
      message: 'Heartbeat',
    };
  }
}

// 126996 product information
// PGN 059392 - ISO Acknowledgement

const register = (pgnRegistry) => {
  pgnRegistry[60928] = new PGN60928_IsoAddressClaim();
  pgnRegistry[126993] = new PGN126993_HeartBeat();
};

export {
  register,
};
