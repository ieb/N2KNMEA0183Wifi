#pragma once


#include <NMEA2000.h>
#include <N2kTypes.h>
#include <time.h>
#include "NMEA0183N2KMessages.h"
#include "N2KMessageEncoder.h"
#include "performance.h"
#include "logbook.h"

/**
 * Handles N2KMessages, parsing converting and emitting.
 */ 



// the NMEA2000 lib doesn't have GNSS integrity.
// my GNSS module based on a Ublox8 emits it.
// Other GNSS NMEA2000 seem unreliable in this area.
enum tN2kGNSSIntegrety {         
  N2kGNSSIntegrety_None=0, 
  N2kGNSSIntegrety_Safe=1,
  N2kGNSSIntegrety_Caution=2,
  N2kGNSSIntegrety_Unsafe=3
};





class N2KHandler  {
public:
  N2KHandler(NMEA0183N2KMessages * messageEncoder, 
      N2KMessageEncoder * pgnEncoder, 
      Performance * performance,
      LogBook * logbook ) : 
    messageEncoder{messageEncoder}, 
    pgnEncoder{pgnEncoder},
    performance{performance},
    logbook{logbook}
    {};
  void handle(const tN2kMsg &N2kMsg);

 
private:

    NMEA0183N2KMessages * messageEncoder;
    N2KMessageEncoder * pgnEncoder;
    Performance * performance;
    LogBook * logbook;
    // using specific properties vs an array let the compiler detect errors.

    unsigned long faaLastValid=0;
    unsigned long lastCogtUpdate=0;
    unsigned long lastCogmUpdate=0;
    unsigned long lastSogUpdate=0;
    unsigned long lastAwaUpdate=0;
    unsigned long lastAwsUpdate=0;
    unsigned long lastStwUpdate=0;
    unsigned long lastRollUpdate=0;
    unsigned long lastEngineSpeedUpdate=0;
    unsigned long lastEngineCoolantUpdate=0;

    double headingTrue = -1e9;
    double headingMagnetic = -1e9;
    bool faaValid = false;
    double sog = -1e9;
    double cogt = -1e9;
    double cogm = -1e9;
    double variation = -1e9;
    double fixSecondsSinceMidnight = -1e9;
    double latitude = -1e9;
    double longitude = -1e9;
    double aparentWindAngle = -1e9;
    double aparentWindSpeed = -1e9;
    double waterSpeed = -1e9;
    double roll = -1e9;
    uint16_t daysSince1970 = 0xffff;
    uint32_t log = 0xffffffff;
    uint32_t tripLog = 0xffffffff;
    double pressure = -1e9;
    double engineSpeed = -1e9;
    double engineCoolantTemp = -1e9;



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
    void handle127488(const tN2kMsg &N2kMsg);
    void handle127489(const tN2kMsg &N2kMsg);
    void handle127505(const tN2kMsg &N2kMsg);
    void handle127508(const tN2kMsg &N2kMsg);
    void handle128000(const tN2kMsg &N2kMsg);
    void handle129025(const tN2kMsg &N2kMsg);
    void handle130310(const tN2kMsg &N2kMsg);
    void handle130311(const tN2kMsg &N2kMsg);
    void handle130313(const tN2kMsg &N2kMsg);


    bool parsePGN129029(const tN2kMsg &N2kMsg, unsigned char &SID, uint16_t &DaysSince1970, double &SecondsSinceMidnight,
                     double &Latitude, double &Longitude, double &Altitude,
                     tN2kGNSStype &GNSStype, tN2kGNSSmethod &GNSSmethod,
                     uint8_t &nSatellites, double &HDOP, double &PDOP, double &GeoidalSeparation,
                     uint8_t &nReferenceStations, tN2kGNSStype &ReferenceStationType, uint16_t &ReferenceSationID,
                     double &AgeOfCorrection, tN2kGNSSIntegrety &Integrety);

    const char * getFaaValid();
    bool updateWithTimeout(double &v, double iv, unsigned long &lastUpdate, unsigned long period);

};




