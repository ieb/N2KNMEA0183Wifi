#pragma once

#include <NMEA2000.h>
#include "N2kTypes.h"
#include "NMEA0183Encoder.h"
#include <time.h>

/**
 * Generates N2K messages in one of 2 forms.
 * Either a text NMEA0183 style format where the values are decided.
 * $IIPGN,xxxx,yyy....zzzz*CC
 *                         ^^ checksum
 *             ^^^^^^^^^^^ fields specific to the pgn
 *        ^^^^ the pgn
 * 
 * $IIPGR,xxxx,sss,lll,xxxxxx*CC
 *                            ^^ checksum
 *                     ^^^^^^ data encoded as hex
 *                 ^^^ number of bytes encoded as hex
 *             ^^^ source of message on can bus
 *        ^^^^ pgn
 * 
 * Binary is Little endian encoded binary as follows
 * 
 * Byte 
 * 0   unsigned char ^
 * 1   uint8_t  message id
 * 2-5 unit32_t pgn
 * 6   unit8_t  source
 * 7,8 uint16_t data length
 * 9-n uint8_t data
 * n+1,n+2 uint16_t crc16 checksum of 0-n
 * 
 */ 

#define PGN_MESSAGE 1

class N2KMessageEncoder : public NMEA0183Encoder {
public:
  N2KMessageEncoder() {};

  using SendBufferCallback=void (*)(unsigned long pgn, const char *, bool binary);
  using CheckPgn=bool (*)(unsigned long pgn);

  void setSendBufferCallback(SendBufferCallback cb) {
    sendCallback = cb;
  };
  void setCheckPgnCallback(CheckPgn cb) {
    checkPgn = cb;
  };

  void sendPGN(const tN2kMsg &N2kMsg);
  void sendBinaryPGN(const tN2kMsg &N2kMsg);


  void send127258( unsigned char SID, uint8_t _source, uint16_t _daysSince1970, double _variation);
  void send127250( unsigned char SID, uint8_t _source, double _deviation, double _variation, uint8_t ref);
  void send127257( unsigned char SID, double _yaw, double _pitch, double _roll);
  void send128259( unsigned char SID, double _waterSpeed, double _groundSpeed, uint8_t SWRT);
  void send128267( unsigned char SID, double _depthBelowTransducer, double _offset, double _range);
  void send128275( uint16_t _daysSince1970, double _secondsSinceMidnight, uint32_t _log, uint32_t _tripLog );
  void send129029( unsigned char SID, uint16_t _daysSince1970, double _secondsSinceMidnight, 
                               double _latitude, double _longitude, double _altitude,
                         uint8_t _GNSStype, uint8_t _GNSSmethod,
                        uint8_t _nSatellites, double _HDOP, double _PDOP, double _geoidalSeparation,
                     uint8_t _nReferenceStations, uint8_t _referenceStationType, uint16_t _referenceSationID,
                     double _ageOfCorrection, uint8_t _integrety);

  void send129026(  unsigned char SID, uint8_t _ref, double _cog, double _sog);
  void send129283( unsigned char SID, uint8_t _XTEMode, uint8_t _navigationTerminated, double _xte);
  void send130306( unsigned char SID, double _windSpeed, double _windAngle, uint8_t _windReference);
  void send130312( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double _actualTemperature, double _setTemperature);
  void send130316( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double _actualTemperature, double _setTemperature);
  void send130314( unsigned char SID, uint8_t _pressureInstance,
                  uint8_t _pressureSource, double _pressure);
  void send127488( uint8_t _engineInstance, double _engineSpeed,
                  double _engineBoostPressure, double _engineTiltTrim);
  void send127489( uint8_t _engineInstance, double _engineOilPress,
                  double _engineOilTemp, double _engineCoolantTemp, double _altenatorVoltage,
                  double _fuelRate, double _engineHours, double _engineCoolantPress, double _engineFuelPress,
                  int8_t _engineLoad, int8_t _engineTorque,
                  uint16_t _status1, uint16_t _status2);\
  void send127245(double _rudderPosition, uint8_t _instance,
                     uint8_t _rudderDirectionOrder, uint8_t _angleOrder);

  void send127505( uint8_t _instance, uint8_t _fluidType, double _level, double _capacity);
  void send127508(unsigned char SID, uint8_t _batteryInstance, double _batteryVoltage, double _batteryCurrent,
                  double _batteryTemperature);
  void send128000( unsigned char SID, double _leeway);
  void send129025( double _latitude, double _longitude);
  void send130310( unsigned char SID, double _waterTemperature,
                   double _outsideAmbientAirTemperature, double _atmosphericPressure);
  void send130311( unsigned char SID, uint8_t _tempSource, double _temperature,
                     uint8_t _humiditySource, double _humidity, double _atmosphericPressure);
  void send130313( unsigned char SID, uint8_t _humidityInstance,
                       uint8_t _humiditySource, double _actualHumidity, double _setHumidity);


private:
  SendBufferCallback sendCallback = NULL;
  CheckPgn checkPgn = NULL;

  uint16_t crc16(const uint8_t *array, 
        uint16_t length, 
        bool finish=false, uint16_t crc=0xffff );




};







