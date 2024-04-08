#pragma once

#include <NMEA2000.h>
#include "N2kTypes.h"
#include <time.h>



#define INBUF_LEN 20
#define OUTBUF_LEN 255

class NMEA0183Encoder {
public:
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

  bool doSend(unsigned long &lastSend, unsigned long minPeriod);

private:
  uint8_t p = 0;
  char buffer[OUTBUF_LEN];
  char inbuffer[INBUF_LEN];
  const char * asHex = "0123456789ABCDEF";
  void checkBuffer(const char * message);

};






