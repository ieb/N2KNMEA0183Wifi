/* eslint-disable no-bitwise, camelcase, class-methods-use-this */

import { CANMessage, NMEA2000Reference } from './messages_decoder.js';

class PGN126992 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 126992,
      src: message.source,
      count: 1,
      message: 'N2K System Time',
      sid: this.getByte(message, 0),
      timeSource: NMEA2000Reference.lookup('timeSource', this.getByte(message, 1) & 0x0f),
      systemDate: this.get2ByteUInt(message, 2),
      systemTime: this.get4ByteUDouble(message, 4, 0.0001),
    };
  }
}

class PGN127245 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 127245,
      src: message.source,
      count: 1,
      message: 'N2K Rudder',
      instance: this.getByte(message, 0),
      rudderDirectionOrder: NMEA2000Reference.lookup('rudderDirectionOrder', this.getByte(message, 1) & 0x07),
      angleOrder: this.get2ByteDouble(message, 2, 0.0001),
      rudderPosition: this.get2ByteDouble(message, 4, 0.0001),
    };
  }
}

class PGN127250 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 127250,
      src: message.source,
      count: 1,
      message: 'N2K Heading',
      sid: this.getByte(message, 0),
      heading: this.get2ByteUDouble(message, 1, 0.0001),
      deviation: this.get2ByteDouble(message, 3, 0.0001),
      variation: this.get2ByteDouble(message, 5, 0.0001),
      ref: NMEA2000Reference.lookup('headingReference', this.getByte(message, 7) & 0x03),
    };
  }
}

class PGN127251 extends CANMessage {
  // checked.
  fromMessage(message) {
    return {
      pgn: 127251,
      src: message.source,
      count: 1,
      message: 'N2K Rate of Turn',
      sid: this.getByte(message, 0),
      rateOfTurn: this.get4ByteDouble(message, 1, 3.125E-08),
    };
  }
}

class PGN127257 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 127257,
      src: message.source,
      count: 1,
      message: 'N2K Attitude',
      sid: this.getByte(message, 0),
      yaw: this.get2ByteDouble(message, 1, 0.0001),
      pitch: this.get2ByteDouble(message, 3, 0.0001),
      roll: this.get2ByteDouble(message, 5, 0.0001),
    };
  }
}

class PGN127258 extends CANMessage {
  // checked.
  fromMessage(message) {
    return {
      pgn: 127258,
      src: message.source,
      count: 1,
      message: 'N2K Magnetic Variation',
      sid: this.getByte(message, 0),
      source: NMEA2000Reference.lookup('variationSource', this.getByte(message, 1) & 0x0f),
      daysSince1970: this.get2ByteUInt(message, 2),
      variation: this.get2ByteDouble(message, 4, 0.0001),
    };
  }
}

class PGN128259 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 128259,
      src: message.source,
      count: 1,
      message: 'N2K Speed',
      sid: this.getByte(message, 0),
      waterReferenced: this.get2ByteDouble(message, 1, 0.01),
      groundReferenced: this.get2ByteDouble(message, 3, 0.01),
      swrt: NMEA2000Reference.lookup('swrtType', this.getByte(message, 5)),
      speedDirection: (this.getByte(message, 6) >> 4) & 0x0f,
    };
  }
}

class PGN128267 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 128267,
      src: message.source,
      count: 1,
      message: 'N2K Water Depth',
      sid: this.getByte(message, 0),
      depthBelowTransducer: this.get4ByteUDouble(message, 1, 0.01),
      offset: this.get2ByteDouble(message, 5, 0.001),
      maxRange: this.get1ByteUDouble(message, 7, 10),
    };
  }
}
class PGN128275 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }

  // checked
  fromMessage(message) {
    return {
      pgn: 128275,
      src: message.source,
      count: 1,
      message: 'N2K Distance Log',
      daysSince1970: this.get2ByteUInt(message, 0),
      secondsSinceMidnight: this.get4ByteUDouble(message, 2, 0.0001),
      log: this.get4ByteUDouble(message, 6, 1),
      tripLog: this.get4ByteUDouble(message, 10, 1),
    };
  }
}

