#pragma once

#include <NMEA2000.h>

#define BMS_MAX_NTC 5
#define BMS_MAX_CELLS 16
#define BMS_MAX_PACK_NAME 31
#define BMS_MAX_BUFFER_LENGTH 255
#define BMS_REGISTER03_LENGTH 64 // (24+2*BMS_MAX_NTC+8)  
#define BMS_REGISTER04_LENGTH 32 // (BMS_MAX_CELLS*2)
#define BMS_REGISTER05_LENGTH 32 // (BMS_MAX_PACK_NAME+1)


/*
PGN 130829L
ManufactureID 2046 ==      11111111110
Reserved                 11
Marine           4 == 100
                      1001111111111110
*/
#define BMS_PROPRIETARY_CODE 0x9ffe // 2046 & 0x7FE | 0x3<<11 | 0x04<<13
#define BMS_PROPRIETARY_PGN 130829L

#define BMS_PERIOD_127508 1500
#define BMS_PERIOD_127506 1500
#define BMS_PERIOD_127513 60000
#define BMS_PERIOD_REG03 1000
#define BMS_PERIOD_REG04 1000
#define BMS_PERIOD_REG05 30000


class JdbBMS {
public:



    JdbBMS(uint8_t batteryInstance=1) {
        this->batteryInstance = batteryInstance;
        lastSend = millis();
        last127508 = lastSend+100;
        last127506 = lastSend+110;
        last127513 = lastSend+120;
        lastReg03 = lastSend+130;
        lastReg04 = lastSend+140;
        lastReg05 = lastSend+150;
    };
    void printStatus(Print *stream);
    void setSerial(Stream *stream) {
        this->io = stream;
    };
    void begin();
    void update();
    bool setN2KMsg(tN2kMsg &N2kMsg);
    void toggleDebug() {
        this->debug = !(this->debug);
    };
private:
    Stream * io;
    uint8_t buffer[BMS_MAX_BUFFER_LENGTH]; // enough for a whole packet 
    uint8_t register03[BMS_REGISTER03_LENGTH]; // enough for the register 
    uint8_t register04[BMS_REGISTER04_LENGTH]; // enough for a whole packet 
    uint8_t register05[BMS_REGISTER05_LENGTH]; // enough for a whole packet 
    uint8_t wpos = 0;
    uint8_t register03Length = 0;
    uint8_t register04Length = 0;
    uint8_t register05Length = 0;
    uint8_t sid = 0;
    uint8_t batteryInstance = 1;
    unsigned long lastSend = 0;
    unsigned long last127508 = 0;
    unsigned long last127506 = 0;
    unsigned long last127513 = 0;
    unsigned long lastReg03 = 0;
    unsigned long lastReg04 = 0;
    unsigned long lastReg05 = 0;
    unsigned long reg03Update = 0;
    unsigned long reg04Update = 0;

    uint8_t reg = 3;
    uint8_t requestReg05 = 0;
    uint8_t maxReqRegs = 4;
    bool debug = false;

    void requestRegister(uint8_t regNo);
    int processFrame(int from);
    double getUDouble(uint8_t offset, double factor, uint8_t * data, size_t dataLength  );
    double getDouble(uint8_t offset, double factor, uint8_t * data, size_t dataLength  );
    uint16_t getUInt16(uint8_t offset, uint8_t * data, size_t dataLength  );
    uint8_t getUInt8(uint8_t offset, uint8_t * data, size_t dataLength  );
    uint16_t getDaysSince1970(uint8_t offset, uint8_t * data, size_t dataLength);

    void copyReg03(uint8_t * data, size_t dataLength);
    void copyReg04(uint8_t * data, size_t dataLength);
    void copyReg05(uint8_t * data, size_t dataLength);
    void printStatus03(Print *stream);
    void printStatus04(Print *stream);
    void printStatus05(Print *stream);
    void printProductionDate(Print *stream, uint8_t offset, uint8_t * data, size_t dataLength);


    void dumpBuffer(const char *msg, uint8_t *b, uint8_t s, uint8_t e);
    void dump2Bytes(uint8_t * data, uint8_t offset);
    void dump1Byte(uint8_t * data, uint8_t offset);
    void dumpNa();
    void swapBytes(uint8_t * d, uint8_t i);



};


// used for simulation, implements a stream with just enough of the BMS behavour
class JBDBmsSimulator: public Stream {
public:
    JBDBmsSimulator() {};
    int read();
    int available();
    int peek();

    // Print implementation
    virtual size_t write(uint8_t val);
    virtual size_t write(const uint8_t *buf, size_t size);
    using Print::write; // pull in write(str) and write(buf, size) from Print
  
    virtual void flush();

private:

    uint8_t buffer[255];
    uint8_t rstate = 0;
    uint8_t bend = 0;
    uint8_t reg = 0;
    uint16_t csum = 0;


    uint8_t createReg03Response(uint8_t *buffer, double voltage=12.63, double current=53.1, double capacity=280.0);
    uint8_t createReg04Response(uint8_t *buffer);
    uint8_t createReg05Response(uint8_t *buffer);
    uint8_t createErrorResponse(uint8_t *buffer, uint8_t regNo);
    uint8_t updateReg03(uint8_t *reg, double voltage=12.63, double current=53.1, double capacity=280.0);
    uint8_t updateReg04(uint8_t *reg);
    uint8_t updateReg05(uint8_t *reg);
    void setUDouble(uint8_t *reg, uint8_t regOff, double v, double f);
    void setDouble(uint8_t *reg, uint8_t regOff, double v, double f);
    void setUInt(uint8_t *reg, uint8_t regOff, uint16_t rv);
    void setUInt8(uint8_t *reg, uint8_t regOff, uint8_t rv);
    uint16_t encodeDate(uint16_t y, uint8_t m, uint8_t d);
    uint16_t finish(uint8_t *buffer);
    void dumpBuffer(const char * msg);
};



