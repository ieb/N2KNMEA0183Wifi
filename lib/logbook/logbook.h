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
        bool loggingEnabled = true;
    private:
        double relativeAngleToDeg(double a);
        double headingAngleToDeg(double a);

        void append(File &f, double v, double scale, const char * format);
        void append(File &f, uint32_t v, double scale, const char * format);
        void append(File &f, uint16_t v);
        void appendBearing(File &f, double bearing, const char * format);
        void appendAngle(File &f, double angle, const char * format);

        // Enforce a retention policy on /logbook/log*.txt so SPIFFS never
        // fills up on multi-week passages. Deletes all but the newest
        // LOGBOOK_MAX_DAYS files (sorted lexically, which matches chrono
        // for the YYYYMMDD naming scheme).
        void rotateLogFiles();
        // True when SPIFFS has headroom to absorb another log record.
        bool haveSpiffsHeadroom();

        unsigned long lastLogUpdate = 0;
        unsigned long logPeriod = 300000; // every 5m, 288 log entries per day.
        unsigned long lastDemoUpdate = 0;
};

#define LOGBOOK_MAX_DAYS       14        // keep 14 daily files; older are deleted
#define LOGBOOK_MAX_FILE_BYTES (128*1024) // per-day cap
#define LOGBOOK_SPIFFS_MIN_FREE 4096      // skip writes when less than this free

#endif