class PGN129026 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 129026,
      src: message.source,
      count: 1,
      message: 'N2K COG SOG Rapid',
      sid: this.getByte(message, 0),
      ref: NMEA2000Reference.lookup('headingReference', this.getByte(message, 1) & 0x03), // lookup
      cog: this.get2ByteUDouble(message, 2, 0.0001),
      sog: this.get2ByteUDouble(message, 4, 0.01),
    };
  }
}

class PGN129539 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = false;
  }

  // checked.
  fromMessage(message) {
    const modes = this.getByte(message, 1);
    return {
      pgn: 129539,
      src: message.source,
      count: 1,
      message: 'N2K GNSS DOPS',
      sid: this.getByte(message, 0),
      desiredMode: NMEA2000Reference.lookup('gnssMode', (modes >> 5) & 0x07),
      actualMode: NMEA2000Reference.lookup('gnssMode', (modes >> 2) & 0x07),
      reserved: modes & 0x03,
      hdop: this.get2ByteDouble(message, 2, 0.01),
      vdop: this.get2ByteDouble(message, 4, 0.01),
      tdop: this.get2ByteDouble(message, 6, 0.01),
    };
  }
}

class PGN129025 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = false;
  }

  // checked.
  fromMessage(message) {
    return {
      pgn: 129025,
      src: message.source,
      count: 1,
      message: 'N2K Rapid Positions',
      latitude: this.get4ByteDouble(message, 0, 1e-7),
      longitude: this.get4ByteDouble(message, 4, 1e-7),
    };
  }
}
class PGN129029 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }

  // checked.
  fromMessage(message) {
    const typeMethod = this.getByte(message, 31);
    const nReferenceStations = this.getByte(message, 42);
    const stations = [];
    if (nReferenceStations !== CANMessage.n2kUInt8NA) {
      for (let i = 0; i < nReferenceStations; i++) {
        const ind = this.get2ByteInt(message, 43 + i * 4);
        stations.push({
          referenceStationType: NMEA2000Reference.lookup('gnssType', ind & 0x0f),
          referenceSationID: (ind >> 4),
          ageOfCorrection: this.get2ByteUDouble(message, 45 + i * 4, 0.01),
        });
      }
    }
    return {
      pgn: 129029,
      src: message.source,
      count: 1,
      message: 'N2K GNSS',
      sid: this.getByte(message, 0),
      daysSince1970: this.get2ByteUInt(message, 1),
      secondsSinceMidnight: this.get4ByteUDouble(message, 3, 0.0001),
      latitude: this.get8ByteDouble(message, 7, 1e-16), // 7+8=15
      longitude: this.get8ByteDouble(message, 15, 1e-16), // 15+8=23
      altitude: this.get8ByteDouble(message, 23, 1e-6), // 23+8=31
      GNSStype: NMEA2000Reference.lookup('gnssType', typeMethod & 0x0f),
      GNSSmethod: NMEA2000Reference.lookup('gnssMethod', (typeMethod >> 4) & 0x0f),
      integrety: NMEA2000Reference.lookup('gnssIntegrity', this.getByte(message, 32) & 0x03),
      nSatellites: this.getByte(message, 33),
      hdop: this.get2ByteDouble(message, 34, 0.01),
      pdop: this.get2ByteDouble(message, 36, 0.01),
      geoidalSeparation: this.get4ByteDouble(message, 38, 0.01), // 38+4=42
      nReferenceStations,
      stations,
    };
  }
}

class PGN129283 extends CANMessage {
  // checked
  fromMessage(message) {
    const xteModeNav = this.getByte(message, 1);
    return {
      pgn: 129283,
      src: message.source,
      count: 1,
      message: 'N2K Cross Track Error',
      sid: this.getByte(message, 0),
      xteMode: NMEA2000Reference.lookup('xteMode', xteModeNav & 0x0f),
      navigationTerminated: NMEA2000Reference.lookup('yesNo', ((xteModeNav >> 6) & 0x01)),
      xte: this.get4ByteDouble(message, 2, 0.01),
    };
  }
}

