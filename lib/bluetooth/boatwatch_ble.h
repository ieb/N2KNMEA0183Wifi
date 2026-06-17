#pragma once

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <functional>
#include <map>
#include "engine_ble_encoder.h"

// GATT UUIDs matching BoatWatch protocol
#define BW_SERVICE_UUID        "0000aa00-0000-1000-8000-00805f9b34fb"
#define BW_AUTOPILOT_CHAR_UUID "0000aa01-0000-1000-8000-00805f9b34fb"
#define BW_COMMAND_CHAR_UUID   "0000aa02-0000-1000-8000-00805f9b34fb"
#define BW_BATTERY_CHAR_UUID   "0000aa03-0000-1000-8000-00805f9b34fb"

// NMEABridge Nav Service
#define BW_NAV_SERVICE_UUID     "0000ff00-0000-1000-8000-00805f9b34fb"
#define BW_NAV_STATE_CHAR_UUID  "0000ff01-0000-1000-8000-00805f9b34fb"
#define BW_NAV_ENGINE_CHAR_UUID "0000ff02-0000-1000-8000-00805f9b34fb"

// Flowmeter Service recieve only

#define BW_FLOWMETER_SERVICE_UUID     "0000AC00-0000-1000-8000-00805f9b34fb"
#define BW_FLOWMETER_CHAR_UUID        "0000AC01-0000-1000-8000-00805f9b34fb"

// Binary protocol constants
#define BW_MAGIC_AUTOPILOT 0xAA
#define BW_MAGIC_BATTERY   0xBB
#define BW_MAGIC_AUTH_RESP 0xAF
#define BW_MAGIC_NAV       0xCC
// in engine_ble_encoder.h #define BW_MAGIC_ENGINE    0xDD
#define BW_MAGIC_FLOWMETER 0xEE

// BW_MAGIC_ENGINE and BW_ENGINE_PAYLOAD_LEN come from engine_ble_encoder.h

// Command IDs
#define BW_CMD_AUTH           0xF0
#define BW_CMD_STANDBY        0x01
#define BW_CMD_COMPASS        0x02
#define BW_CMD_WIND_AWA       0x03
#define BW_CMD_WIND_TWA       0x04
#define BW_CMD_SET_HEADING    0x10
#define BW_CMD_SET_WIND       0x11
#define BW_CMD_ADJUST_HEADING 0x20
#define BW_CMD_ADJUST_WIND    0x21
#define BW_CMD_ENABLE_NETWORK 0x40
#define BW_CMD_DISABLE_NETWORK 0x41
#define BW_CMD_FLOWMETER_UPDATE 0x50
// Autopilot mode values
#define BW_MODE_STANDBY  0
#define BW_MODE_COMPASS  1
#define BW_MODE_WIND_AWA 2
#define BW_MODE_WIND_TWA 3

// Notification intervals
#define BW_MAX_AUTOPILOT_INTERVAL_MS 5000   // max 5s
#define BW_MAX_BATTERY_INTERVAL_MS   5000   // max 5s
#define BW_NAV_INTERVAL_MS           1000   // 1 Hz
#define BW_MIN_NAV_INTERVAL_MS        500   // max 2Hz
#define BW_ENGINE_INTERVAL_MS        1000   // 1 Hz
#define BW_MIN_ENGINE_INTERVAL_MS     500   // max 2Hz

#define BW_MAX_FLOWMETER_INTERVAL_MS 5000

#define BLE_LED_PIN 8

#define BW_MAX_CLIENTS 3

// BLE auth brute-force hardening
#define BW_AUTH_LOCKOUT_FAILURES        5        // consecutive failures per connection before lockout
#define BW_AUTH_LOCKOUT_MS              30000UL  // 30 s lockout per connection
#define BW_AUTH_MAX_FAILURES            10       // per-connection total before force-disconnect
// Global counters survive reconnects, so an attacker cycling connections
// still accumulates toward a global lockout.
#define BW_AUTH_GLOBAL_LOCKOUT_FAILURES 20       // cumulative across all connections
#define BW_AUTH_GLOBAL_LOCKOUT_MS       300000UL // 5 min global lockout
// Disconnect clients that linger without authenticating.
#define BW_UNAUTH_IDLE_TIMEOUT_MS       30000UL  // 30 s to authenticate after connect

