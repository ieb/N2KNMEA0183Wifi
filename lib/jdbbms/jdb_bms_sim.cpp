#define LOG_LOCAL_LEVEL ESP_LOG_INFO
#include "jdb_bms.h"
#include "esp_log.h"


#define TAG "BMSSim"

// Implementation of the siumlator, will respond to requests for 0x03, 0x04, and 0x05 registers.

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
#define REG_NTC_READINGS_U16     23

#define START_OF_PACKET     0xDD          
#define END_OF_PACKET       0x77          
#define REQ_OPERATION_READ  0xA5          
#define REQ_OPERATION_WRITE 0x5A          
#define RESPONSE_OK    0x00
#define RESPONSE_ERROR 0x80



void JBDBmsSimulator::setUDouble(uint8_t *reg, uint8_t regOff, double v, double f) {
    uint16_t rv = v/f;
    reg[regOff] = (rv&0xff00)>>8;
    reg[regOff+1] = (rv&0xff);
}
void JBDBmsSimulator::setDouble(uint8_t *reg, uint8_t regOff, double v, double f) {
    int16_t rv = v/f;
    reg[regOff] = (rv&0xff00)>>8;
    reg[regOff+1] = (rv&0xff);
}
void JBDBmsSimulator::setUInt(uint8_t *reg, uint8_t regOff, uint16_t rv) {
    reg[regOff] = (rv&0xff00)>>8;
    reg[regOff+1] = (rv&0xff);
}
void JBDBmsSimulator::setUInt8(uint8_t *reg, uint8_t regOff, uint8_t rv) {
    reg[regOff] = (rv&0xff);
}
uint16_t JBDBmsSimulator::encodeDate(uint16_t y, uint8_t m, uint8_t d) {
    return (d&0x1f) | (((m&0xff)<<5)&0x1e0) | ((((y-2000)&0xff)<<9)&0xfe00); 
}

uint8_t JBDBmsSimulator::updateReg03(uint8_t *reg, double voltage, double current, double capacity) {
    setUDouble(reg, REG_VOLTAGE_U16, voltage, 0.01);
    setDouble(reg, REG_CURRENT_S16, current, 0.01);
    setUDouble(reg, REG_PACK_CAPACITY_U16, capacity, 0.01);
    setUDouble(reg, REG_FULL_CAPACITY_U16, 304, 0.01);
    setUInt(reg, REG_CHARGE_CYCLES_U16, 386);
    setUInt(reg, REG_PRODUCTION_DATE_U16, encodeDate(2020,12,24));
    setUInt(reg, REG_BAT0_15_STATUS_U16, 0x05);
    setUInt(reg, REG_BAT16_31_STATUS_U16, 0xf0f0);
    setUInt(reg, REG_ERRORS_U16, 0xf0f0);
    setUInt8(reg, REG_SOFTWARE_VERSION_U8, 0x11);
    setUInt8(reg, REG_SOC_U8, 89);
    setUInt8(reg, REG_FET_STATUS_U8, 0x03);
    setUInt8(reg, REG_NUMBER_OF_CELLS_U8,4);
    setUInt8(reg, REG_NTC_COUNT_U8, 3);
    setUDouble(reg, REG_NTC_READINGS_U16, 27.3+273.15, 0.1);
    setUDouble(reg, REG_NTC_READINGS_U16+2, 23.3+273.15, 0.1);
    setUDouble(reg, REG_NTC_READINGS_U16+4, 22.3+273.15, 0.1);
    setUInt8(reg, REG_NTC_READINGS_U16+6, 55); // 55% humidity
    setUInt(reg, REG_NTC_READINGS_U16+7, 0x0); // Alarm status
    setUDouble(reg, REG_NTC_READINGS_U16+9, 304, 0.01); // full charge capacit
    setUDouble(reg, REG_NTC_READINGS_U16+11, capacity, 0.01); // remaining capacity
    setUDouble(reg, REG_NTC_READINGS_U16+13, 0.5582, 0.001); // balance current
    return REG_NTC_READINGS_U16+15;
}
uint8_t JBDBmsSimulator::updateReg04(uint8_t *reg) {
    setUDouble(reg, 0, 3.123, 0.001);
    setUDouble(reg, 2, 3.14, 0.001);
    setUDouble(reg, 4, 3.15, 0.001);
    setUDouble(reg, 6, 3.16, 0.001);
    return 8;
}
uint8_t JBDBmsSimulator::updateReg05(uint8_t *reg) {
    reg[0] = 5;
    reg[1] = 'M';
    reg[2] = 'Y';
    reg[3] = 'B';
    reg[4] = 'M';
    reg[5] = 'S';
    return 6;
}