class PGN130306 extends CANMessage {
  // checked
  fromMessage(message) {
    const decoded = {
      pgn: 130306,
      src: message.source,
      count: 1,
      message: 'N2K Wind',
      sid: this.getByte(message, 0),
      windSpeed: this.get2ByteUDouble(message, 1, 0.01),
      windAngle: this.get2ByteUDouble(message, 3, 0.0001),
      windReference: NMEA2000Reference.lookup('windReference', this.getByte(message, 5) & 0x07),
    };
    // relative to the boat rather than a direction
    if (decoded.windReference.id > 1) {
      if (decoded.windAngle > Math.PI) {
        decoded.windAngle -= 2 * Math.PI;
      }
    }
    return decoded;
  }
}

class PGN130310 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130310,
      src: message.source,
      count: 1,
      message: 'N2K Outside Environment Parameters',
      sid: this.getByte(message, 0),
      waterTemperature: this.get2ByteUDouble(message, 1, 0.01),
      outsideAmbientAirTemperature: this.get2ByteUDouble(message, 3, 0.01),
      atmosphericPressure: this.get2ByteUDouble(message, 5, 100),
    };
  }
}

class PGN130311 extends CANMessage {
  // checked
  fromMessage(message) {
    const vb = this.getByte(message, 1);
    return {
      pgn: 130311,
      src: message.source,
      count: 1,
      message: 'N2K Environment Parameters',
      sid: this.getByte(message, 0),
      tempSource: NMEA2000Reference.lookup('temperatureSource', (vb & 0x3f)),
      humiditySource: NMEA2000Reference.lookup('humiditySource', ((vb >> 6) & 0x03)),
      temperature: this.get2ByteUDouble(message, 2, 0.01),
      humidity: this.get2ByteDouble(message, 4, 0.004),
      atmosphericPressure: this.get2ByteUDouble(message, 6, 100),
    };
  }
}

class PGN130313 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130313,
      src: message.source,
      count: 1,
      message: 'N2K Humidity',
      sid: this.getByte(message, 0),
      humidityInstance: this.getByte(message, 1),
      humiditySource: NMEA2000Reference.lookup('humiditySource', this.getByte(message, 2)),
      actualHumidity: this.get2ByteDouble(message, 3, 0.004),
      setHumidity: this.get2ByteDouble(message, 5, 0.004),
    };
  }
}

class PGN130314 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130314,
      src: message.source,
      count: 1,
      message: 'N2K Pressure',
      sid: this.getByte(message, 0),
      pressureInstance: this.getByte(message, 1),
      pressureSource: NMEA2000Reference.lookup('pressureSource', this.getByte(message, 2)),
      actualPressure: this.get4ByteDouble(message, 3, 0.1),
    };
  }
}

class PGN130315 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130315,
      src: message.source,
      count: 1,
      message: 'N2K Set Pressure',
      sid: this.getByte(message, 0),
      pressureInstance: this.getByte(message, 1),
      pressureSource: NMEA2000Reference.lookup('pressureSource', this.getByte(message, 2)),
      setPressure: this.get4ByteUDouble(message, 3, 0.1),
    };
  }
}

class PGN130316 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130316,
      src: message.source,
      count: 1,
      message: 'N2K Temperature Extended',
      sid: this.getByte(message, 0),
      tempInstance: this.getByte(message, 1),
      tempSource: NMEA2000Reference.lookup('temperatureSource', this.getByte(message, 2)),
      actualTemperature: this.get3ByteUDouble(message, 3, 0.001),
      setTemperature: this.get2ByteUDouble(message, 6, 0.1),
    };
  }
}



// typically from a chart plotter, eg e7.
// set and drift are the most interesting and from an e7 these are the only fields 
// set.
class PGN130577 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }

  // checked
  fromMessage(message) {
    const dataModeReference = this.getByte(message, 0);
    return {
      pgn: 130577,
      src: message.source,
      count: 1,
      message: 'Direction Data',
      residualMode: NMEA2000Reference.lookup('residualMode', dataModeReference & 0x0f),
      cogReference: NMEA2000Reference.lookup('directionReference', ((dataModeReference >> 4) & 0x03)),
      sid: this.getByte(message, 1),
      cog: this.get2ByteUDouble(message, 2, 0.0001), // rad
      sog: this.get2ByteUDouble(message, 4, 0.01), // m/s
      heading: this.get2ByteUDouble(message, 6, 0.0001), // rad
      stw: this.get2ByteUDouble(message, 8, 0.01), // m/s
      set: this.get2ByteUDouble(message, 10, 0.0001), // rad
      drift: this.get2ByteUDouble(message, 12, 0.01), // m/s
    };
  }
}

