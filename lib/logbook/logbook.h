#ifndef _LOGBOOK_H
#define _LOGBOOK_H

#include <SPIFFS.h>




class LogBook {
    public:
        LogBook() {};
        bool shouldLog();
        void log( double secondsSinceMidnight, uint16_t daysSince1970, double latitude, 
            double longitude, uint32_t log, uint32_t tripLog, double cog, double sog,
            double stw, double hdg, double aws, double awa, double pressure, double rpm,
            double coolant ); 
    private:
        double relativeAngleToDeg(double a);
        double headingAngleToDeg(double a);

        void append(File &f, double v, double scale, const char * format);
        void append(File &f, uint32_t v, double scale, const char * format);
        void append(File &f, uint16_t v);
        void appendBearing(File &f, double bearing, const char * format);
        void appendAngle(File &f, double angle, const char * format);

        unsigned long lastLogUpdate = 0;
        unsigned long logPeriod = 300000; // every 5m, 288 log entries per day.
        unsigned long lastDemoUpdate = 0;
};

#endif