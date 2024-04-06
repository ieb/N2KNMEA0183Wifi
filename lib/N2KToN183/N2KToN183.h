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
    send = cb;
  };


private:
  SendBufferCallback send;

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


  bool doSend(unsigned long &lastSend, unsigned long minPeriod);
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

  void checkBuffer(const char * message);

};




// the NMEA2000 lib doesn't have GNSS integrity.
// my GNSS module based on a Ublox8 emits it.
// Other GNSS NMEA2000 seem unreliable in this area.
enum tN2kGNSSIntegrety {         
  N2kGNSSIntegrety_None=0, 
  N2kGNSSIntegrety_Safe=1,
  N2kGNSSIntegrety_Caution=2,
  N2kGNSSIntegrety_Unsafe=3
};





class NMEA0183N2KHandler  {
public:
  NMEA0183N2KHandler(NMEA0183N2KMessages * messageEncoder) : messageEncoder{messageEncoder} {};
  void handle(const tN2kMsg &N2kMsg);

 
private:

    NMEA0183N2KMessages * messageEncoder;
    // using specific properties vs an array let the compiler detect errors.

    unsigned long faaLastValid=0;
    unsigned long lastCogtUpdate=0;
    unsigned long lastCogmUpdate=0;
    unsigned long lastSogUpdate=0;

    double headingTrue = -1e9;
    double headingMagnetic = -1e9;
    bool faaValid = false;
    double sog;
    double cogt;
    double cogm;
    double variation;
    double fixSecondsSinceMidnight;
    double latitude;
    double longitude;

    void handle127258(const tN2kMsg &N2kMsg);

    void handle127250(const tN2kMsg &N2kMsg);
    void handle127257(const tN2kMsg &N2kMsg);
    void handle128259(const tN2kMsg &N2kMsg);
    void handle128267(const tN2kMsg &N2kMsg);
    void handle128275(const tN2kMsg &N2kMsg);
    void handle129029(const tN2kMsg &N2kMsg);
    void handle129026(const tN2kMsg &N2kMsg);
    void handle129283(const tN2kMsg &N2kMsg);
    void handle130306(const tN2kMsg &N2kMsg);
    void handle130312_sea(const tN2kMsg &N2kMsg);
    void handle130316_air(const tN2kMsg &N2kMsg);
    void handle130314_baro(const tN2kMsg &N2kMsg);
    void handle127245(const tN2kMsg &N2kMsg);

    bool parsePGN129029(const tN2kMsg &N2kMsg, unsigned char &SID, uint16_t &DaysSince1970, double &SecondsSinceMidnight,
                     double &Latitude, double &Longitude, double &Altitude,
                     tN2kGNSStype &GNSStype, tN2kGNSSmethod &GNSSmethod,
                     uint8_t &nSatellites, double &HDOP, double &PDOP, double &GeoidalSeparation,
                     uint8_t &nReferenceStations, tN2kGNSStype &ReferenceStationType, uint16_t &ReferenceSationID,
                     double &AgeOfCorrection, tN2kGNSSIntegrety &Integrety);

    double getHeadingTrue();
    double getHeadingMagnetic();
    const char * getFaaValid();
    double getSog();
    double getCogt();
    double getVariation();
    double updateWithTimeout(double v, double iv, unsigned long &lastUpdate, unsigned long period);

};