class PGN127506 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }

  // checked
  fromMessage(message) {
    return {
      pgn: 127506,
      src: message.source,
      count: 1,
      message: 'N2K DC Status',
      sid: this.getByte(message, 0),
      dcInstance: this.getByte(message, 1),
      dcType: NMEA2000Reference.lookup('dcSourceType', this.getByte(message, 2)), // lookup
      stateOfCharge: this.getByte(message, 3),
      stateOfHealth: this.getByte(message, 4),
      timeRemaining: this.get2ByteUDouble(message, 5, 60),
      rippleVoltage: this.get2ByteUDouble(message, 7, 0.001),
      capacity: this.get2ByteUDouble(message, 9, 3600),
    };
  }
}

class PGN130916 extends CANMessage {
  // checked
  fromMessage(message) {
    return {
      pgn: 130916,
      src: message.source,
      count: 1,
      message: 'Raymarine Proprietary unknown',
      canmessage: CANMessage.dumpMessage(message),
    };
  }
}

class PGN126720 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }

  // not verified.
  fromMessage(message) {
    const f1 = this.get2ByteUInt(message, 0);
    const manufacturerCode = (f1 >> 5) & 0x07ff;
    const industry = (f1) & 0x07;
    const propietaryId = this.get2ByteUInt(message, 2);
    if ((manufacturerCode === 1851) && (industry === 4)) {
      if (propietaryId === 33264) {
        const command = this.getByte(message, 4);
        switch (command) {
          case 132:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk 1 Pilot Mode',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              command,
              uknown1: this.getByte(message, 5),
              uknown2: this.getByte(message, 6),
              uknown3: this.getByte(message, 7),
              pilotMode: NMEA2000Reference.lookup('seatalkPilotMode', this.getByte(message, 8)),
              subMode: this.getByte(message, 8),
              pilotModeData: this.getByte(message, 8),
              // remaining 10 bytes unknown.
            };
          case 134:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk 1 Keystroke',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              command,
              device: this.getByte(message, 5),
              key: NMEA2000Reference.lookup('seatalkKeystroke', this.getByte(message, 6)),
              keyInverted: this.getByte(message, 7),
              // remaining 14 bytes unknown
            };
          case 144:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk 1 Device Identification',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              command,
              reserved: this.getByte(message, 5),
              deviceId: NMEA2000Reference.lookup('seatalkDeviceId', this.getByte(message, 6)),

            };
          default:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk 1 UnknownCommand',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              command,
            };
        }
      } else if (propietaryId === 3212) {
        const command = this.getByte(message, 6);
        switch (command) {
          case 0:
            // this is sent but filtered.
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk1 Display Birghtness',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              group: NMEA2000Reference.lookup('seatalkNetworkGroup', this.getByte(message, 4)),
              unknown1: this.getByte(message, 5),
              command,
              brightness: this.getByte(message, 7),
              unknown2: this.getByte(message, 8),
            };
          case 1:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk1 Display Color',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              group: NMEA2000Reference.lookup('seatalkNetworkGroup', this.getByte(message, 4)),
              unknown1: this.getByte(message, 5),
              command,
              color: NMEA2000Reference.lookup('seatalkDisplayColor', this.getByte(message, 7)),
              unknown2: this.getByte(message, 8),
            };
          default:
            return {
              pgn: 126720,
              src: message.source,
              count: 1,
              message: 'Raymarine Seatalk1 Unknown 3212 ',
              canmessage: CANMessage.dumpMessage(message),
              manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
              industry: NMEA2000Reference.lookup('industry', industry),
              propietaryId,
              group: NMEA2000Reference.lookup('seatalkNetworkGroup', this.getByte(message, 4)),
              unknown1: this.getByte(message, 5),
              command,
              value: this.getByte(message, 7),
              unknown2: this.getByte(message, 8),
            };
        }
      } else {
        return {
          pgn: 126720,
          src: message.source,
          count: 1,
          message: 'Unknown Raymarine Proprietary message',
          canmessage: CANMessage.dumpMessage(message),
          manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
          industry: NMEA2000Reference.lookup('industry', industry),
          propietaryId,
        };
      }
    } else {
      return {
        pgn: 126720,
        count: 1,
        src: message.source,
        message: 'Unknown Proprietary message',
        canmessage: CANMessage.dumpMessage(message),
        manufacturerCode: NMEA2000Reference.lookup('manufacturerCode', manufacturerCode),
        industry: NMEA2000Reference.lookup('industry', industry),
        propietaryId,
      };
    }
  }
}

