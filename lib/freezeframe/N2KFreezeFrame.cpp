
#include "N2KFreezeFrame.h"
#include <TimeLib.h>

// adjust to only freeze frame specific bits
#define STATUS1_MASK 0xffff
#define STATUS2_MASK 0xffff

void N2KFreezeFrame::handle(const tN2kMsg &N2kMsg) {
    int i = 0;
    uint8_t set = 0;
    uint8_t cleared = 0;
    uint16_t _status1 = 0;
    uint16_t _status2 = 0;
    
    switch(N2kMsg.PGN) {
    case 129029UL: // possition
        N2kMsg.GetByte(i);
        daysSince1970=N2kMsg.Get2ByteUInt(i);
        secondsSinceMidnight=N2kMsg.Get4ByteUDouble(0.0001,i);
        latitude=N2kMsg.Get8ByteDouble(1e-16,i);
        longitude=N2kMsg.Get8ByteDouble(1e-16,i);
        break;
    case 128275UL: // log trip
        N2kMsg.Get2ByteUInt(i);
        N2kMsg.Get4ByteUDouble(0.0001,i);
        log=N2kMsg.Get4ByteUDouble(1,i);
        break;
    case 127488UL: // rapid engine update
        N2kMsg.GetByte(i);
        engineSpeed=N2kMsg.Get2ByteUDouble(0.25,i);
        break;
    case 127489UL: // engine dynamic params
        N2kMsg.GetByte(i);
        engineOilPress = N2kMsg.Get2ByteUDouble(100, i);
        alternatorTemp  = N2kMsg.Get2ByteUDouble(0.1, i);
        engineCoolantTemp = N2kMsg.Get2ByteUDouble(0.01, i);
        altenatorVoltage = N2kMsg.Get2ByteDouble(0.01, i);
        N2kMsg.Get2ByteDouble(0.1, i);
        engineHours = N2kMsg.Get4ByteUDouble(1, i);
        N2kMsg.Get2ByteUDouble(100, i);
        N2kMsg.Get2ByteUDouble(1000, i);
        N2kMsg.GetByte(i);  // reserved
        _status1 = N2kMsg.Get2ByteUInt(i);  // Discrete Status 1
        _status2 = N2kMsg.Get2ByteUInt(i);  // Discrete Status 2


        evaluateStatus(status1, _status1, STATUS1_MASK, set, cleared);
        evaluateStatus(status2, _status2, STATUS2_MASK, set, cleared);
        status1 = _status1;
        status2 = _status2;
        if ( set != 0) {
            logFreezeFrame();
        }
        break;
    case 130312UL: // temperatures
        N2kMsg.GetByte(i);
        N2kMsg.GetByte(i);
        switch(N2kMsg.GetByte(i)) {
            case 14: exhaustTemp = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 3: engineRoomTemp = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 30: alternatorTemp = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 31: tempSensor1 = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 32: tempSensor2 = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 33: tempSensor3 = N2kMsg.Get2ByteUDouble(0.01,i); break;
            case 34: tempSensor4 = N2kMsg.Get2ByteUDouble(0.01,i); break;
        }
        break;
    case 127508UL: // dc voltages
        switch(N2kMsg.GetByte(i)) {
            case 0: 
                engineBatteryV = N2kMsg.Get2ByteDouble(0.01,i); 
                break;
            case 1: 
                serviceBatteryV = N2kMsg.Get2ByteDouble(0.01,i); 
                serviceBatteryA = N2kMsg.Get2ByteDouble(0.1,i);
                serviceBatteryT = N2kMsg.Get2ByteDouble(0.01,i);
                break;
        }
        break;
    }
}




