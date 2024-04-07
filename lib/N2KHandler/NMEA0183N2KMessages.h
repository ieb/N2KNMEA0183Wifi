#pragma once

#include <NMEA2000.h>
#include "N2kTypes.h"
#include <time.h>



#define INBUF_LEN 20
#define OUTBUF_LEN 255

class NMEA0183N2KMessages {
public:
  NMEA0183N2KMessages() {};
  void sendHDG(double heading, double deviation, double variation);
  void sendHDM(double heading);
  void sendHDT(double heading);
  void sendXDR_roll(double roll);
  void sendVHW( double headingTrue, double headingMagnetic, double waterSpeed);
  void sendDBT( double depthBelowTransducer);
  void sendDPT(double depthBelowTransducer, double offset);
  void sendVLW(double log, double tripLog);


  void sendGGA(double fixSecondsSinceMidnight, 
      double latitude, double longitude,
      uint8_t GNSSmethod, uint8_t nSatellites, 
      double HDOP, double  altitude, double geoidalSeparation);

  void sendGLL(double secondsSinceMidnight, 
      double latitude, double longitude, const char * faaValid);
  void sendZDA( double secondsSinceMidnight, uint16_t daysSince1970);
  void sendRMC(double secondsSinceMidnight, 
    double latitude, double longitude, double sog, double cogt, uint16_t daysSince1970,
    double variation, const char * faaValid );
  void sendVTG(double cogt, double cogm, double sog, const char * faaValid);
  void sendXTE(double xte, const char * faaValid);
  void sendVWR( double windAngle, double windSpeed );
  void sendMVR( double windAngle, double windSpeed );
  void sendVWT( double windAngle, double windSpeed);
  void sendMVT( double windAngle, double windSpeed);
  void sendMTW(double temperature);
  void sendXDR_airtemp(double temperature);
  void sendMTA(double temperature);
  void sendXDR_barometer(double pressure);
  void sendRSA(double rudderPosition);

  using SendBufferCallback=void (*)(const char *);

  void setSendBufferCallback(SendBufferCallback cb) {
    sendCallback = cb;
  };

  void start(const char * key);
  void append(const char *field);
  void append(int field);
  void append(double value, double factor=1.0, uint8_t fixed=1);
  void appendBearing(double bearing, uint8_t fixed=1);
  void appendRelativeAngle(double angle, const char * pos, const char * neg, uint8_t fixed=1);
  void appendRelativeSignedAngle(double angle, uint8_t fixed=1);
  void appendTimeUTC(double secondsSinceMidnight);
  void appendLatitude(double latitude);
  void appendLongitude(double longitude);
  void appendDMY(uint16_t daysSince1970);
  void appendDate(uint16_t daysSince1970);
  const char * end();
  void send();

  bool doSend(unsigned long &lastSend, unsigned long minPeriod);

private:
  SendBufferCallback sendCallback;

  unsigned long lastSendHDG=0;
  unsigned long lastSendHDM=0;
  unsigned long lastSendHDT=0;
  unsigned long lastSendXDR_roll=0;
  unsigned long lastSendVHW=0;
  unsigned long lastSendDBT=0;
  unsigned long lastSendDPT=0;
  unsigned long lastSendVLW=0;
  unsigned long lastSendGGA=0;
  unsigned long lastSendGGL=0;
  unsigned long lastSendZDA=0;
  unsigned long lastSendRMC=0;
  unsigned long lastSendVTG=0;
  unsigned long lastSendXTE=0;
  unsigned long lastSendVWR=0;
  unsigned long lastSendMWVR=0;
  unsigned long lastSendVWT=0;
  unsigned long lastSendMVWT=0;
  unsigned long lastSendMWT=0;
  unsigned long lastSendXDR_air=0;
  unsigned long lastSendMTA=0;
  unsigned long lastSendXDR_baro=0;
  unsigned long lastSendRSA=0;
  uint8_t p = 0;
  char buffer[OUTBUF_LEN];
  char inbuffer[INBUF_LEN];
  const char * asHex = "0123456789ABCDEF";



  void checkBuffer(const char * message);

};







