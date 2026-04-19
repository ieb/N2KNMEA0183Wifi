#pragma once

class NMEA0183N2KMessages {
public:
    bool doSend(unsigned long &last, unsigned long interval) {
        (void)last; (void)interval;
        return false;
    }
    void start(const char *) {}
    void append(const char *) {}
    void append(float, double, int) {}
    void appendRelativeSignedAngle(float, int) {}
    void send() {}
};
