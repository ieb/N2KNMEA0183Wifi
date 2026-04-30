#pragma once


#include <NMEA2000.h>
#include <N2kTypes.h>
#include <time.h>
#include "NMEA0183N2KMessages.h"
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

class FrameFilter;

class N2KHandler  {
public:
  struct NavState {
    double latitude, longitude, cog, sog, variation;
    double heading, depth, awa, aws, stw;
    uint32_t log;
  };

  struct EngineState {
    double rpm;
    double coolantTemp;        // K
    double alternatorTemp;     // K (PGN 127489 oil-temp slot, remapped by N2KEngine)
    double alternatorVolts;    // V
    double oilPressure;        // Pa
    double exhaustTemp;        // K (PGN 130312/130316 source 14)
    double engineRoomTemp;     // K (PGN 130312/130316 source 3)
    double engineBattVolts;    // V (PGN 127508 instance 0)
    double fuelLevel;          // %
    uint32_t engineHours;      // seconds; 0xFFFFFFFF => n/a
    uint16_t status1;          // PGN 127489 discrete status 1; 0xFFFF => n/a
    uint16_t status2;          // PGN 127489 discrete status 2; 0xFFFF => n/a
  };

  N2KHandler( NMEA0183N2KMessages &messageEncoder,
      Performance &performance,
      LogBook &logbook ) :
    messageEncoder{messageEncoder},
    performance{performance},
    logbook{logbook} {}
  void handle(const tN2kMsg &N2kMsg);
  void output(Print *stream);
  NavState getNavState() const;
  bool isNavStateDirty();
  void setCleanNavState();
  EngineState getEngineState();
  bool isEngineStateDirty();
  void setCleanEngineState();

  // Timeout for nav fields. Longest source PGN cadence on the wire is ~1 Hz
  // (128275 log, 127258 variation), so 15 s means ~15 missed messages before
  // we publish NA — long enough to ride out single packet drops but short
  // enough that stale data doesn't linger on the BLE characteristic.
  static constexpr unsigned long NAV_TIMEOUT_MS = 15000;

private:

    NMEA0183N2KMessages &messageEncoder;
    Performance &performance;
    LogBook &logbook;
    // using specific properties vs an array let the compiler detect errors.

    unsigned long faaLastValid=0;
    unsigned long lastCogtUpdate=0;
    unsigned long lastCogmUpdate=0;
    unsigned long lastSogUpdate=0;
    unsigned long lastAwaUpdate=0;
    unsigned long lastAwsUpdate=0;
    unsigned long lastStwUpdate=0;
    unsigned long lastRollUpdate=0;
    unsigned long lastLatLonUpdate=0;
    unsigned long lastVariationUpdate=0;
    unsigned long lastHeadingUpdate=0;
    unsigned long lastDepthUpdate=0;
    unsigned long lastLogUpdate=0;
    unsigned long lastEngineSpeedUpdate=0;
    unsigned long lastEngineCoolantUpdate=0;
    unsigned long lastEngineDynamicUpdate=0;    // shared timeout for all PGN 127489 fields
    unsigned long lastExhaustTempUpdate=0;
    unsigned long lastEngineRoomTempUpdate=0;
    unsigned long lastEngineBattUpdate=0;
    unsigned long lastFuelLevelUpdate=0;
    bool dirtyNavState = false;
    bool dirtyEngineState = false;

    double headingTrue = -1e9;
    double headingMagnetic = -1e9;
    bool faaValid = false;
    bool updatePerformance = false;
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
    double depth = -1e9;
    double roll = -1e9;
    uint16_t daysSince1970 = 0xffff;
    uint32_t log = 0xffffffff;
    uint32_t tripLog = 0xffffffff;
    double pressure = -1e9;
    double engineSpeed = -1e9;
    double engineCoolantTemp = -1e9;
    double engineOilPressure = -1e9;
    double alternatorTemp = -1e9;
    double alternatorVoltage = -1e9;
    double exhaustTemp = -1e9;
    double engineRoomTemp = -1e9;
    double engineBattVoltage = -1e9;
    double fuelLevelPct = -1e9;
    uint32_t engineHoursSec = 0xFFFFFFFFu;
    uint16_t engineStatus1 = 0xFFFF;
    uint16_t engineStatus2 = 0xFFFF;



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
    void handle130312(const tN2kMsg &N2kMsg);
    void handle130316(const tN2kMsg &N2kMsg);
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


    void expireStaleEngineData();
    void expireStaleNavData();

    bool parsePGN129029(const tN2kMsg &N2kMsg, unsigned char &SID, uint16_t &DaysSince1970, double &SecondsSinceMidnight,
                     double &Latitude, double &Longitude, double &Altitude,
                     tN2kGNSStype &GNSStype, tN2kGNSSmethod &GNSSmethod,
                     uint8_t &nSatellites, double &HDOP, double &PDOP, double &GeoidalSeparation,
                     uint8_t &nReferenceStations, tN2kGNSStype &ReferenceStationType, uint16_t &ReferenceSationID,
                     double &AgeOfCorrection, tN2kGNSSIntegrety &Integrety);

    const char * getFaaValid();
    bool updateWithTimeout(double &v, double iv, unsigned long &lastUpdate, unsigned long period);
};