class BoatWatchBLE : public NimBLEServerCallbacks,
                     public NimBLECharacteristicCallbacks {
public:
    using CommandCallback = std::function<void(uint8_t cmd, const uint8_t* payload, size_t len)>;

    void begin(const char* deviceName, const char * _configurationFile = "/config.txt");
    void notify();

    // Set autopilot state for next notification
    void setAutopilotState(uint8_t mode, uint16_t heading, uint16_t targetHeading, int16_t targetWind);

    // Set navigation state for next notification (all angles in radians, speeds in m/s)
    void setNavState(double lat, double lon, double cog, double sog,
                     double variation, double heading, double depth,
                     double awa, double aws, double stw, uint32_t log);

    // Set battery state from BMS register data (little-endian, byte-swapped by JdbBMS)
    void setBatteryState(const uint8_t* reg03, size_t reg03Len,
                         const uint8_t* reg04, size_t reg04Len);




    // Set engine state for next notification on 0xFF02
    void setEngineState(const EngineBlePayload& p);



    // Set callback for autopilot commands (mode, heading, wind)
    void setCommandCallback(CommandCallback cb) { _commandCallback = cb; }

    bool hasAuthenticatedClients() const;

private:
    // NimBLEServerCallbacks
    void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override;
    void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override;

    // NimBLECharacteristicCallbacks
    void onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) override;

    void handleCommand(uint16_t connHandle, const uint8_t* data, size_t len, bool fromFlowMeter);
    void sendAuthResponse(uint16_t connHandle, bool accepted, bool fromFlowMeter);

    NimBLEServer* _server = nullptr;
    NimBLECharacteristic* _autopilotChar = nullptr;
    NimBLECharacteristic* _commandChar = nullptr;
    NimBLECharacteristic* _batteryChar = nullptr;
    NimBLECharacteristic* _navChar = nullptr;
    NimBLECharacteristic* _engineChar = nullptr;
    NimBLECharacteristic* _flowMeterChar = nullptr;
    

    CommandCallback _commandCallback;

    String _pin;

    // Per-connection auth state keyed by conn_handle.
    // Failure counter and lockout window thwart PIN brute-force: after
    // BW_AUTH_LOCKOUT_FAILURES consecutive failures the connection is blocked
    // from AUTH for BW_AUTH_LOCKOUT_MS; after BW_AUTH_MAX_FAILURES total
    // failures the client is force-disconnected.
    struct ClientState {
        bool authed;
        uint8_t failures;
        unsigned long blockUntilMs;
        unsigned long connectedAtMs;   // for unauthenticated-idle disconnect
    };
    std::map<uint16_t, ClientState> _clients;
    // Global auth state — survives reconnects so an attacker cycling
    // connections still progresses toward a global lockout.
    uint16_t      _globalAuthFailures = 0;
    unsigned long _globalBlockUntilMs = 0;

    // Autopilot state buffer (10 bytes)
    uint8_t _apBuffer[10] = {0};
    bool _apDirty = false;

    // Battery state buffer (max 64 bytes)
    uint8_t _batBuffer[64] = {0};
    uint8_t _batLen = 0;
    bool _batDirty = false;

    // Navigation state buffer (29 bytes)
    uint8_t _navBuffer[29] = {0};
    bool _navDirty = false;
    bool _ledOn = false;


    // Engine state buffer (32 bytes)
    uint8_t _engineBuffer[BW_ENGINE_PAYLOAD_LEN] = {0};
    bool _engineDirty = false;

    unsigned long _lastApNotify = 0;
    unsigned long _lastBatNotify = 0;
    unsigned long _lastNavNotify = 0;
    unsigned long _lastEngineNotify = 0;
    unsigned long _ledSwitch = 0;
};
