// see https://github.com/FurTrader/OverkillSolarBMS/blob/master/Comm_Protocol_Documentation/Translated_to_english_JBD_comm_ptotocol_20230321_V11.pdf
#include <Arduino.h>
#include "jdb_bms.h"
#include <TimeLib.h>
#include <N2kTypes.h>
#include <N2kMessages.h>
#include "esp_log.h"


#define TAG "jdb_bms"


#define REQ_REGSTART 3


#define START_OF_PACKET     0xDD          
#define END_OF_PACKET       0x77          
#define REQ_OPERATION_READ  0xA5          
#define REQ_OPERATION_WRITE 0x5A          
#define RESPONSE_OK    0x00
#define RESPONSE_ERROR 0x80

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
#define REG_NTC_READINGS_U16(n)  (23+2*(n))
#define REG_HUMIDITY_U8(n)  (23+2*(n))
#define REG_ALARM_STATUS_U16(n)  (23+2*(n)+1)
#define REG_FULL_CHARGE_CAPACITY_U16(n)  (23+2*(n)+3)
#define REG_REMAINING_CHARGE_CAPACITY_U16(n)  (23+2*(n)+5)
#define REG_BALLANCE_CURRENT_U16(n)  (23+2*(n)+7)





void JdbBMS::begin() {

    // todo setup the serial port.

}
void JdbBMS::update() {
    int toRead = io->available();
    if ( toRead > 0) {
        for (int i = 0; i < toRead; i++) {
            buffer[wpos++] = io->read();
            if (  wpos == BMS_MAX_BUFFER_LENGTH ) {
                // overflow
                break;
            }
        }
        dumpBuffer("Processing ",buffer, 0, wpos);

        // scan the bufer looking for response frames which start with a 0xdd
        int frameStart = 0;
        int processedTo = 0;
        while(frameStart < wpos) {
            if ( buffer[frameStart] == START_OF_PACKET && frameStart+4 < wpos) {
                int nextFrameStart = processFrame(frameStart);
                if (nextFrameStart > 0) {
                    processedTo = nextFrameStart;
                    frameStart = nextFrameStart;
                } else {
                    frameStart++;
                }
            } else {
                frameStart++;
            }
        }
        if ( processedTo > 0) {
            for(int i = 0; i+processedTo < wpos; i++) {
                buffer[i] = buffer[i+processedTo];
            }
            wpos = wpos-processedTo;
        } else {

        }
    }
    // send out the next register request.
    unsigned long now = millis();
    if ( (now - lastSend) > 1000) {
        lastSend = now;
        if ( reg > maxReqRegs) {
            reg = REQ_REGSTART;
        }
        requestRegister(reg);
        reg++;
    }
}

void JdbBMS::requestRegister(uint8_t regNo) {
    uint16_t checkSum = 0x10000 - regNo;
    // NB bytes here are bigendian before sending to the BMS.
    byte cmd[] = {0xdd, 0xa5, regNo, 0x0, (byte)((checkSum&0xff00)>>8), (byte)(checkSum&0xff), 0x77};
    if ( debug ) {
        Serial.print("BMS Request 0x");
        Serial.println(regNo,HEX);
    }
    io->write(cmd, 7);
}

int JdbBMS::processFrame(int from) {
    int responseReg = buffer[from+1];
    int errorCode = buffer[from+2];
    int dataLength = buffer[from+3];
    int checkSumPos = from+4+dataLength;
    int endPacketPos = from+6+dataLength;
    if ( endPacketPos > wpos) {
        return -1;
    }
    if ( buffer[endPacketPos] != END_OF_PACKET ) {
        return -1;
    }
    uint16_t sum = 0;
    for(int i = from+2; i < checkSumPos; i++) {
        sum = sum+buffer[i];
    }
    sum = 0x10000-sum;
    if ( (((sum&0xff00)>>8) != buffer[checkSumPos]) 
        || ((sum&0xff) != buffer[checkSumPos+1]) ) {
        return -1;
    } 

    if ( errorCode != RESPONSE_OK) {
        dumpBuffer("Error Frame",buffer, from, endPacketPos);
        return -1;
    }
    dumpBuffer("Got Frame",buffer, from, endPacketPos);
    // buffer checks out, save it.
    if ( responseReg == 0x03) {
        copyReg03(&buffer[from+4], dataLength);
        register03Length = dataLength;
        sid++;
    } else if (responseReg == 0x04) {
        copyReg04(&buffer[from+4], dataLength);
        register04Length = dataLength;
    } else if (responseReg == 0x05) {
        copyReg05(&buffer[from+4], dataLength);
        register05Length = dataLength;
        maxReqRegs = 4; // only require 0x05 once.
        reg = 3;
    }
    return endPacketPos+1;
}