uint8_t JBDBmsSimulator::createReg03Response(uint8_t *buffer, double voltage, double current, double capacity) {
    buffer[0] = START_OF_PACKET;
    buffer[1] = 0x03;
    buffer[2] = RESPONSE_OK;
    buffer[3] = updateReg03(&buffer[4], voltage, current, capacity);
    return finish(buffer);
}
uint8_t JBDBmsSimulator::createReg04Response(uint8_t *buffer) {
    buffer[0] = START_OF_PACKET;
    buffer[1] = 0x04;
    buffer[2] = RESPONSE_OK;
    buffer[3] = updateReg04(&buffer[4]);
    return finish(buffer);

}
uint8_t JBDBmsSimulator::createReg05Response(uint8_t *buffer) {
    buffer[0] = START_OF_PACKET;
    buffer[1] = 0x05;
    buffer[2] = RESPONSE_OK;
    buffer[3] = updateReg05(&buffer[4]);
    return finish(buffer);
}
uint8_t JBDBmsSimulator::createErrorResponse(uint8_t *buffer, uint8_t regNo) {
    buffer[0] = START_OF_PACKET;
    buffer[1] = regNo;
    buffer[2] = RESPONSE_ERROR;
    buffer[3] = 0;
    return finish(buffer);
}

uint16_t JBDBmsSimulator::finish(uint8_t *buffer) {
     uint16_t sum = 0;
     uint8_t checkSumPos = buffer[3]+4;
    for(int i = 2; i < checkSumPos; i++) {
        sum = sum+buffer[i];
    }
    sum = 0x10000-sum;
    buffer[checkSumPos] = (sum&0xff00)>>8;
    buffer[checkSumPos+1] = (sum&0xff);
    buffer[checkSumPos+2] = END_OF_PACKET;
    return checkSumPos+3;
}


  // Stream implementation
int JBDBmsSimulator::read() {
    int b = buffer[0];
    for (int i = 0; i < bend-1; i++) {
        buffer[i] = buffer[i+1];
    }
    bend--;
    return b;
}
int JBDBmsSimulator::available() {
    return bend;
}
int JBDBmsSimulator::peek() {
    return buffer[0];
}

  // Print implementation
size_t JBDBmsSimulator::write(uint8_t val) {
    if ( rstate == 0 && val == 0xdd) {
        rstate = 1;
    } else if ( rstate == 1 ) {
        if ( val == 0xa5 ) {
            rstate = 2;
        } else {
            rstate = 0;
        }
    } else if ( rstate == 2  ) {
        reg = val;
        rstate = 3;
    } else if ( rstate == 3 && val == 0x00  ) {
        rstate = 4;
    } else if ( rstate == 4 ) {
        csum = val<<8;
        rstate = 5;
    } else if ( rstate == 5 ) {
        csum = csum | val;
        rstate = 6;
    } else if ( rstate == 6 ) {
        if ( val == 0x77 ) {
            if ( reg == 0x03 && csum == 0xfffd ) {
                bend += createReg03Response(&buffer[bend], 12.4, 4.5, 280);
                dumpBuffer("Responding with reg03");
            } else if ( reg == 0x04 && csum == 0xfffc ) {
                bend += createReg04Response(&buffer[bend]);                
                dumpBuffer("Responding with reg04");
            } else if ( reg == 0x05 && csum == 0xfffb ) {
                bend += createReg05Response(&buffer[bend]);                
                dumpBuffer("Responding with reg05");
            } else {
                bend += createErrorResponse(&buffer[bend], reg);
                dumpBuffer("Responding with error");
            }
        }
        rstate = 0;
    }
    return 1;
}
size_t JBDBmsSimulator::write(const uint8_t *buf, size_t size) {
    ESP_LOGE(TAG, "Recieved");
    ESP_LOG_BUFFER_HEXDUMP(TAG, buf, size, ESP_LOG_ERROR);
    for (int i = 0; i < size; i++) {
        write(buf[i]);
    }
    return size;
}

void JBDBmsSimulator::dumpBuffer(const char * msg) {
    ESP_LOGE(TAG, "%s", msg);
    ESP_LOG_BUFFER_HEXDUMP(TAG, buffer, bend, ESP_LOG_ERROR);
}
void JBDBmsSimulator::flush() {

}

