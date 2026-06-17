#pragma once

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define BW_MAGIC_ENGINE        0xDD
#define BW_ENGINE_PAYLOAD_LEN  32

typedef struct {
    double   rpm;               // rpm;  <= -1e8 => not available
    double   coolantTemp;       // K
    double   alternatorTemp;    // K   (from PGN 127489 oil-temp slot - remapped by N2KEngine)
    double   alternatorVolts;   // V
    double   oilPressure;       // Pa
    double   exhaustTemp;       // K   (PGN 130312/130316 source 14)
    double   engineRoomTemp;    // K   (PGN 130312/130316 source 3)
    double   engineBattVolts;   // V   (PGN 127508 instance 0)
    double   fuelLevel;         // %   (PGN 127505 instance 0, diesel)
    uint32_t engineHours;       // seconds; 0xFFFFFFFF => not available
    uint16_t status1;           // PGN 127489 status1 bitmap; 0xFFFF => not available
    uint16_t status2;           // PGN 127489 status2 bitmap; 0xFFFF => not available
    double   rawWaterFlow;      // l/m FlowMeter
    double   rawWaterTemp;      // L   FlowMeter
    uint8_t  rawWaterStatus;     // Bitmap FlowMeter

} EngineBlePayload;

static inline void _engineWriteU16LE(uint8_t* buf, size_t* pos, double val,
                                     double scale, uint16_t na) {
    // Round to nearest to avoid FP-precision truncation surprises (e.g.
    // 22.0 + 273.15 stored as 295.14999... -> 29514 instead of 29515).
    uint16_t v = (val <= -1e8) ? na : (uint16_t)(val * scale + 0.5);
    buf[(*pos)++] = (uint8_t)(v & 0xFF);
    buf[(*pos)++] = (uint8_t)((v >> 8) & 0xFF);
}

static inline void _engineWriteU32LE(uint8_t* buf, size_t* pos, uint32_t val) {
    buf[(*pos)++] = (uint8_t)(val & 0xFF);
    buf[(*pos)++] = (uint8_t)((val >> 8) & 0xFF);
    buf[(*pos)++] = (uint8_t)((val >> 16) & 0xFF);
    buf[(*pos)++] = (uint8_t)((val >> 24) & 0xFF);
}

// Initialise payload with all fields marked "not available". Used to prime
// the characteristic buffer before any engine PGN has arrived, so apps
// connecting early read / receive a valid sentinel frame instead of zeros.
static inline void engineBlePayloadInitNA(EngineBlePayload* p) {
    p->rpm              = -1e9;
    p->coolantTemp      = -1e9;
    p->alternatorTemp   = -1e9;
    p->alternatorVolts  = -1e9;
    p->oilPressure      = -1e9;
    p->exhaustTemp      = -1e9;
    p->engineRoomTemp   = -1e9;
    p->engineBattVolts  = -1e9;
    p->fuelLevel        = -1e9;
    p->engineHours      = 0xFFFFFFFFu;
    p->status1          = 0xFFFF;
    p->status2          = 0xFFFF;
    p->rawWaterFlow     = -1e9;
    p->rawWaterTemp     = -1e9;
    p->rawWaterStatus   = 0xFF;
}

static inline size_t encodeEngineBle(uint8_t* buf, const EngineBlePayload* p) {
    size_t pos = 0;
    buf[pos++] = BW_MAGIC_ENGINE;
    _engineWriteU16LE(buf, &pos, p->rpm,              4.0,   0xFFFF); // 0.25 rpm/bit
    _engineWriteU32LE(buf, &pos, p->engineHours);                      // 1 s/bit, 0xFFFFFFFF NA
    _engineWriteU16LE(buf, &pos, p->coolantTemp,      100.0, 0xFFFF); // 0.01 K/bit
    _engineWriteU16LE(buf, &pos, p->alternatorTemp,   100.0, 0xFFFF);
    _engineWriteU16LE(buf, &pos, p->alternatorVolts,  100.0, 0xFFFF); // 0.01 V/bit
    _engineWriteU16LE(buf, &pos, p->oilPressure,      0.01,  0xFFFF); // 100 Pa/bit
    _engineWriteU16LE(buf, &pos, p->exhaustTemp,      100.0, 0xFFFF); 
    _engineWriteU16LE(buf, &pos, p->engineRoomTemp,   100.0, 0xFFFF);
    _engineWriteU16LE(buf, &pos, p->engineBattVolts,  100.0, 0xFFFF);
    _engineWriteU16LE(buf, &pos, p->fuelLevel,        250.0, 0xFFFF); // 0.004 %/bit
    buf[pos++] = (uint8_t)(p->status1 & 0xFF);
    buf[pos++] = (uint8_t)((p->status1 >> 8) & 0xFF);
    buf[pos++] = (uint8_t)(p->status2 & 0xFF);
    buf[pos++] = (uint8_t)((p->status2 >> 8) & 0xFF);
    // added with Flowmeter, clients may not support.
    _engineWriteU16LE(buf, &pos, p->rawWaterFlow,  100.0, 0xFFFF); 
    _engineWriteU16LE(buf, &pos, p->rawWaterTemp,  100.0, 0xFFFF); // 0.004 %/bit
    buf[pos++] = (uint8_t)(p->rawWaterStatus & 0xFF);
    return pos;
}

#ifdef __cplusplus
}
#endif
