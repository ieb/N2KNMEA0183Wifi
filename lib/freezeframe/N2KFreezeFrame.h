/*

Captures state change envents like alarms and stores relevant informaton as a freeze frame on 
ssd for later inspection. This operates as a N2KMessage handler. It will know the time
from N2KMessages, most likely GPS messages. 

The logbook is not suitable since it outputs every 5m and we need to capture the events when they appear,
not all the time.

*/

#pragma once


#include <NMEA2000.h>
#include <N2kTypes.h>
#include <time.h>
#include <SPIFFS.h>




class N2KFreezeFrame  {
public:
    N2KFreezeFrame() {}
    void handle(const tN2kMsg &N2kMsg);
    void logFreezeFrame();
private:
    void evaluateStatus(uint16_t lastStatus, uint16_t newStatus,uint16_t statusMask, uint8_t &bitsSet, uint8_t  &bitsCleared);
    void append(File &f, double v, double scale,  const char * format, double offset = 0.0);
    void append(File &f, uint16_t v);
    uint16_t daysSince1970 = N2kUInt16NA;
    double secondsSinceMidnight = N2kDoubleNA;
    double latitude = N2kDoubleNA;
    double longitude = N2kDoubleNA;
    double log = N2kDoubleNA;
    double engineHours = N2kDoubleNA;
    uint16_t status1=0;
    uint16_t status2=0;
    double engineSpeed = N2kDoubleNA;
    double engineOilPress = N2kDoubleNA;
    double alternatorTemp = N2kDoubleNA;
    double engineCoolantTemp = N2kDoubleNA;
    double altenatorVoltage = N2kDoubleNA;
    double exhaustTemp = N2kDoubleNA;
    double engineRoomTemp = N2kDoubleNA;
    double tempSensor1 = N2kDoubleNA;
    double tempSensor2 = N2kDoubleNA;
    double tempSensor3 = N2kDoubleNA;
    double tempSensor4 = N2kDoubleNA;
    double engineBatteryV = N2kDoubleNA;
    double serviceBatteryV = N2kDoubleNA;
    double serviceBatteryA = N2kDoubleNA;
    double serviceBatteryT = N2kDoubleNA;

};
