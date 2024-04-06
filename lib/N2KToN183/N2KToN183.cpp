
#include "N2KToN183.h"
#include <N2kMessages.h>






// getters for stored values.
double NMEA0183N2KHandler::getHeadingTrue() {
    return headingTrue;
}
double NMEA0183N2KHandler::getHeadingMagnetic() {
  return headingMagnetic;
}
const char *  NMEA0183N2KHandler::getFaaValid() {
  if ( faaValid ) {
    return "A";
  } else {
    return "V";
  }
}
double NMEA0183N2KHandler::getSog() {
  return sog;
}
double NMEA0183N2KHandler::getCogt() {
  return cogt;
}
double NMEA0183N2KHandler::getVariation() {
  return variation;
}


// The standard NMEA2000 function does not return integrty.
bool NMEA0183N2KHandler::parsePGN129029(const tN2kMsg &N2kMsg, unsigned char &SID, uint16_t &DaysSince1970, double &SecondsSinceMidnight,
                     double &Latitude, double &Longitude, double &Altitude,
                     tN2kGNSStype &GNSStype, tN2kGNSSmethod &GNSSmethod,
                     uint8_t &nSatellites, double &HDOP, double &PDOP, double &GeoidalSeparation,
                     uint8_t &nReferenceStations, tN2kGNSStype &ReferenceStationType, uint16_t &ReferenceSationID,
                     double &AgeOfCorrection, tN2kGNSSIntegrety &Integrety
                     ) {
  if (N2kMsg.PGN!=129029L) return false;
  int Index=0;
  unsigned char vb;
  int16_t vi;

  SID=N2kMsg.GetByte(Index);
  DaysSince1970=N2kMsg.Get2ByteUInt(Index);
  SecondsSinceMidnight=N2kMsg.Get4ByteUDouble(0.0001,Index);
  Latitude=N2kMsg.Get8ByteDouble(1e-16,Index);
  Longitude=N2kMsg.Get8ByteDouble(1e-16,Index);
  Altitude=N2kMsg.Get8ByteDouble(1e-6,Index);
  vb=N2kMsg.GetByte(Index); GNSStype=(tN2kGNSStype)(vb & 0x0f); GNSSmethod=(tN2kGNSSmethod)((vb>>4) & 0x0f);
  vb=N2kMsg.GetByte(Index); Integrety=(tN2kGNSSIntegrety)(vb & 0x03); // Integrity 2 bit, reserved 6 bits
  nSatellites=N2kMsg.GetByte(Index);
  HDOP=N2kMsg.Get2ByteDouble(0.01,Index);
  PDOP=N2kMsg.Get2ByteDouble(0.01,Index);
  GeoidalSeparation=N2kMsg.Get4ByteDouble(0.01,Index);
  nReferenceStations=N2kMsg.GetByte(Index);
  if (nReferenceStations!=N2kUInt8NA && nReferenceStations>0) {
    // Note that we return real number of stations, but we only have variabes for one.
    vi=N2kMsg.Get2ByteUInt(Index); ReferenceStationType=(tN2kGNSStype)(vi & 0x0f); ReferenceSationID=(vi>>4);
    AgeOfCorrection=N2kMsg.Get2ByteUDouble(0.01,Index);
  }

  return true;
}



double NMEA0183N2KHandler::updateWithTimeout(double v, double iv, unsigned long &lastUpdate, unsigned long period) {
  unsigned long now = millis();
  if ( iv == -1e9 ) {
    if ( (now - lastUpdate) > 10000 ) {
      return -1e9;
    } else {
      return v;
    }
  } else {
    lastUpdate = now;
    return iv;
  }
}




