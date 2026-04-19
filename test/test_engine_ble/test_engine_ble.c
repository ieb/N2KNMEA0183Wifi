#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include <assert.h>

#include "engine_ble_encoder.h"

static int fails = 0;

static void dumpHex(const char* label, const uint8_t* buf, size_t n) {
    printf("%s:", label);
    for (size_t i = 0; i < n; i++) printf(" %02X", buf[i]);
    printf("\n");
}

static int expectBytes(const char* name, const uint8_t* got, const uint8_t* exp, size_t n) {
    if (memcmp(got, exp, n) != 0) {
        printf("FAIL %s\n", name);
        dumpHex("  got", got, n);
        dumpHex("  exp", exp, n);
        fails++;
        return 0;
    }
    printf("PASS %s\n", name);
    return 1;
}

static void test_golden_example(void) {
    // Matches the "Example payload" in docs/ble-transport.md, section "Engine State (0xFF02)"
    EngineBlePayload p;
    p.rpm              = 1800.0;
    p.engineHours      = 1954800u;          // 543 hours in seconds
    p.coolantTemp      = 85.0 + 273.15;     // 85 degC -> 358.15 K
    p.alternatorTemp   = 75.0 + 273.15;     // 75 degC -> 348.15 K
    p.alternatorVolts  = 14.20;
    p.oilPressure      = 350000.0;          // 350 kPa in Pa
    p.exhaustTemp      = 320.0 + 273.15;    // 320 degC -> 593.15 K
    p.engineRoomTemp   = 22.0 + 273.15;     // 22 degC -> 295.15 K
    p.engineBattVolts  = 12.60;
    p.fuelLevel        = 75.0;              // %
    p.status1          = 0x0000;
    p.status2          = 0x0000;

    uint8_t buf[BW_ENGINE_PAYLOAD_LEN] = {0};
    size_t n = encodeEngineBle(buf, &p);
    if (n != BW_ENGINE_PAYLOAD_LEN) {
        printf("FAIL golden: length %zu != %d\n", n, BW_ENGINE_PAYLOAD_LEN);
        fails++;
        return;
    }

    const uint8_t expected[BW_ENGINE_PAYLOAD_LEN] = {
        0xDD,
        0x20, 0x1C,                         // rpm 1800 * 4 = 7200
        0xF0, 0xD3, 0x1D, 0x00,             // hours 1,954,800 (543 * 3600)
        0xE7, 0x8B,                         // coolant 35815
        0xFF, 0x87,                         // alt temp 34815
        0x8C, 0x05,                         // alt V 1420
        0xAC, 0x0D,                         // oil 3500
        0xB3, 0xE7,                         // exhaust 59315
        0x4B, 0x73,                         // engine room 29515
        0xEC, 0x04,                         // batt 1260
        0x3E, 0x49,                         // fuel 18750
        0x00, 0x00,                         // status1
        0x00, 0x00                          // status2
    };
    expectBytes("golden_example", buf, expected, BW_ENGINE_PAYLOAD_LEN);
}

static void test_all_sentinels(void) {
    EngineBlePayload p;
    p.rpm = p.coolantTemp = p.alternatorTemp = p.alternatorVolts = -1e9;
    p.oilPressure = p.exhaustTemp = p.engineRoomTemp = -1e9;
    p.engineBattVolts = p.fuelLevel = -1e9;
    p.engineHours = 0xFFFFFFFFu;
    p.status1 = 0xFFFF;
    p.status2 = 0xFFFF;

    uint8_t buf[BW_ENGINE_PAYLOAD_LEN] = {0};
    size_t n = encodeEngineBle(buf, &p);
    assert(n == BW_ENGINE_PAYLOAD_LEN);

    if (buf[0] != BW_MAGIC_ENGINE) {
        printf("FAIL all_sentinels: magic byte 0x%02X != 0xDD\n", buf[0]);
        fails++;
        return;
    }
    for (size_t i = 1; i < BW_ENGINE_PAYLOAD_LEN; i++) {
        if (buf[i] != 0xFF) {
            printf("FAIL all_sentinels: byte %zu = 0x%02X (expected 0xFF)\n", i, buf[i]);
            dumpHex("  got", buf, BW_ENGINE_PAYLOAD_LEN);
            fails++;
            return;
        }
    }
    printf("PASS all_sentinels\n");
}