class PGN127237 extends CANMessage {
  constructor() {
    super();
    this.fastPacket = true;
  }
  // not verified.

  fromMessage(message) {
    const v1 = this.getByte(message, 0);
    const v2 = this.getByte(message, 1);
    // not sent from test.
    return {
      pgn: 127237,
      src: message.source,
      count: 1,
      message: 'Raymarine Proprietary Heading Track Control',
      rudderLimitExceeded: NMEA2000Reference.lookup('yesNo', (v1 & 0x03)), // lookup
      offHeadingLimitExceeded: NMEA2000Reference.lookup('yesNo', ((v1 >> 2) & 0x03)), // lookup
      offTrackLimitExceeded: NMEA2000Reference.lookup('yesNo', ((v1 >> 4) & 0x03)), // lookup
      override: NMEA2000Reference.lookup('yesNo', ((v1 >> 6) & 0x03)), // lookup
      steeringMode: NMEA2000Reference.lookup('steeringMode', (v2 & 0x07)),
      turnMode: NMEA2000Reference.lookup('turnMode', ((v2 >> 3) & 0x07)), // lookup
      headingReference: NMEA2000Reference.lookup('directionReference', ((v2 >> 6) & 0x03)), // lookup
      commandedRudderDirection: NMEA2000Reference.lookup('directionRudder', ((this.getByte(message, 2) >> 5) & 0x07)), // lookup
      commandedRudderAngle: this.get2ByteDouble(message, 3, 0.0001),
      headingToSteerCourse: this.get2ByteUDouble(message, 5, 0.0001),
      track: this.get2ByteUDouble(message, 7, 0.0001),
      rudderLimit: this.get2ByteUDouble(message, 9, 0.0001),
      offHeadingLimit: this.get2ByteUDouble(message, 11, 0.0001),
      radiusOfTurnOrder: this.get2ByteDouble(message, 13, 1),
      rateOfTurnOrder: this.get2ByteDouble(message, 15, 3.125e-5),
      offTrackLimit: this.get2ByteDouble(message, 17, 1),
      vesselHeading: this.get2ByteUDouble(message, 19, 0.0001),
    };
  }
}

class PGN65359 extends CANMessage {
  // not verified
  fromMessage(message) {
    const f1 = this.get2ByteUInt(message, 0);
    if ((((f1 >> 5) & 0x07ff === 1851) && ((f1) & 0x07 === 4))) {
      return {
        pgn: 65359,
        src: message.source,
        count: 1,
        message: 'Raymarine Seatalk Pilot Heading',
        canmessage: CANMessage.dumpMessage(message),
        manufacturerCode: (f1 >> 5) & 0x07ff, // should be 1851 === Raymarine
        reserved1: (f1 >> 3) & 0x03,
        industry: (f1) & 0x07,
        sid: this.getByte(message, 2),
        headingTrue: this.get2ByteUDouble(message, 3, 0.0001),
        headingMagnetic: this.get2ByteUDouble(message, 5, 0.0001),
        reserved2: this.getByte(7),
      };
    }
    return {
      pgn: 65359,
      src: message.source,
      count: 1,
      message: 'Unknown Proprietary',
      canmessage: CANMessage.dumpMessage(message),
      manufacturerCode: (f1 >> 5) & 0x07ff,
      reserved1: (f1 >> 3) & 0x03,
      industry: (f1) & 0x07,
    };
  }
}