void N2KFreezeFrame::evaluateStatus(uint16_t lastStatus, 
                                    uint16_t newStatus, 
                                    uint16_t statusMask,
                                    uint8_t &bitsSet, 
                                    uint8_t  &bitsCleared) {
    lastStatus = lastStatus & statusMask;
    newStatus = newStatus & statusMask;
    if ( lastStatus != newStatus ) {
        uint16_t c = 1;
        for(int i = 0; i < 16; i++) {
            if (((lastStatus & c) == 0x00) && ((newStatus & c) == c)) {
                bitsSet++;
            } else if (((lastStatus & c) == c) && ((newStatus & c) == c)) {
                bitsCleared++;
            }
            c = c<<1;
        }
    }
}



void N2KFreezeFrame::logFreezeFrame() {
    Serial.println("FreezeFrame triggered");
        tmElements_t tm;
        // docu
        double tofLog = secondsSinceMidnight+daysSince1970*SECS_PER_DAY; 
        breakTime((time_t)tofLog, tm);
        char filename[30]; 
        sprintf(&filename[0],"/engine/freezeframe%04d%02d%02d.txt", tm.Year+1970, tm.Month, tm.Day);
        File f;
        if ( !SPIFFS.exists(filename) ) {
            if ( !SPIFFS.exists("/engine")) {
                Serial.println("mkdir /engine");
                SPIFFS.mkdir("/engine");
            }
            Serial.print("Creating ");Serial.println(filename);
            f = SPIFFS.open(filename,"a");
            f.println("time,logTime,lat,long,log,engineHours,status1,status2,rpm,coolantTemp,exhaustT,oilPress,alternatorT,altenatorV,engineBatteryV,serviceBatteryV,serviceBatteryA,serviceBatteryT,engineRoomT,senseT1,senseT2,senseT3,senseT4");
        } else {
            //Serial.print("Opening ");Serial.println(filename);
            f = SPIFFS.open(filename,"a");
        }

        f.printf("%04d-%02d-%02dT%02d:%02d:%02dZ",tm.Year+1970, tm.Month, tm.Day,tm.Hour,tm.Minute,tm.Second);
        f.printf(",%lu",(unsigned long)tofLog);
        // lat, lon
        append(f, latitude,1.0,",%.6f"); //deg
        append(f, longitude,1.0,",%.6f"); //deg
        append(f, log, 0.0005399568035,",%.6f"); //NM
        append(f, engineHours, 0.0002777777778,",%.2f"); //seconds -> hours
        append(f, status1); //TBD
        append(f, status2); //TBD
        append(f, engineSpeed, 1.0, ",%.0f"); //rpm
        append(f, engineCoolantTemp, 1.0, ",%.1f", -273.15); //C
        append(f, exhaustTemp, 1.0, ",%.1f",  -273.15); //C
        append(f, engineOilPress, 0.000145038,",%.6f"); // pascal -> PSI
        append(f, alternatorTemp, 1.0, ",%.1f", -273.15); //C
        append(f, altenatorVoltage, 1.0,",%.2f"); //V
        append(f, engineBatteryV, 1.0,",%.2f"); //V
        append(f, serviceBatteryV, 1.0,",%.2f"); //V
        append(f, serviceBatteryA, 1.0,",%.2f"); //A
        append(f, serviceBatteryT, 1.0, ",%.1f", -273.15); //C
        append(f, engineRoomTemp, 1.0, ",%.1f", -273.15); //C
        append(f, tempSensor1, 1.0, ",%.1f", -273.15); //C
        append(f, tempSensor2, 1.0, ",%.1f", -273.15); //C
        append(f, tempSensor3, 1.0, ",%.1f", -273.15); //C
        append(f, tempSensor4, 1.0, ",%.1f", -273.15); //C
        f.print("\n");
        f.close();
}

void N2KFreezeFrame::append(File &f, double v, double scale, const char * format, double offset) {
    if ( v == -1e9 ) {
        f.printf(",");
    } else {
        f.printf(format,(v*scale)+offset);
    }
}
void N2KFreezeFrame::append(File &f, uint16_t v) {
    if ( v == 0xffff ) {
        f.printf(",");
    } else {
        f.printf(",%u",v);
    }
}
