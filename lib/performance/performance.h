#pragma once


#include <NMEA2000.h>
#include <N2kMessages.h>
#include "NMEA0183N2KMessages.h"

/*
 * This contains performance data derived 
 * from other values. There is only 1 instance of this.
 */

class Performance {
public:
    Performance(NMEA0183N2KMessages * messageEncoder): messageEncoder{messageEncoder} {};
    // float is used because there double trig on a esp32 is performed in software not hardware.
    void update(float awa, float aws, float stw, float roll, float hdm, float variation );
private:
    NMEA0183N2KMessages * messageEncoder;
    float leeway = -1e9; 
    float polarSpeed = -1e9; 
    float polarSpeedRatio = -1e9; 
    float polarVmg = -1e9; 
    float vmg = -1e9; 
    float targetTwa = -1e9; 
    float targetVmg = -1e9; 
    float targetStw = -1e9; 
    float polarVmgRatio = -1e9; 
    float windDirectionTrue = -1e9; 
    float windDirectionMagnetic = -1e9; 
    float oppositeTrackHeadingTrue = -1e9; 
    float oppositeTrackHeadingMagnetic = -1e9; 
    float oppositeTrackTrue = -1e9; 
    float oppositeTrackMagnetic = -1e9; 
    float tws = -1e9; 
    float twa = -1e9;
    float calcPolarSpeed(float twsv, float twav, bool nmea2000Units=true);
    void updateTWSIdx(float tws);
    void updateTWAIdx(float twa);
    void findIndexes(uint8_t v, const uint8_t *a, uint8_t al, int8_t *idx  );
    float interpolateForY(float x, float xl, float xh, float yl, float yh);
    float correctBearing(float b);
    float correctAngle(float b);
    uint8_t lastTWSV = 0;
    uint8_t lastTWAV = 0;
    int8_t twaidx[2] = {0,0};
    int8_t twsidx[2] = {0,0};
    unsigned long lastCaculation = 0;
    unsigned long lastSendKEP01 = 0;
    unsigned long lastSendKEP02 = 0;
    unsigned long lastSendKEP03 = 0;
    unsigned long lastSendKEP99 = 0;
    unsigned long lastSendNWVTrue = 0;


};



