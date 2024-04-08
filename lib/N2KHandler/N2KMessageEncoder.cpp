#include "N2KMessageEncoder.h"

/**
 * Form the buffer to allow sending rawp PGNs.
 */ 
void N2KMessageEncoder::sendPGN(const tN2kMsg &N2kMsg) {
    if ( checkPgn(N2kMsg.PGN)) {
        start("$IIPGR");
        append((uint32_t)N2kMsg.PGN);
        append(N2kMsg.Source);
        appendBinary(&N2kMsg.Data[0], N2kMsg.DataLen);
        sendCallback(N2kMsg.PGN, end());

    }
} 



void N2KMessageEncoder::send127258( unsigned char SID, uint8_t _source, uint16_t _daysSince1970, double _variation) {
    uint32_t pgn = 127258UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(_source);
        append(_daysSince1970);
        append(_variation,1.0,4);
        sendCallback(pgn, end());
    }

}
void N2KMessageEncoder::send127250( unsigned char SID, uint8_t _source, double _deviation, double _variation, uint8_t ref) {
    uint32_t pgn = 127250UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_source);
        append(_deviation,1.0,4);
        append(_variation,1.0,4);
        append(ref);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send127257( unsigned char SID, double _yaw, double _pitch, double _roll) {
    uint32_t pgn = 127257UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append((uint32_t)pgn);
        append(SID);
        append(_yaw,1.0,4);
        append(_pitch,1.0,4);
        append(_roll,1.0,4);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send128259( unsigned char SID, double _waterSpeed, double _groundSpeed, uint8_t  SWRT) {
    uint32_t pgn = 128259;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_waterSpeed,1.0,2);
        append(_groundSpeed,1.0,2);
        append(SWRT);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send128267( unsigned char SID, double _depthBelowTransducer, double _offset, double _range) {
    uint32_t pgn = 128267;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_depthBelowTransducer,1.0,2);
        append(_offset,1.0,2);
        append(_range,1.0,2);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send128275( uint16_t _daysSince1970, double _secondsSinceMidnight, uint32_t _log, uint32_t _tripLog ) {
    uint32_t pgn = 128275;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(_daysSince1970);
        append(_secondsSinceMidnight,1.0,2);
        append(_log,1.0,2);
        append(_tripLog,1.0,2);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send129029(  unsigned char SID, uint16_t _daysSince1970, double _secondsSinceMidnight, 
                               double _latitude, double _longitude, double _altitude,
                         uint8_t _GNSStype, uint8_t _GNSSmethod,
                        uint8_t _nSatellites, double _HDOP, double _PDOP, double _geoidalSeparation,
                     uint8_t _nReferenceStations, uint8_t _referenceStationType, uint16_t _referenceSationID,
                     double _ageOfCorrection, uint8_t _integrety) {
    uint32_t pgn = 129029UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_daysSince1970);
        append(_secondsSinceMidnight,1.0,2);
        append(_latitude,1.0,8);
        append(_altitude,1.0,2);
        append(_GNSStype);
        append(_GNSSmethod);
        append(_nSatellites);
        append(_HDOP,1.0,3);
        append(_PDOP,1.0,3);
        append(_geoidalSeparation,1.0,3);
        append(_nReferenceStations);
        append(_referenceStationType);
        append(_referenceSationID);
        append(_ageOfCorrection,1.0,2);
        append(_integrety);
        sendCallback(pgn, end());
    }

}
void N2KMessageEncoder::send129026( unsigned char SID, uint8_t _ref, double _cog, double _sog) {
    uint32_t pgn = 129026UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_ref);
        append(_cog,1.0,3);
        append(_sog,1.0,2);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send129283( unsigned char SID, uint8_t _XTEMode, uint8_t _navigationTerminated, double _xte) {
    uint32_t pgn = 129283UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_XTEMode);
        append(_navigationTerminated);
        append(_xte,1.0,2);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130306( unsigned char SID, double _windSpeed, double _windAngle, uint8_t _windReference) {
    uint32_t pgn = 130306UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_windSpeed,1.0,2);
        append(_windAngle,1.0,4);
        append(_windReference);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130312( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double _actualTemperature, double _setTemperature) {
    uint32_t pgn = 130312UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_tempInstance);
        append(_tempSource);
        append(_actualTemperature,1.0,1);
        append(_setTemperature,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130316( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double _actualTemperature, double _setTemperature) {
    uint32_t pgn = 130316UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_tempInstance);
        append(_tempSource);
        append(_actualTemperature,1.0,1);
        append(_setTemperature,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130314( unsigned char SID, uint8_t _pressureInstance,
                  uint8_t _pressureSource, double _pressure) {
    uint32_t pgn = 130314UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_pressureInstance);
        append(_pressureSource);
        append(_pressure,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send127488( uint8_t _engineInstance, double _engineSpeed,
                  double _engineBoostPressure, double _engineTiltTrim) {
    uint32_t pgn = 127488UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(_engineInstance);
        append(_engineSpeed,1.0,1);
        append(_engineBoostPressure,1.0,1);
        append(_engineTiltTrim,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send127489( uint8_t _engineInstance, double _engineOilPress,
                  double _engineOilTemp, double _engineCoolantTemp, double _altenatorVoltage,
                  double _fuelRate, double _engineHours, double _engineCoolantPress, double _engineFuelPress,
                  int8_t _engineLoad, int8_t _engineTorque,
                  uint16_t _status1, uint16_t _status2) {
    uint32_t pgn = 127489UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(_engineInstance);
        append(_engineOilPress,1.0,1);
        append(_engineOilTemp,1.0,1);
        append(_engineCoolantTemp,1.0,1);
        append(_altenatorVoltage,1.0,2);
        append(_engineLoad);
        append(_engineHours,1.0,2);
        append(_engineCoolantPress,1.0,1);
        append(_engineFuelPress,1.0,1);
        append(_status1);
        append(_status2);
        sendCallback(pgn, end());
    }

}
void N2KMessageEncoder::send127505(  uint8_t _instance, uint8_t _fluidType, double _level, double _capacity ) {
    uint32_t pgn = 127505UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(_instance);
        append(_fluidType);
        append(_level,1.0,2);
        append(_capacity,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send127508(unsigned char SID, uint8_t _batteryInstance, double _batteryVoltage, double _batteryCurrent,
                  double _batteryTemperature) {
    uint32_t pgn = 127508UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(SID);
        append(_batteryInstance);
        append(_batteryVoltage,1.0,2);
        append(_batteryCurrent,1.0,2);
        append(_batteryTemperature,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send128000( unsigned char SID, double _leeway) {
    uint32_t pgn = 128000UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(SID);
        append(_leeway,1.0,2);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send129025( double _latitude, double _longitude) {
    uint32_t pgn = 129025UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);
        append(_latitude,1.0,8);
        append(_latitude,1.0,8);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130310( unsigned char SID, double _waterTemperature,
                   double _outsideAmbientAirTemperature, double _atmosphericPressure) {
    uint32_t pgn = 130310UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(SID);
        append(_waterTemperature,1.0,1);
        append(_outsideAmbientAirTemperature,1.0,1);
        append(_atmosphericPressure,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130311( unsigned char SID, uint8_t _tempSource, double _temperature,
                     uint8_t _humiditySource, double _humidity, double _atmosphericPressure) {
    uint32_t pgn = 130311UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(SID);
        append(_tempSource);
        append(_temperature,1.0,1);
        append(_humiditySource);
        append(_humidity,1.0,3);
        append(_atmosphericPressure,1.0,1);
        sendCallback(pgn, end());
    }
}
void N2KMessageEncoder::send130313( unsigned char SID, uint8_t _humidityInstance,
                       uint8_t _humiditySource, double _actualHumidity, double _setHumidity) {
    uint32_t pgn = 130313UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(SID);
        append(_humidityInstance);
        append(_humiditySource);
        append(_actualHumidity,1.0,3);
        append(_setHumidity,1.0,3);
        sendCallback(pgn, end());
    }
}

void N2KMessageEncoder::send127245(double _rudderPosition, uint8_t _instance,
                     uint8_t _rudderDirectionOrder, uint8_t _angleOrder) {
    uint32_t pgn = 127245UL;
    if ( checkPgn(pgn)) {
        start("$IIPGN");
        append(pgn);\
        append(_rudderPosition,1.0,3);
        append(_instance);
        append(_rudderDirectionOrder);
        append(_angleOrder);
        sendCallback(pgn, end());
    }
}
