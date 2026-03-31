#pragma once

#include <Arduino.h>
#include <N2kMessages.h>
#include "boatwatch_ble.h"

/**
 * Accumulates autopilot state from incoming Raymarine N2K PGNs
 * for the BLE binary protocol.
 *
 * PGN 65379: Pilot mode (standby/compass/wind)
 * PGN 65359: Current heading
 * PGN 65360: Target/locked heading
 * PGN 65345: Wind datum target
 *
 * All are Raymarine proprietary PGNs with manufacturer bytes 0x3B 0x9F.
 */
struct AutopilotBleState {
    uint8_t mode = BW_MODE_STANDBY;
    uint16_t heading = 0;        // 0.01° units
    uint16_t targetHeading = 0;  // 0.01°
    int16_t targetWind = 0;      // 0.01°

    // Parse PGN 65379 — Raymarine Pilot Mode
    // Data: [0:1]=mfr(3B 9F), [2]=sid, [3]=mode, [4]=?, [5]=submode
    void handlePGN65379(const tN2kMsg& msg) {
        if (msg.DataLen < 6) return;
        uint8_t modeVal = msg.Data[3];
        uint8_t submode = msg.Data[5];
        if (modeVal == 0x00 && submode == 0x00) {
            mode = BW_MODE_STANDBY;
        } else if (modeVal == 0x40 && submode == 0x00) {
            mode = BW_MODE_COMPASS;
        } else if (modeVal == 0x00 && submode == 0x01) {
            mode = BW_MODE_WIND_AWA; // default wind mode
        }
    }

    // Parse PGN 65359 — Raymarine Current Heading
    // Data: [0:1]=mfr, [2]=sid, [3:4]=?, [5:6]=heading (radians*10000, U16 LE)
    void handlePGN65359(const tN2kMsg& msg) {
        if (msg.DataLen < 7) return;
        uint16_t raw = msg.Data[5] | (uint16_t(msg.Data[6]) << 8);
        if (raw != 0xFFFF) {
            double deg = raw / 10000.0 * 180.0 / M_PI;
            heading = uint16_t(fmod(deg, 360.0) * 100.0);
        }
    }

    // Parse PGN 65360 — Raymarine Target/Locked Heading
    // Same format as 65359
    void handlePGN65360(const tN2kMsg& msg) {
        if (msg.DataLen < 7) return;
        uint16_t raw = msg.Data[5] | (uint16_t(msg.Data[6]) << 8);
        if (raw != 0xFFFF) {
            double deg = raw / 10000.0 * 180.0 / M_PI;
            targetHeading = uint16_t(fmod(deg, 360.0) * 100.0);
        }
    }

    // Parse PGN 65345 — Raymarine Wind Datum
    // Data: [0:1]=mfr, [2:3]=datum (radians*10000, U16 LE), [4:5]=awa
    void handlePGN65345(const tN2kMsg& msg) {
        if (msg.DataLen < 4) return;
        uint16_t raw = msg.Data[2] | (uint16_t(msg.Data[3]) << 8);
        if (raw != 0xFFFF) {
            double deg = raw / 10000.0 * 180.0 / M_PI;
            if (deg > 180.0) deg -= 360.0;
            targetWind = int16_t(deg * 100.0);
        }
    }
};