void NMEA0183N2KHandler::handle(const tN2kMsg &N2kMsg) {
  switch (N2kMsg.PGN) {
    case 127250UL: handle127250(N2kMsg); break; // heading
    case 127257UL: handle127257(N2kMsg); break; // attitude
    case 128259UL: handle128259(N2kMsg); break; // water speed
    case 128267UL: handle128267(N2kMsg); break; // depth
    case 128275UL: handle128275(N2kMsg); break; 
    case 129029UL: handle129029(N2kMsg); break; 
    case 129026UL: handle129026(N2kMsg); break; 
    case 129283UL: handle129283(N2kMsg); break; 
    case 130306UL: handle130306(N2kMsg); break; 
    case 130312UL: handle130312_sea(N2kMsg); break; 
    case 130316UL: handle130316_air(N2kMsg); break; 
    case 130314UL: handle130314_baro(N2kMsg); break; 
    case 127245UL: handle127245(N2kMsg); break; 
    case 127258UL: handle127258(N2kMsg); break;

    //case 127488UL: /* rapid engine data */ break;
    //case 127489UL: /* engine dynamic params */ break;
    //case 127508UL: /* DC Battery status */ break;
    //case 127506UL: /* DC Status */ break;
    //case 130310UL: /* Outside Envronmental Params */ break;
    //case 130311UL: /* Enviromental Params */ break;
    //case 126992UL: /* System Time */ break;
    //case 130313UL: /* Humidity */ break;
    //case 127251UL: /* Rate of Turn */ break;
    //case 126996UL: /* product info */ break;
    //case 126998UL: /* config info */ break;
    //case 126464UL: /* list transmit PGN */ break;
    //case 130315UL: /* set pressure */ break;
    //case 127505UL: /* fluid level */ break;
    //case 126720UL: /* proprietary */ break;
    //case 127237UL: /* headding track control */ break;
    //case 65379UL: /* seapilot mode */ break;
    //case 65384UL: /* ray unknown */ break;
    //case 65359UL: /* pilot heading */ break;
    //case 126993UL: /* heatbeat */ break;
    //case 130916UL: /* ray unknown */ break;
    //default:
    //Serial.print("dropped ");Serial.println(N2kMsg.PGN);
    //  break;

  }
}


/**
 * variation
 */ 
void NMEA0183N2KHandler::handle127258(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kMagneticVariation _source;
  uint16_t _daysSince1970;
  double _variation;
  if ( ParseN2kPGN127258(N2kMsg, SID, _source, _daysSince1970, _variation) ) {
    if (_variation != -1e9 ) {
        variation = _variation;
    }
    // nothing to emit.
  }
}
/**
 * heading
 */
void NMEA0183N2KHandler::handle127250(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference ref;
  double _deviation=0;
  double _variation;
  double _heading = 0;
  if ( ParseN2kPGN127250(N2kMsg, SID, _heading, _deviation, _variation, ref) ) {
    if ( _variation != -1e9 ) {
      variation = _variation;
    }
    if ( ref==N2khr_magnetic ) {
      if ( _heading != -1e9 ) {
        headingMagnetic = _heading;
        if ( variation != -1e9 ) {
          headingTrue = headingMagnetic - variation;
        }
      }

      messageEncoder->sendHDG(_heading, _deviation, _variation);
      messageEncoder->sendHDM(_heading);
    } else {
      // only set if we have no magnetic heading on the bus.
      // normally the message is mag heading.
      if ( _heading != -1e9 && headingMagnetic == -1e9 ) {
        headingTrue = _heading;
        if ( variation != -1e9 ) {
          headingMagnetic =  headingTrue + variation;
        }
      }
      messageEncoder->sendHDT(_heading);

    }
  }
}


/**
 * attitude
 */ 
void NMEA0183N2KHandler::handle127257(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _yaw=0;
  double _pitch=0;
  double _roll=0;
  if ( ParseN2kPGN127257(N2kMsg, SID, _yaw, _pitch, _roll) ) {
    messageEncoder->sendXDR_roll(_roll);
  }
}

/**
 * water speed.
 */ 
