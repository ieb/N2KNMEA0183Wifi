#ifndef _LOGBOOK_H
#define _LOGBOOK_H

#include <SPIFFS.h>




class LogBook {
    public:
        LogBook() {};
        void log();
        void demoMode();
    private:
        double relativeAngleToDeg(double a);
        double headingAngleToDeg(double a);

        unsigned long lastLogUpdate = 0;
        unsigned long logPeriod = 300000; // every 5m, 288 log entries per day.
        unsigned long lastDemoUpdate = 0;
};

#endif