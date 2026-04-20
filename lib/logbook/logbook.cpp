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

/*
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

} */


bool LogBook::shouldLog() {
    unsigned long now = millis();
    return ( (now-lastLogUpdate) >  logPeriod);
}


void LogBook::log(double secondsSinceMidnight, uint16_t daysSince1970, double latitude,
            double longitude, uint32_t log, uint32_t tripLog, double cog, double sog,
            double stw, double hdg, double aws, double awa, double pressure, double rpm,
            double coolant) {
    unsigned long now = millis();
    if ( (now-lastLogUpdate) >  logPeriod) {
        lastLogUpdate = now;
        // new gnss data is avaiable, this indicates that the NMEA2000 instruments are on

        // Drop the record if SPIFFS is nearly full — better to lose log lines
        // than to fill the flash and block config writes / freeze frames.
        if ( !haveSpiffsHeadroom() ) {
            Serial.println("logbook: SPIFFS nearly full, dropping record");
            return;
        }

        tmElements_t tm;
        // docu
        double tofLog = secondsSinceMidnight+daysSince1970*SECS_PER_DAY;
        breakTime((time_t)tofLog, tm);
        char filename[30];
        sprintf(&filename[0],"/logbook/log%04d%02d%02d.txt", tm.Year+1970, tm.Month, tm.Day);
        File f;
        bool newFile = !SPIFFS.exists(filename);
        if ( newFile ) {
            if ( !SPIFFS.exists("/logbook")) {
                Serial.println("mkdir /logbook");
                SPIFFS.mkdir("/logbook");
            }
            // Prune older logs on roll-over so we don't grow unbounded.
            rotateLogFiles();
            Serial.print("Creating ");Serial.println(filename);
            f = SPIFFS.open(filename,"a");
            if ( !f ) {
                Serial.print("logbook: open failed ");Serial.println(filename);
                return;
            }
            f.println("time,logTime,lat,long,log,fixage,trip,cog,sog,stw,hdg,awa,aws,mbar,mbarage,rpm,coolant,serviceVolts,engineVolts,serviceCurrent");
        } else {
            f = SPIFFS.open(filename,"a");
            if ( !f ) {
                Serial.print("logbook: open failed ");Serial.println(filename);
                return;
            }
            // Cap per-day file size. Dropping records is preferable to
            // unbounded growth.
            if ( f.size() >= LOGBOOK_MAX_FILE_BYTES ) {
                f.close();
                return;
            }
        }

        f.printf("%04d-%02d-%02dT%02d:%02d:%02dZ",tm.Year+1970, tm.Month, tm.Day,tm.Hour,tm.Minute,tm.Second);
        f.printf(",%lu",(unsigned long)tofLog);
        // lat, lon

        append(f, latitude,1.0,",%.6f"); //deg
        append(f, longitude,1.0,",%.6f"); //deg
        append(f, log, 0.0005399568035,",%.6f"); //NM
        append(f, tripLog, 0.0005399568035,",%.6f"); //NM
        appendBearing(f, cog,",%.2f"); //deg
        append(f, sog,1.94384,",%.2f"); //Kn
        append(f, stw,1.94384,",%.2f"); //Kn
        appendBearing(f, hdg,",%.2f"); //Kn
        append(f, aws,1.94384,",%.2f"); //Kn
        appendAngle(f, awa,",%.2f"); //deg
        append(f, pressure,0.01,",%.1f"); //Kn
        append(f, rpm, 1.0, ",%.0f"); //Kn
        append(f, coolant-273.15, 1.0, ",%.1f"); //C
        f.print("\n");
        f.close();
    }
}

void LogBook::append(File &f, double v, double scale, const char * format) {
    if ( v == -1e9 ) {
        f.printf(",");
    } else {
        f.printf(format,v*scale);
    }
}
void LogBook::append(File &f, uint32_t v, double scale, const char * format) {
    if ( v == 0xffffffff ) {
        f.printf(",");
    } else {
        f.printf(format,v*scale);
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
    if ( bearing == -1e9 ) {
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
    if ( angle == -1e9 ) {
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

bool LogBook::haveSpiffsHeadroom() {
    size_t total = SPIFFS.totalBytes();
    size_t used  = SPIFFS.usedBytes();
    if ( total <= used ) return false;
    return (total - used) > LOGBOOK_SPIFFS_MIN_FREE;
}

void LogBook::rotateLogFiles() {
    // Walk /logbook, collect filenames, delete all but the newest
    // LOGBOOK_MAX_DAYS. The YYYYMMDD naming means lexical order == chrono.
    File dir = SPIFFS.open("/logbook");
    if ( !dir || !dir.isDirectory() ) return;

    // Small fixed-capacity list: at most 64 entries scanned per rotate pass.
    const int MAX_SCAN = 64;
    String names[MAX_SCAN];
    int nNames = 0;

    File f = dir.openNextFile();
    while ( f && nNames < MAX_SCAN ) {
        String n = f.name();
        // f.name() on ESP32 SPIFFS returns "/logbook/logYYYYMMDD.txt" or "logYYYYMMDD.txt"
        // depending on Arduino core; we only need the lexical order for sort.
        if ( n.indexOf("log") >= 0 && n.endsWith(".txt") ) {
            names[nNames++] = n;
        }
        f = dir.openNextFile();
    }
    dir.close();

    if ( nNames <= LOGBOOK_MAX_DAYS ) return;

    // Simple insertion sort (ascending) — max 64 entries so O(n^2) is fine.
    for ( int i = 1; i < nNames; i++ ) {
        String key = names[i];
        int j = i - 1;
        while ( j >= 0 && names[j] > key ) {
            names[j+1] = names[j];
            j--;
        }
        names[j+1] = key;
    }

    // Delete the oldest (lowest lexical) until nNames <= LOGBOOK_MAX_DAYS.
    int toDelete = nNames - LOGBOOK_MAX_DAYS;
    for ( int i = 0; i < toDelete; i++ ) {
        String victim = names[i];
        // Arduino SPIFFS .remove() needs an absolute path.
        if ( !victim.startsWith("/") ) victim = "/logbook/" + victim;
        Serial.print("logbook: rotating out "); Serial.println(victim);
        SPIFFS.remove(victim);
    }
}