void JdbBMS::copyReg03(uint8_t * data, size_t dataLength) {
    for (int i = 0; i < dataLength && i < register03Length; i++) {
        register03[i] = data[i];
    }
    // byteswap as required to make the register littleendian.
    // the bms is bigendian, CAN is littleendian. What a pain.
    for(int i = 0; i < REG_SOFTWARE_VERSION_U8 && i < register03Length; i+=2) {
        swapBytes(register03, i);
    }
    int nNTC = getUInt8(REG_NTC_COUNT_U8,register03,register03Length);
    for(int i = REG_NTC_READINGS_U16(0); i < REG_NTC_READINGS_U16(nNTC) && i < register03Length; i+=2) {
        swapBytes(register03, i);
    }
    for(int i = REG_ALARM_STATUS_U16(nNTC); i < register03Length; i+=2) {
        swapBytes(register03, i);
    }

}

void inline JdbBMS::swapBytes(uint8_t * d, uint8_t i) {
    uint8_t b = d[i];
    d[i] = d[i+1];
    d[i+1] = b;
}


void JdbBMS::copyReg04(uint8_t * data, size_t dataLength) {
    // copy and switch endian
    for (int i = 0; i < dataLength-1 && i < BMS_REGISTER04_LENGTH-1; i+=2) {
        register04[i] = data[i+1];
        register04[i+1] = data[i];
    }
}
void JdbBMS::copyReg05(uint8_t * data, size_t dataLength) {
    for (int i = 0; i < dataLength && i < BMS_REGISTER05_LENGTH; i++) {
        register05[i] = data[i];
    }
}


double JdbBMS::getUDouble(uint8_t offset, double factor, uint8_t * data, size_t dataLength  ) {
    if ( offset+1 >= dataLength ) {
        dumpNa();
        return -1e9;
    }
    dump2Bytes(data, offset);
    uint16_t v =  (data[offset]&0xff) | ((data[offset+1]<<8)&0xff00); 
    if ( v == 0xffff) {
        return -1e9;
    }
    return factor * v; 
}


double JdbBMS::getDouble(uint8_t offset, double factor, uint8_t * data, size_t dataLength  ) {
    if ( offset+1 >= dataLength) {
        dumpNa();
        return -1e9;
    }
    dump2Bytes(data, offset);
    int16_t v =  (data[offset]&0xff) | ((data[offset+1]<<8)&0xff00);
    if ( v == 0x7fff) {
        return -1e9;
    }
    return factor * v; 
}
uint16_t JdbBMS::getUInt16(uint8_t offset, uint8_t * data, size_t dataLength  ) {
    if ( offset+1 >= dataLength) {
        dumpNa();
        return 0xffff;
    }
    dump2Bytes(data, offset);
    return (data[offset]&0xff) | ((data[offset+1]<<8)&0xff00);
}
uint8_t JdbBMS::getUInt8(uint8_t offset, uint8_t * data, size_t dataLength  ) {
    if ( offset >= dataLength) {
        dumpNa();
        return 0xff;
    }
    dump1Byte(data, offset);
    return data[offset];
}
uint16_t JdbBMS::getDaysSince1970(uint8_t offset, uint8_t * data, size_t dataLength) {
    if ( offset+1 >= dataLength ) {
        dumpNa();
        return 0xffff;
    }
    dump2Bytes(data, offset);
    uint16_t timeEnc = (data[offset]&0xff) | ((data[offset+1]<<8)&0xff00); 
    if ( timeEnc == 0xffff) {
        return 0;
    }

    tmElements_t tm;
    tm.Second = 0;
    tm.Minute = 0;
    tm.Hour = 0;
    tm.Day = timeEnc&0x1f;
    tm.Month = (timeEnc&0x1e0)>>5;
    tm.Year = (((timeEnc&0xfe00)>>9)+2000)-1970;
    return elapsedDays(makeTime(tm));
}




