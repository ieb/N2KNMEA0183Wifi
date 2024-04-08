#include "logbook.h"
#include <TimeLib.h>
#define M_TO_NM(x) ((x)/1852.0)
#define SPEED_MS_TO_KN(x) ((x)*1.94384)
#define K_TO_C(x) (((x)-273.15))
#define PASCAL_TO_MBAR(x) (0.01*x)






double LogBook::relativeAngleToDeg(double a) {
    a = a*57.2958;
    if(a < -180.0) a += 360.0;
    if(a > 180.0) a -= 360.0;
    return a;
}
double LogBook::headingAngleToDeg(double a) {
    a = a*57.2958;
    if(a < -360.0) a += 360.0;
    if(a > 360.0) a -= 360.0;
    return a;
}

void LogBook::demoMode() {
    unsigned long now = millis();
    if ( (now-lastDemoUpdate) >  5000) {

        lastDemoUpdate = now;
         n2kCollector.log[0].lastModified = now;
         n2kCollector.log[0].source = 1;
         unsigned long atime = now;
         n2kCollector.log[0].daysSince1970 = 18973+(atime/(24*3600000));
         n2kCollector.log[0].secondsSinceMidnight = (atime%(24*3600000))/1000;
         n2kCollector.possition[0].source = 2;
         n2kCollector.possition[0].lastModified = now;
         n2kCollector.possition[0].longitude = 0.11987607061305089-((1.0*now)/(3600000));
         n2kCollector.possition[0].latitude = 52.18623058185942-((1.0*now)/(3600000));
         n2kCollector.log[0].lastModified = now;
         n2kCollector.log[0].log = 1852  + (1852.0*now)/(6000);
         n2kCollector.log[0].tripLog = (1852.0*now)/(6000);
    }

}

struct tLogBookRecord {
    double secondsSinceMidnight;
    uint16_t daysSince1970;
    double latitude;
    double longitude;
    uint32_t log;
    uint32_t tripLog;
    double cog;
    double sog;
    double stw;
    double hdg;
    double aws;
    double awa;
    double pressure;
    uint16_t rpm;
    double coolant; 
} tLogBookRecord;



void LogBook::log(tLogBookRecord *logBookRecord) {
    unsigned long now = millis();
    if ( (now-lastLogUpdate) >  logPeriod) {

    
        if ( gnss != NULL && gnss->lastModified > lastLogUpdate ) {
            // new gnss data is avaiable, this indicates that the NMEA2000 instruments are on 
            
            tmElements_t tm;
            // docu
            double tofLog = logBookRecord->secondsSinceMidnight+logBookRecord->daysSince1970*SECS_PER_DAY; 
            breakTime((time_t)tofLog, tm);
            char filename[30]; 
            sprintf(&filename[0],"/logbook/log%04d%02d%02d.txt", tm.Year+1970, tm.Month, tm.Day);
            File f;
            if ( !SPIFFS.exists(filename) ) {
                if ( !SPIFFS.exists("/logbook")) {
                    Serial.println("mkdir /logbook");
                    SPIFFS.mkdir("/logbook");
                }
                Serial.print("Creating ");Serial.println(filename);
                f = SPIFFS.open(filename,"a");
                f.println("time,logTime,lat,long,log,fixage,trip,cog,sog,stw,hdg,awa,aws,mbar,mbarage,rpm,coolant,serviceVolts,engineVolts,serviceCurrent");
            } else {
                //Serial.print("Opening ");Serial.println(filename);
                f = SPIFFS.open(filename,"a");
            }

            f.printf("%04d-%02d-%02dT%02d:%02d:%02dZ",tm.Year+1970, tm.Month, tm.Day,tm.Hour,tm.Minute,tm.Second);
            f.printf(",%lu",(unsigned long)tofLog);
            // lat, lon

            append(f, logBookRecord->latitude,1.0,",%.6f"); //deg
            append(f, logBookRecord->longitude,1.0,",%.6f"); //deg
            // convert to NM first.
            append(f, 0.0005399568035*logBookRecord->log, 1.0,",%.6f"); //NM
            append(f, 0.0005399568035*logBookRecord->tripLog, 1.0,",%.6f"); //NM
            appendBearing(f, logBookRecord->cog,",%.2f"); //deg
            append(f, logBookRecord->sog,1.94384,",%.2f"); //Kn
            append(f, logBookRecord->stw,1.94384,",%.2f"); //Kn
            appendBearing(f, logBookRecord->hdg,",%.2f"); //Kn
            append(f, logBookRecord->aws,1.94384,",%.2f"); //Kn
            appendAngle(f, logBookRecord->awa,",%.2f"); //deg
            append(f, logBookRecord->pressure,0.01,",%.1f"); //Kn
            append(f, logBookRecord->rpm); //Kn
            append(f, logBookRecord->coolant-273.15,",%.1f"); //C
            f.print("\n");
            f.close();



        } else {
            // instruments are off. We could add an entry but we dont really know what the time is
            // so we probably should not
        }
        lastLogUpdate = now;
    }
}

void LogBook::append(File &f, double v, double f, const char * format) {
    if ( v == -1e9 ) {
        f.printf(",");
    } else {
        f.printf(format,v*f);
    }
}
void LogBook::append(File &f, uint16_t v) {
    if ( v == 0xffff ) {
        f.printf(",");
    } else {
        f.printf(",%u",v);
    }
}
void LogBook::appendBearing(File &f, double bearing, const char * format) {
    if ( v == -1e9 ) {
        f.printf(",");
    } else {
        bearing = bearing * 180/PI;
        if ( bearing > 360 ) {
            bearing = bearing-360;
        } if ( bearing < 0 ) {
            bearing = bearing + 360;
        }
        f.printf(format,bearing);
    }
}
void LogBook::appendAngle(File &f, double angle, const char * format) {
    if ( v == -1e9 ) {
        f.printf(",");
    } else {
        angle = angle * 180/PI;
        if ( angle > 180 ) {
            angle = angle-360;
        } if ( angle < -180 ) {
            angle = angle + 360;
        }
        f.printf(format,angle);
    }
}
