#pragma once

#include <Arduino.h>
#include <NimBLEDevice.h>
#include <functional>

// GATT UUIDs matching BoatWatch protocol
#define BW_SERVICE_UUID        "0000aa00-0000-1000-8000-00805f9b34fb"
#define BW_AUTOPILOT_CHAR_UUID "0000aa01-0000-1000-8000-00805f9b34fb"
#define BW_COMMAND_CHAR_UUID   "0000aa02-0000-1000-8000-00805f9b34fb"
#define BW_BATTERY_CHAR_UUID   "0000aa03-0000-1000-8000-00805f9b34fb"

// Binary protocol constants
#define BW_MAGIC_AUTOPILOT 0xAA
#define BW_MAGIC_BATTERY   0xBB
#define BW_MAGIC_AUTH_RESP 0xAF

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

// Autopilot mode values
#define BW_MODE_STANDBY  0
#define BW_MODE_COMPASS  1
#define BW_MODE_WIND_AWA 2
#define BW_MODE_WIND_TWA 3

// Notification intervals
#define BW_AUTOPILOT_INTERVAL_MS 200   // ~5 Hz
#define BW_BATTERY_INTERVAL_MS   1000  // ~1 Hz

class BoatWatchBLE : public NimBLEServerCallbacks,
                     public NimBLECharacteristicCallbacks {
public:
    using CommandCallback = std::function<void(uint8_t cmd, const uint8_t* payload, size_t len)>;

    void begin(const char* deviceName, const char* pin = "0000");
    void loop();

    // Set autopilot state for next notification
    void setAutopilotState(uint8_t mode, uint16_t heading, uint16_t targetHeading, int16_t targetWind);

    // Set battery state from BMS register data (little-endian, byte-swapped by JdbBMS)
    void setBatteryState(const uint8_t* reg03, size_t reg03Len,
                         const uint8_t* reg04, size_t reg04Len);

    // Set callback for autopilot commands (mode, heading, wind)
    void setCommandCallback(CommandCallback cb) { _commandCallback = cb; }

    bool isConnected() const { return _connected; }
    bool isAuthenticated() const { return _authenticated; }

private:
    // NimBLEServerCallbacks
    void onConnect(NimBLEServer* pServer) override;
    void onDisconnect(NimBLEServer* pServer) override;

    // NimBLECharacteristicCallbacks
    void onWrite(NimBLECharacteristic* pCharacteristic) override;

    void handleCommand(const uint8_t* data, size_t len);
    void sendAuthResponse(bool accepted);

    NimBLEServer* _server = nullptr;
    NimBLECharacteristic* _autopilotChar = nullptr;
    NimBLECharacteristic* _commandChar = nullptr;
    NimBLECharacteristic* _batteryChar = nullptr;

    CommandCallback _commandCallback;

    String _pin;
    bool _connected = false;
    bool _authenticated = false;

    // Autopilot state buffer (10 bytes)
    uint8_t _apBuffer[10] = {0};
    bool _apDirty = false;

    // Battery state buffer (max 64 bytes)
    uint8_t _batBuffer[64] = {0};
    uint8_t _batLen = 0;
    bool _batDirty = false;

    unsigned long _lastApNotify = 0;
    unsigned long _lastBatNotify = 0;
};