bool JdbBMS::setN2KMsg(tN2kMsg &N2kMsg) {
// build and send the messages 
    unsigned long now = millis();
    // 0x1F214: PGN 127508 - Battery Status
    if ( (now - last127508) > BMS_PERIOD_127508) {
        last127508 = now;
        double voltage = getUDouble(REG_VOLTAGE_U16, 0.01, register03, register03Length);
        double current = getDouble(REG_CURRENT_S16, 0.01, register03, register03Length);
        uint8_t nNTC = getUInt8(REG_NTC_COUNT_U8, register03, register03Length);
        double temperature = -1e9;
        if ( nNTC > 0 && nNTC != 0xff ) {
            temperature = getUDouble(REG_NTC_READINGS_U16(nNTC-1), 0.1, register03, register03Length);
        }
        dumpReg03();
        SetN2kDCBatStatus(N2kMsg,batteryInstance,voltage,current,temperature,sid);
        return true;
    }

      // 0x1F212: PGN 127506 - DC Detailed Status
    if ( (now - last127506) > BMS_PERIOD_127506) {
        last127506 = now;
        // 0x1F214: PGN 127506 - Battery Status
        uint16_t chageCycles = getUInt16(REG_CHARGE_CYCLES_U16, register03, register03Length);
        double current = getDouble(REG_CURRENT_S16, 0.01, register03, register03Length);
        double capacity = getUDouble(REG_PACK_CAPACITY_U16, 0.01, register03, register03Length);
        uint8_t soc = getUInt8(REG_SOC_U8, register03, register03Length);
        double health = 100*(8000-chageCycles)/8000;
        double timeRemaining = 3600.0*(capacity/current);
        SetN2kDCStatus(N2kMsg,sid,batteryInstance,N2kDCt_Battery,soc,(uint8_t)health,timeRemaining,N2kDoubleNA,capacity*3600.0);
        return true;
    }

    // 0x1F219: PGN 127513 - Battery Configuration Status
    // doesnt really fit well with a bms
    if ( (now - last127513) > BMS_PERIOD_127513) {
        last127513 = now;
        double fullCapacity = getUDouble(REG_FULL_CAPACITY_U16, 0.01, register03, register03Length);
        SetN2kBatConf(N2kMsg,batteryInstance,N2kDCbt_Gel,N2kDCES_Yes,N2kDCbnv_12v,N2kDCbc_LiIon,fullCapacity*3600.0,1,1.0,99);
        return true;
    }

    // send reg03, reg04 and reg05 as proprietary messages
    // all need to be sent as a fast packet message.
    // all are variable length.
    // 126720 is probably very overloaded and not possible to filter using
    // the PGN alone
    // Proprietary Fast packets are 130816 - 131071
    // 130829 is not used widely (only Dometic ice maker found to emit) 
    // its unlikely that its going to be seen, but must use manfacture code etc
    // Manufacturer code == 2046 see main.cpp
    // Industry code == 4 Marine
    // 
/*
ManufactureID 2046 ==      11111111110
Reserved                 11
Marine           4 == 100
                      1001111111111110
*/
#define BMS_PROPRIETARY_CODE 0x9ffe // 2046 & 0x7FE | 0x3<<11 | 0x04<<13
#define BMS_PROPRIETARY_PGN 130829L
    if ( (now - lastRegO3) > BMS_PERIOD_REG03) {
        lastRegO3 = now;
        N2kMsg.SetPGN(BMS_PROPRIETARY_PGN);
        N2kMsg.Priority=6;
        N2kMsg.Add2ByteUInt(BMS_PROPRIETARY_CODE);
        N2kMsg.AddByte(batteryInstance); 
        N2kMsg.AddByte(3); 
        N2kMsg.AddByte(register03Length); 




        for (int i = 0; i < register03Length; i++) {
            N2kMsg.AddByte(register03[i]); 
        }
        dumpBuffer("Sent ", register03, 0, register03Length);
        return true;
    }
    if ( (now - lastRegO4) > BMS_PERIOD_REG04) {
        lastRegO4 = now;
        N2kMsg.SetPGN(BMS_PROPRIETARY_PGN);
        N2kMsg.Priority=6;
        N2kMsg.Add2ByteUInt(BMS_PROPRIETARY_CODE);
        N2kMsg.AddByte(batteryInstance); 
        N2kMsg.AddByte(4); 
        N2kMsg.AddByte(register04Length); 
        for (int i = 0; i < register04Length; i++) {
            N2kMsg.AddByte(register04[i]); 
        }
        return true;
    }
    if ( (now - lastRegO5) > BMS_PERIOD_REG05) {
        lastRegO5 = now;
        N2kMsg.SetPGN(BMS_PROPRIETARY_PGN);
        N2kMsg.Priority=6;
        N2kMsg.Add2ByteUInt(BMS_PROPRIETARY_CODE);
        N2kMsg.AddByte(batteryInstance); 
        N2kMsg.AddByte(5); 
        // the first byte of reg05 is the length, so not sending 2x lengths.
        for (int i = 0; i < register05Length; i++) {
            N2kMsg.AddByte(register05[i]); 
        }
        return true;
    }



    // 0x1F403: PGN 128003 - Electric Energy Storage Status, Rapid Update
    /*
    at the moment covered by 127508 so wont be sending.
    if ( (now - last128003) > BMS_PERIOD_128003) {
        last128003 = now;
        N2kMsg.SetPGN(128003L);
        N2kMsg.Priority=6;
        N2kMsg.AddByte(1); // battery id
        N2kMsg.AddByte(0x00); // Battery Status 2 bits, Isolation Status 2 bits, error 4 bits
        N2kMsg.Add2ByteUDouble(bms->voltage,0.1);
        N2kMsg.Add2ByteDouble(bms->current,0.1);
        N2kMsg.Add2ByteUInt(0xffff);
        sendMsg(N2kMsg);
    }
    */
    /*
    not enough support for this at the moment.
    0x1F207: PGN 127495 - Electric Energy Storage Information
    */
    return false;
}