void NMEA0183N2KHandler::handle128259(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _waterSpeed;
  double _groundSpeed;
  tN2kSpeedWaterReferenceType SWRT;

  if ( ParseN2kPGN128259(N2kMsg,SID,_waterSpeed,_groundSpeed,SWRT) ) {
    messageEncoder->sendVHW(getHeadingTrue(), getHeadingMagnetic(), _waterSpeed );
  }
}


/**
 * depth
 */ 
void NMEA0183N2KHandler::handle128267(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  double _depthBelowTransducer;
  double _offset;
  double _range;

  if ( ParseN2kPGN128267(N2kMsg,SID,_depthBelowTransducer,_offset,_range) ) {
    messageEncoder->sendDBT(_depthBelowTransducer);
    messageEncoder->sendDPT(_depthBelowTransducer, _offset);
  }
}

/**
 * log
 */ 
void NMEA0183N2KHandler::handle128275(const tN2kMsg &N2kMsg) {
  uint16_t _daysSince1970;
  double _secondsSinceMidnight; 
  uint32_t _log;
  uint32_t _tripLog;

  if ( ParseN2kPGN128275(N2kMsg, _daysSince1970, _secondsSinceMidnight, _log, _tripLog) ) {
    messageEncoder->sendVLW(_log, _tripLog);
  }
}


/*
 * gnss
 */
void NMEA0183N2KHandler::handle129029(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  uint16_t _daysSince1970;
  double _secondsSinceMidnight;
  double _latitude;
  double _longitude;
  double _altitude;
  tN2kGNSStype _GNSStype;
  tN2kGNSSmethod _GNSSmethod;
  unsigned char _nSatellites; 
  double _HDOP;
  double _PDOP;
  double _geoidalSeparation;
  unsigned char _nReferenceStations;
  tN2kGNSStype _referenceStationType;
  tN2kGNSSIntegrety _integrety;
  uint16_t _referenceSationID;
  double _ageOfCorrection;



  if( parsePGN129029(N2kMsg, SID, _daysSince1970, _secondsSinceMidnight,
                     _latitude, _longitude, _altitude,
                     _GNSStype, _GNSSmethod,
                     _nSatellites, _HDOP, _PDOP, _geoidalSeparation,
                     _nReferenceStations, _referenceStationType, _referenceSationID,
                     _ageOfCorrection,
                     _integrety
                     ) ) {

    unsigned long now = millis();
    if ( _integrety == N2kGNSSIntegrety_Safe ) {
      faaValid = true;
      faaLastValid = now;
      fixSecondsSinceMidnight = _secondsSinceMidnight;
      latitude = _latitude;
      longitude = _longitude;
    } else if ( now - faaLastValid > 5000 ) {
      faaValid = false;
      fixSecondsSinceMidnight = _secondsSinceMidnight;
      latitude = _latitude;
      longitude = _longitude;
    }

    messageEncoder->sendGGA(fixSecondsSinceMidnight, latitude, longitude, (uint8_t)_GNSSmethod, 
        (uint8_t)_nSatellites, _HDOP, _altitude, _geoidalSeparation);
    messageEncoder->sendGLL(fixSecondsSinceMidnight, latitude, longitude, getFaaValid());
    messageEncoder->sendZDA( _secondsSinceMidnight, _daysSince1970);
    messageEncoder->sendRMC(fixSecondsSinceMidnight, latitude, longitude, getSog(), getCogt(), 
      _daysSince1970, getVariation(), getFaaValid() );
  }
}


/**
 * rapid cog/sog
 */