static void test_partial_availability(void) {
    // Engine off but tank and hours still valid.
    EngineBlePayload p;
    p.rpm = p.coolantTemp = p.alternatorTemp = p.alternatorVolts = -1e9;
    p.oilPressure = p.exhaustTemp = p.engineRoomTemp = p.engineBattVolts = -1e9;
    p.engineHours = 1000;      // 1000 s
    p.fuelLevel   = 50.0;      // 50 %
    p.status1 = 0xFFFF;
    p.status2 = 0xFFFF;

    uint8_t buf[BW_ENGINE_PAYLOAD_LEN] = {0};
    encodeEngineBle(buf, &p);

    // Magic
    if (buf[0] != 0xDD) { printf("FAIL partial: magic\n"); fails++; return; }
    // rpm sentinel
    if (buf[1] != 0xFF || buf[2] != 0xFF) { printf("FAIL partial: rpm not sentinel\n"); fails++; return; }
    // hours = 1000 -> 0x000003E8 LE -> E8 03 00 00
    if (buf[3] != 0xE8 || buf[4] != 0x03 || buf[5] != 0x00 || buf[6] != 0x00) {
        printf("FAIL partial: hours\n"); dumpHex("got", buf, BW_ENGINE_PAYLOAD_LEN); fails++; return;
    }
    // coolant, alt temp, alt V, oil, exhaust, room, batt all sentinel (offsets 7..20)
    for (size_t i = 7; i <= 20; i++) {
        if (buf[i] != 0xFF) {
            printf("FAIL partial: byte %zu = 0x%02X (expected 0xFF)\n", i, buf[i]);
            fails++; return;
        }
    }
    // fuel = 50.0 * 250 = 12500 = 0x30D4 -> LE: D4 30
    if (buf[21] != 0xD4 || buf[22] != 0x30) {
        printf("FAIL partial: fuel got %02X %02X exp D4 30\n", buf[21], buf[22]);
        fails++; return;
    }
    // status1, status2 sentinels
    if (buf[23] != 0xFF || buf[24] != 0xFF || buf[25] != 0xFF || buf[26] != 0xFF) {
        printf("FAIL partial: status sentinels\n"); fails++; return;
    }
    printf("PASS partial_availability\n");
}

static void test_length(void) {
    EngineBlePayload p = {0};
    p.engineHours = 0;
    uint8_t buf[BW_ENGINE_PAYLOAD_LEN];
    size_t n = encodeEngineBle(buf, &p);
    if (n != BW_ENGINE_PAYLOAD_LEN) {
        printf("FAIL length: %zu != 27\n", n);
        fails++;
    } else {
        printf("PASS length\n");
    }
}

static void test_rpm_boundary(void) {
    EngineBlePayload p = {0};
    p.engineHours = 0;

    // RPM 0 -> 0x0000
    p.rpm = 0.0;
    uint8_t buf[BW_ENGINE_PAYLOAD_LEN];
    encodeEngineBle(buf, &p);
    if (buf[1] != 0x00 || buf[2] != 0x00) {
        printf("FAIL rpm_boundary: rpm=0 got %02X %02X\n", buf[1], buf[2]); fails++;
    } else {
        printf("PASS rpm_boundary_zero\n");
    }

    // RPM 16383.75 -> 65535 -> 0xFFFF (aliases with sentinel - documented behaviour)
    p.rpm = 16383.75;
    encodeEngineBle(buf, &p);
    if (buf[1] != 0xFF || buf[2] != 0xFF) {
        printf("FAIL rpm_boundary: rpm=16383.75 got %02X %02X\n", buf[1], buf[2]); fails++;
    } else {
        printf("PASS rpm_boundary_max (aliases sentinel by design)\n");
    }
}

int main(void) {
    test_golden_example();
    test_all_sentinels();
    test_partial_availability();
    test_length();
    test_rpm_boundary();
    if (fails) {
        printf("\n%d test(s) FAILED\n", fails);
        return 1;
    }
    printf("\nAll tests passed.\n");
    return 0;
}
