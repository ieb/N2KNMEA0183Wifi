#include "blejbdbms.h"



void JBDBlmsBle::begin() {
    BLEDevice::init("MyBLE");
    BLEServer *pServer = BLEDevice::createServer();

    pServer->setCallbacks(new JBDBlmsBleCallbacks());

    BLEService *pBMSService = pServer->createService(BMS_SERVICE_UUID);
    // the client can be notified on the RXCH characteristicts
    BLECharacteristic *pBMSNotify = pBMSService->createCharacteristic(
                                     BMS_RXCH_UUID,
                                     BLECharacteristic::PROPERTY_READ 
                                     | BLECharacteristic::PROPERTY_WRITE 
                                     | BLECharacteristic::PROPERTY_NOTIFY 
                                     | BLECharacteristic::PROPERTY_INDICATE
                                   );

  // Creates BLE Descriptor 0x2902: Client Characteristic Configuration Descriptor (CCCD)
  pBMSNotify->addDescriptor(new BLE2902());
  // Adds also the Characteristic User Description - 0x2901 descriptor
  BLEDescriptor * descriptor_2901 = new BLEDescriptor(BLEUUID((uint16_t)0x2901));
  descriptor_2901->setValue("register subscriptions");
  descriptor_2901->setAccessPermissions(ESP_GATT_PERM_READ);  // enforce read only - default is Read|Write
  pBMSNotify->addDescriptor(descriptor_2901);


    // the client can write to the TX ch
    BLECharacteristic *pBMSRead = pBMSService->createCharacteristic(
                                     BMS_TXCH_UUID,
                                     BLECharacteristic::PROPERTY_READ 
                                     | BLECharacteristic::PROPERTY_WRITE 
                                     | BLECharacteristic::PROPERTY_NOTIFY 
                                     | BLECharacteristic::PROPERTY_INDICATE
                                   );
  // Creates BLE Descriptor 0x2902: Client Characteristic Configuration Descriptor (CCCD)
  pBMSRead->addDescriptor(new BLE2902());
  // Adds also the Characteristic User Description - 0x2901 descriptor
  BLEDescriptor * descriptor_2901_2 = new BLEDescriptor(BLEUUID((uint16_t)0x2901));
  descriptor_2901_2->setValue("register command");
  descriptor_2901_2->setAccessPermissions(ESP_GATT_PERM_READ);  // enforce read only - default is Read|Write
  pBMSRead->addDescriptor(descriptor_2901_2);

    pBMSRead->setCallbacks(new JBDBlmsBleRequestCallbacks(pBMSNotify));

    pBMSService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(BMS_SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
}

void JBDBlmsBleCallbacks::onConnect(BLEServer* pServer) {

}
void JBDBlmsBleCallbacks::onDisconnect(BLEServer* pServer) {
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(BMS_SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
}


void JBDBlmsBleRequestCallbacks::onWrite(BLECharacteristic *pCharacteristic) {

    uint8_t * data = pCharacteristic->getData();
    size_t requestLen = pCharacteristic->getLength();
    Serial.print("Length ");
    Serial.println(requestLen);

    dumpPacket(data, requestLen);
    uint8_t regNo = data[OFFSET_REQ_REGISTER];
    responseRegister[OFFSET_START_PACKET] = START_OF_PACKET;
    responseRegister[OFFSET_RES_REGISTER] = regNo;

    if ( data[OFFSET_START_PACKET] == START_OF_PACKET ) { 
        if ( data[OFFSET_REQ_OPERATION] == REQ_OPERATION_READ ) { 
            uint8_t dataLen = data[OFFSET_REQ_DATALENGTH];
            uint8_t endPayload = dataLen+REQ_HEADER_LEN;
            uint8_t startCallbackId = endPayload+4;
            uint8_t endCallbackId  = requestLen;
            if ( data[endPayload+2] == END_OF_PACKET ) {
                if ( checkSumOk(data, endPayload, requestLen) ) { // Checksum Ok
                    int8_t regLen = readRegFromSerial(regNo);
                    if (regLen >= 0) {
                        responseRegister[OFFSET_RES_STATUS] = RESPONSE_OK; // Ok
                        responseRegister[OFFSET_RES_LENGTH] = regLen;

                        sendResponse(regLen+RES_HEADER_LEN, data, startCallbackId, endCallbackId);
                        Serial.print("Read register Ok:");
                        Serial.println(regNo);
                        return;                                   
                    } else {
                        Serial.print("Read register error:");
                        Serial.println(regLen);
                    }
                } else {
                    Serial.println("Checksum failed");
                }
            } else {
                Serial.println("End of packet missing");

            }

        } else if (data[1] == 0x5A) { // write
            Serial.print("Write Operation Not supported:");
            Serial.println(data[OFFSET_REQ_OPERATION], HEX);
        } else {
            Serial.print("Operation Not supported:");
            Serial.println(data[OFFSET_REQ_OPERATION], HEX);

        }
    } else {
        Serial.print("Start of Packet incorrect:");
        Serial.println(data[OFFSET_START_PACKET], HEX);
    }

    responseRegister[OFFSET_RES_STATUS] = RESPONSE_ERROR; // Ok
    responseRegister[OFFSET_RES_LENGTH] = 0;
    sendResponse(RES_HEADER_LEN); 
}

void JBDBlmsBleRequestCallbacks::dumpPacket(uint8_t * b, size_t len) {
    if ( b[0] == START_OF_PACKET) {
        Serial.print("Packet:");
        for (int i = 0; i < len; ++i) {
            Serial.print(b[i], HEX);
            Serial.print(" ");
        }
        Serial.println(" ");
    }
}


void JBDBlmsBleRequestCallbacks::setUDouble(uint8_t regOff, double v, double f) {
    uint16_t rv = v/f;
    responseRegister[RES_HEADER_LEN+regOff] = (rv&0xff00)>>8;
    responseRegister[RES_HEADER_LEN+regOff+1] = (rv&0xff);
}
void JBDBlmsBleRequestCallbacks::setDouble(uint8_t regOff, double v, double f) {
    int16_t rv = v/f;
    responseRegister[RES_HEADER_LEN+regOff] = (rv&0xff00)>>8;
    responseRegister[RES_HEADER_LEN+regOff+1] = (rv&0xff);
}
void JBDBlmsBleRequestCallbacks::setUInt(uint8_t regOff, uint16_t rv) {
    responseRegister[RES_HEADER_LEN+regOff] = (rv&0xff00)>>8;
    responseRegister[RES_HEADER_LEN+regOff+1] = (rv&0xff);
}
void JBDBlmsBleRequestCallbacks::setUInt8(uint8_t regOff, uint8_t rv) {
    responseRegister[RES_HEADER_LEN+regOff] = (rv&0xff);
}
uint16_t JBDBlmsBleRequestCallbacks::encodeDate(uint16_t y, uint8_t m, uint8_t d) {
    return (d&0x1f) | (((m&0xff)<<5)&0x1e0) | ((((y-2000)&0xff)<<9)&0xfe00); 
}

int8_t JBDBlmsBleRequestCallbacks::readRegFromSerial(uint8_t regNo) {
    if ( regNo == 0x03 ) {
        // fake up for now.
        setUDouble(REG_VOLTAGE_U16, 12.26, 0.01);
        setDouble(REG_CURRENT_S16, 4.5, 0.01);
        setUDouble(REG_PACK_CAPACITY_U16, 280, 0.01);
        setUDouble(REG_FULL_CAPACITY_U16, 304, 0.01);
        setUInt(REG_CHARGE_CYCLES_U16, 386);
        setUInt(REG_PRODUCTION_DATE_U16, encodeDate(2020,12,24));
        setUInt(REG_BAT0_15_STATUS_U16, 0x05);
        setUInt(REG_BAT16_31_STATUS_U16, 0x00);
        setUInt(REG_BAT16_31_STATUS_U16, 0xf0f0);
        setUInt(REG_ERRORS_U16, 0xf0f0);
        setUInt8(REG_SOFTWARE_VERSION_U8, 0x11);
        setUInt8(REG_SOC_U8, 89);
        setUInt8(REG_FET_STATUS_U8, 0x03);
        setUInt8(REG_NUMBER_OF_CELLS_U8,4);
        setUInt8(REG_NTC_COUNT_U8, 3);
        setUDouble(REG_NTC_READINGS_U16, 27.3+273.15, 0.1);
        setUDouble(REG_NTC_READINGS_U16+2, 23.3+273.15, 0.1);
        setUDouble(REG_NTC_READINGS_U16+4, 22.3+273.15, 0.1);
        setUInt8(REG_NTC_READINGS_U16+6, 55); // 55% humidity
        setUInt(REG_NTC_READINGS_U16+7, 0x0); // Alarm status
        setUDouble(REG_NTC_READINGS_U16+9, 304, 0.01); // full charge capacit
        setUDouble(REG_NTC_READINGS_U16+11, 280, 0.01); // remaining capacity
        setUDouble(REG_NTC_READINGS_U16+13, 120, 0.001); // balance current
        return REG_NTC_READINGS_U16+15;
    } else if ( regNo == 0x04 ) {
        setUDouble(REG_VOLTAGE_U16, 3.123, 0.001);
        setUDouble(REG_VOLTAGE_U16+2, 3.14, 0.001);
        setUDouble(REG_VOLTAGE_U16+4, 3.15, 0.001);
        setUDouble(REG_VOLTAGE_U16+6, 3.16, 0.001);
        return REG_VOLTAGE_U16+8;
    } else if ( regNo == 0x05 ) {
        responseRegister[RES_HEADER_LEN] = 5;
        responseRegister[RES_HEADER_LEN+1] = 'M';
        responseRegister[RES_HEADER_LEN+2] = 'Y';
        responseRegister[RES_HEADER_LEN+3] = 'B';
        responseRegister[RES_HEADER_LEN+4] = 'M';
        responseRegister[RES_HEADER_LEN+5] = 'S';
        return 6;
    } else {
        return -1;
    }
}

bool JBDBlmsBleRequestCallbacks::checkSumOk(uint8_t * data, uint8_t endPayload, size_t len) {
    uint16_t sum = 0;
    for (int i = OFFSET_START_CMD_PAYLOAD; i < endPayload; ++i) {
        sum = sum + data[i];
    }
    sum = 0x10000 - sum;
    if( (((sum&0xff00)>>8) == data[endPayload]) &&
        ((sum&0xff) == data[endPayload+1] ) ) {
        return true;
    } 
    dumpPacket(data, len);
    Serial.print("EndPayload:");
    Serial.println(endPayload);
    Serial.print("SentChecksum:");Serial.print(data[endPayload], HEX);Serial.print(" ");Serial.println(data[endPayload+1], HEX);
    Serial.print("CalcChecksum:");Serial.print(((sum&0xff00)>>8), HEX);Serial.print(" ");Serial.println((sum&0xff), HEX);
    return false;
}
void JBDBlmsBleRequestCallbacks::addCheckSum(uint8_t endPayload) {
    uint16_t sum = 0;
    for (int i = OFFSET_START_RESPONSE_PAYLOAD; i < endPayload; ++i) {
        sum = sum + responseRegister[i];
    }
    sum = 0x10000 - sum;
    responseRegister[endPayload] = (sum&0xff00)>>8;
    responseRegister[endPayload+1] = (sum&0xff);
}


void JBDBlmsBleRequestCallbacks::sendResponse(uint8_t len, uint8_t * data, uint8_t startCallbackId, uint8_t endCallbackId) {
    addCheckSum(len);
    int op = len+2;
    responseRegister[op++] = END_OF_PACKET; // end packet
    for(int i = startCallbackId; i< endCallbackId; i++) {
        responseRegister[op++] = data[i];
    }
    dumpPacket(responseRegister, op);
    pBMSNotify->setValue(responseRegister, op);
    pBMSNotify->notify();
}