void NMEA0183N2KHandler::handle129026(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  tN2kHeadingReference _ref;
  double _cog;
  double _sog;


  if ( ParseN2kPGN129026(N2kMsg, SID, _ref, _cog, _sog) ) {
    double _cogm = -1e9;
    double _cogt = -1e9;
    double variation = getVariation();
    if ( _cog != -1e9 ) {
      if ( _ref == N2khr_magnetic) {
        _cogm=_cog;
        if ( variation != -1e9 ) {
          _cogt = _cog - variation;
        }
      } else {
        _cogt = _cog;
        if ( variation != -1e9 ) {
          _cogm = _cog + variation;
        }
      }
    }

    // update the stored value value
    // only set the stored value to -1e9 after 10s.
    // cog and sog can stop updating independently.

    cogt = updateWithTimeout(cogt, _cogt, lastCogtUpdate, 10000);
    cogm = updateWithTimeout(cogm, _cogm, lastCogmUpdate, 10000);
    sog = updateWithTimeout(sog, _sog, lastSogUpdate, 10000);
    messageEncoder->sendVTG(cogt, cogm, sog, getFaaValid());
  }
}


/**
 * xte
 */
void NMEA0183N2KHandler::handle129283(const tN2kMsg &N2kMsg) {
  unsigned char SID; 
  tN2kXTEMode _XTEMode; 
  bool _navigationTerminated; 
  double _xte;

  if ( ParseN2kPGN129283(N2kMsg, SID, _XTEMode, _navigationTerminated, _xte) ) {
    messageEncoder->sendXTE(_xte, getFaaValid());
  }
}

/**
 * wind
 */
void NMEA0183N2KHandler::handle130306(const tN2kMsg &N2kMsg) {
  unsigned char SID; 
  double _windSpeed; 
  double _windAngle;
  tN2kWindReference _windReference;

  if ( ParseN2kPGN130306(N2kMsg, SID, _windSpeed, _windAngle, _windReference) ) {
    if ( _windReference == N2kWind_Apparent ) {
      messageEncoder->sendVWR(_windAngle, _windSpeed);
      messageEncoder->sendMVR(_windAngle, _windSpeed);
    } else {
      messageEncoder->sendVWT(_windAngle, _windSpeed);
      messageEncoder->sendMVT(_windAngle, _windSpeed);
    }
  }
}


/**
 * sea temperature
 */
void NMEA0183N2KHandler::handle130312_sea(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  unsigned char _tempInstance; 
  tN2kTempSource _tempSource;
  double _actualTemperature;
  double _setTemperature;

  if ( ParseN2kPGN130312(N2kMsg, SID, _tempInstance, _tempSource,
                   _actualTemperature, _setTemperature) ) {
    if ( _tempSource == N2kts_SeaTemperature) {
      messageEncoder->sendMTW(_actualTemperature);
    }
  }
}

/**
 * air temperature
 */
void NMEA0183N2KHandler::handle130316_air(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  unsigned char _tempInstance; 
  tN2kTempSource _tempSource;
  double _actualTemperature;
  double _setTemperature;


  if ( ParseN2kPGN130316(N2kMsg, SID, _tempInstance, _tempSource,
                   _actualTemperature, _setTemperature) ) {
    if ( _tempSource == N2kts_MainCabinTemperature) {
      messageEncoder->sendXDR_airtemp(_actualTemperature);
      messageEncoder->sendMTA(_actualTemperature);
    }
  }
}
void NMEA0183N2KHandler::handle130314_baro(const tN2kMsg &N2kMsg) {
  unsigned char SID;
  unsigned char _pressureInstance;
  tN2kPressureSource _pressureSource;
  double _pressure;
  if( ParseN2kPGN130314(N2kMsg, SID, _pressureInstance,
                     _pressureSource, _pressure) ) {
    if ( _pressureSource == N2kps_Atmospheric ) {
      messageEncoder->sendXDR_barometer(_pressure);
    }
  }
}

void NMEA0183N2KHandler::handle127245(const tN2kMsg &N2kMsg) {
  double _rudderPosition;
  unsigned char _instance;
  tN2kRudderDirectionOrder _rudderDirectionOrder;
  double _angleOrder;

  if ( ParseN2kPGN127245(N2kMsg, _rudderPosition, _instance,
                     _rudderDirectionOrder, _angleOrder) ) {
      messageEncoder->sendRSA(_rudderPosition);
  }
}