void JdbBMS::dumpBuffer(const char *msg, uint8_t *b, uint8_t s, uint8_t e) {

    if ( debug ) {
        Serial.print(msg);
        for(int i = s; i < e; i++) {
            Serial.print(" ");
            Serial.print(b[i],HEX);
        }
        Serial.println("");        
    }
}

void JdbBMS::dumpReg03() {
    if ( debug ) {    
        Serial.print("Reg03 dataLength:");Serial.println(register03Length);
        int nNTC = getUInt8(REG_NTC_COUNT_U8, register03, register03Length);
        Serial.print("  calcLength:");Serial.println(REG_BALLANCE_CURRENT_U16(nNTC)+2);
        Serial.print("  voltage:");Serial.println(getUDouble(REG_VOLTAGE_U16, 0.01, register03, register03Length));
        Serial.print("  current:");Serial.println(getDouble(REG_CURRENT_S16, 0.01, register03, register03Length));
        Serial.print("  remaining:");Serial.println(getUDouble(REG_PACK_CAPACITY_U16, 0.01, register03, register03Length));
        Serial.print("  full:");Serial.println(getUDouble(REG_FULL_CAPACITY_U16,  0.01, register03, register03Length));
        Serial.print("  cycles:");Serial.println(getUInt16(REG_CHARGE_CYCLES_U16,  register03, register03Length));
        Serial.print("  production:");Serial.println(getUInt16(REG_PRODUCTION_DATE_U16, register03, register03Length), HEX);
        Serial.print("  status0:");Serial.println(getUInt16(REG_BAT0_15_STATUS_U16, register03, register03Length), HEX);
        Serial.print("  status1:");Serial.println(getUInt16(REG_BAT16_31_STATUS_U16, register03, register03Length), HEX);
        Serial.print("  errors:");Serial.println(getUInt16(REG_ERRORS_U16, register03, register03Length), HEX);
        Serial.print("  version:");Serial.println(getUInt8(REG_SOFTWARE_VERSION_U8, register03, register03Length), HEX);
        Serial.print("  soc:");Serial.println(getUInt8(REG_SOC_U8, register03, register03Length));
        Serial.print("  fet:");Serial.println(getUInt8(REG_FET_STATUS_U8, register03, register03Length), HEX);
        Serial.print("  cells:");Serial.println(getUInt8(REG_NUMBER_OF_CELLS_U8, register03, register03Length));
        Serial.print("  ntcCount:");Serial.println(getUInt8(REG_NTC_COUNT_U8, register03, register03Length));
        Serial.print("  ntc0:");Serial.println(getUDouble(REG_NTC_READINGS_U16(0), 0.1, register03, register03Length));
        Serial.print("  ntc1:");Serial.println(getUDouble(REG_NTC_READINGS_U16(1), 0.1, register03, register03Length));
        Serial.print("  ntc2:");Serial.println(getUDouble(REG_NTC_READINGS_U16(2), 0.1, register03, register03Length));
        Serial.print("  humidity:");Serial.println(getUInt8(REG_HUMIDITY_U8(nNTC), register03, register03Length)); // 55% humidity
        Serial.print("  alarm:");Serial.println(getUInt16(REG_ALARM_STATUS_U16(nNTC), register03, register03Length), HEX); // Alarm status
        Serial.print("  fullcharge:");Serial.println(getUDouble(REG_FULL_CHARGE_CAPACITY_U16(nNTC), 0.01, register03, register03Length)); // full charge capacit
        Serial.print("  remaining:");Serial.println(getUDouble(REG_REMAINING_CHARGE_CAPACITY_U16(nNTC), 0.01, register03, register03Length)); // remaining capacity
        Serial.print("  ballance:");Serial.println(getUDouble(REG_BALLANCE_CURRENT_U16(nNTC), 0.001, register03, register03Length)); // balance current
    }
}

void JdbBMS::dump2Bytes(uint8_t * data, uint8_t offset) {
    if ( debug ) {
        Serial.print(" [");
        Serial.print(offset);
        Serial.print(" ");
        Serial.print(data[offset], HEX);
        Serial.print(" ");
        Serial.print(data[offset+1], HEX);
        Serial.print("] ");        
    }
}
void JdbBMS::dump1Byte(uint8_t * data, uint8_t offset) {
    if ( debug ) {
        Serial.print(" [");
        Serial.print(offset);
        Serial.print(" ");
        Serial.print(data[offset], HEX);
        Serial.print("] ");        
    }
}
void JdbBMS::dumpNa() {
    if ( debug ) {
        Serial.print("[OV]");
    }    
}



