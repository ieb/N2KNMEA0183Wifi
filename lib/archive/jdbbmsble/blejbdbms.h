#pragma once

// Unfortunately the BLE stack seems to be unreliable on an ESP32
// and when enabled 40% of the flash is consumed.
// for that reason it may be better to not use this code, but rather provide a
// the BMS protocol over http for any UI.

// This means that it wont be possible to connect the standard JDB app over BLE, however this app
// makes calls back to base in china and it refuses to work if there is no network connection, which 
// isnt so good at sea... when knowing what a LiFePO4 pack is doing matters.

#include <Arduino.h>

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <BLEDescriptor.h>


// BLE Service for the BMS
#define BMS_SERVICE_UUID  "0000ff00-0000-1000-8000-00805f9b34fb"
// Tx and Rx characteristics, connect to send and recieve on the BMS Uart
#define BMS_TXCH_UUID     "0000ff02-0000-1000-8000-00805f9b34fb"
#define BMS_RXCH_UUID     "0000ff01-0000-1000-8000-00805f9b34fb"


#define OFFSET_START_CMD_PAYLOAD 2
#define OFFSET_START_RESPONSE_PAYLOAD 2

#define OFFSET_START_PACKET 0
#define OFFSET_REQ_OPERATION 1
#define OFFSET_REQ_REGISTER 2
#define OFFSET_REQ_DATALENGTH 3
#define REQ_HEADER_LEN 4


#define START_OF_PACKET     0xDD          
#define END_OF_PACKET       0x77          
#define REQ_OPERATION_READ  0xA5          
#define REQ_OPERATION_WRITE 0x5A          
#define RESPONSE_OK    0x00
#define RESPONSE_ERROR 0x80


#define OFFSET_RES_REGISTER 1
#define OFFSET_RES_STATUS 2
#define OFFSET_RES_LENGTH 3
#define RES_HEADER_LEN 4




// registers Ox03
#define REG_VOLTAGE_U16           0
#define REG_CURRENT_S16           2
#define REG_PACK_CAPACITY_U16     4
#define REG_FULL_CAPACITY_U16     6
#define REG_CHARGE_CYCLES_U16     8
#define REG_PRODUCTION_DATE_U16  10
#define REG_BAT0_15_STATUS_U16   12
// eslint-disable-next-line no-unused-vars
#define REG_BAT16_31_STATUS_U16  14
#define REG_ERRORS_U16           16
#define REG_SOFTWARE_VERSION_U8  18
#define REG_SOC_U8               19
#define REG_FET_STATUS_U8        20
#define REG_NUMBER_OF_CELLS_U8   21
#define REG_NTC_COUNT_U8         22
#define REG_NTC_READINGS_U16      23



class JBDBlmsBleCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer);
    void onDisconnect(BLEServer* pServer);
};

class JBDBlmsBleRequestCallbacks: public BLECharacteristicCallbacks {
public:
    JBDBlmsBleRequestCallbacks(BLECharacteristic *pBMSNotify) : pBMSNotify{pBMSNotify} {}; 
    void onWrite(BLECharacteristic *pCharacteristic);
private:
    BLECharacteristic *pBMSNotify;
    uint8_t responseRegister[256];

    void setUDouble(uint8_t regOff, double v, double f);
    void setDouble(uint8_t regOff, double v, double f);
    void setUInt(uint8_t regOff, uint16_t rv);
    void setUInt8(uint8_t regOff, uint8_t rv);
    uint16_t encodeDate(uint16_t y, uint8_t m, uint8_t d);
    int8_t readRegFromSerial(uint8_t regNo);
    bool checkSumOk(uint8_t * data, uint8_t endPayload, size_t len);
    void addCheckSum(uint8_t endPayload);
    void sendResponse(uint8_t len, uint8_t * data = NULL, uint8_t startCallbackId = 0, uint8_t endCallbackId = 0);
    void dumpPacket(uint8_t * b, size_t len);
};


class JBDBlmsBle {
public:
    JBDBlmsBle() {};
    void begin();

};