class PGN65379 extends CANMessage {
  // not verified
  fromMessage(message) {
    const f1 = this.get2ByteUInt(message, 0);
    if ((((f1 >> 5) & 0x07ff === 1851) && ((f1) & 0x07 === 4))) {
      return {
        pgn: 65379,
        src: message.source,
        count: 1,
        message: 'Raymarine Seatalk Pilot Heading 2',
        canmessage: CANMessage.dumpMessage(message),
        manufacturerCode: (f1 >> 5) & 0x07ff, // should be 1851 === Raymarine
        reserved1: (f1 >> 3) & 0x03,
        industry: (f1) & 0x07, // should be 4
        pilotMode: this.get2ByteUInt(message, 2),
        subMode: this.get2ByteUInt(message, 4),
        pilotModeData: this.getByte(message, 6),
      };
    }
    return {
      pgn: 65379,
      src: message.source,
      count: 1,
      message: 'Unknown Proprietary',
      canmessage: CANMessage.dumpMessage(message),
      manufacturerCode: (f1 >> 5) & 0x07ff,
      reserved1: (f1 >> 3) & 0x03,
      industry: (f1) & 0x07,
    };
  }
}

class PGN65384 extends CANMessage {
  // not verified
  fromMessage(message) {
    const f1 = this.get2ByteUInt(message, 0);
    if ((((f1 >> 5) & 0x07ff === 1851) && ((f1) & 0x07 === 4))) {
      return {
        pgn: 65384,
        src: message.source,
        count: 1,
        message: 'Raymarine Seatalk Pilot Heading 3',
        canmessage: CANMessage.dumpMessage(message),
        manufacturerCode: (f1 >> 5) & 0x07ff, // should be 1851 === Raymarine
        reserved1: (f1 >> 3) & 0x03,
        industry: (f1) & 0x07, // should be 4
        // rest is unknown.
      };
    }
    return {
      pgn: 65384,
      src: message.source,
      count: 1,
      message: 'Unknown Proprietary',
      canmessage: CANMessage.dumpMessage(message),
      manufacturerCode: (f1 >> 5) & 0x07ff,
      reserved1: (f1 >> 3) & 0x03,
      industry: (f1) & 0x07,
    };
  }
}

class PGN61184 extends CANMessage {
  // not verified
  fromMessage(message) {
    return {
      pgn: 61184,
      src: message.source,
      count: 1,
      message: 'Raymarine Seatalk Wireless keypad',
      info: 'not decoded',
    };
  }
}

const register = (pgnRegistry) => {
  pgnRegistry[126720] = new PGN126720();
  pgnRegistry[126992] = new PGN126992();
  pgnRegistry[127237] = new PGN127237();
  pgnRegistry[127245] = new PGN127245();
  pgnRegistry[127250] = new PGN127250();
  pgnRegistry[127251] = new PGN127251();
  pgnRegistry[127257] = new PGN127257();
  pgnRegistry[127258] = new PGN127258();
  pgnRegistry[127506] = new PGN127506();
  pgnRegistry[128259] = new PGN128259();
  pgnRegistry[128267] = new PGN128267();
  pgnRegistry[128275] = new PGN128275();
  pgnRegistry[129026] = new PGN129026();
  pgnRegistry[129025] = new PGN129025();
  pgnRegistry[129029] = new PGN129029();
  pgnRegistry[129283] = new PGN129283();
  pgnRegistry[129539] = new PGN129539();
  pgnRegistry[130306] = new PGN130306();
  pgnRegistry[130310] = new PGN130310();
  pgnRegistry[130311] = new PGN130311();
  pgnRegistry[130313] = new PGN130313();
  pgnRegistry[130314] = new PGN130314();
  pgnRegistry[130315] = new PGN130315();
  pgnRegistry[130316] = new PGN130316();
  pgnRegistry[130577] = new PGN130577();
  pgnRegistry[130916] = new PGN130916();
  pgnRegistry[65359] = new PGN65359();
  pgnRegistry[65379] = new PGN65379();
  pgnRegistry[65384] = new PGN65384();

  // seatalk wireless keypad.
  pgnRegistry[61184] = new PGN61184();
};

export {
  register,
};
