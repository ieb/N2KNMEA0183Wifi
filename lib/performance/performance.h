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
    float leeway, 
        polarSpeed, 
        polarSpeedRatio, 
        polarVmg, 
        vmg, 
        targetTwa, 
        targetVmg, 
        targetStw, 
        polarVmgRatio,
        windDirectionTrue, 
        windDirectionMagnetic, 
        oppositeTrackHeadingTrue, 
        oppositeTrackHeadingMagnetic, 
        oppositeTrackTrue,
        oppositeTrackMagnetic,
        tws,
        twa;
    float calcPolarSpeed(float twsv, float twav, bool nmea2000Units=true);
    void updateTWSIdx(float tws);
    void updateTWAIdx(float twa);
    void findIndexes(uint8_t v, const uint8_t *a, uint8_t al, int8_t *idx  );
    float interpolateForY(float x, float xl, float xh, float yl, float yh);
    float correctBearing(float b);
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



