#define LOG_LOCAL_LEVEL ESP_LOG_INFO
#include "esp_log.h"
#include "boatwatch_ble.h"

static const char* TAG = "BW_BLE";

// BMS register offsets (big-endian in register buffer)
#define REG03_PACK_V_U16      0
#define REG03_CURRENT_S16     2
#define REG03_REMAINING_U16   4
#define REG03_FULL_U16        6
#define REG03_CYCLES_U16      8
#define REG03_ERRORS_U16      16
#define REG03_SOC_U8          19
#define REG03_FET_U8          20
#define REG03_NCELLS_U8       21
#define REG03_NNTC_U8         22
// NTC temps start at offset 23 (each U16 big-endian)

// Helper: read big-endian U16 from BMS register buffer
static uint16_t beU16(const uint8_t* d, uint8_t off, size_t len) {
    if (off + 2 > len) return 0;
    return (uint16_t(d[off]) << 8) | d[off + 1];
}

// Helper: read big-endian S16 from BMS register buffer
static int16_t beS16(const uint8_t* d, uint8_t off, size_t len) {
    return (int16_t)beU16(d, off, len);
}

void BoatWatchBLE::begin(const char* deviceName, const char* pin) {
    _pin = pin;

    NimBLEDevice::init(deviceName);
    NimBLEDevice::setMTU(64);

    _server = NimBLEDevice::createServer();
    _server->setCallbacks(this);

    NimBLEService* service = _server->createService(BW_SERVICE_UUID);

    // AA01 — Autopilot state (NOTIFY + READ)
    _autopilotChar = service->createCharacteristic(
        BW_AUTOPILOT_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    // AA02 — Command (WRITE + WRITE_NR)
    _commandChar = service->createCharacteristic(
        BW_COMMAND_CHAR_UUID,
        NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
    );
    _commandChar->setCallbacks(this);

    // AA03 — Battery state (NOTIFY + READ)
    _batteryChar = service->createCharacteristic(
        BW_BATTERY_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    service->start();

    // Start advertising
    NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(BW_SERVICE_UUID);
    advertising->setName(deviceName);
    advertising->start();

    ESP_LOGI(TAG, "BLE server started: %s (PIN: %s)", deviceName, pin);
}

void BoatWatchBLE::loop() {
    if (!_connected || !_authenticated) return;

    unsigned long now = millis();

    // Autopilot notifications at ~5 Hz
    if (_apDirty && (now - _lastApNotify >= BW_AUTOPILOT_INTERVAL_MS)) {
        _autopilotChar->setValue(_apBuffer, 10);
        _autopilotChar->notify();
        _lastApNotify = now;
        _apDirty = false;
    }

    // Battery notifications at ~1 Hz
    if (_batDirty && _batLen > 0 && (now - _lastBatNotify >= BW_BATTERY_INTERVAL_MS)) {
        _batteryChar->setValue(_batBuffer, _batLen);
        _batteryChar->notify();
        _lastBatNotify = now;
        _batDirty = false;
    }
}

void BoatWatchBLE::setAutopilotState(uint8_t mode, uint16_t heading,
                                      uint16_t targetHeading, int16_t targetWind) {
    _apBuffer[0] = BW_MAGIC_AUTOPILOT;
    _apBuffer[1] = mode;
    // Little-endian U16
    _apBuffer[2] = heading & 0xFF;
    _apBuffer[3] = (heading >> 8) & 0xFF;
    _apBuffer[4] = targetHeading & 0xFF;
    _apBuffer[5] = (targetHeading >> 8) & 0xFF;
    // Little-endian S16
    _apBuffer[6] = targetWind & 0xFF;
    _apBuffer[7] = (targetWind >> 8) & 0xFF;
    // Reserved
    _apBuffer[8] = 0;
    _apBuffer[9] = 0;
    _apDirty = true;
}

void BoatWatchBLE::setBatteryState(const uint8_t* reg03, size_t reg03Len,
                                    const uint8_t* reg04, size_t reg04Len) {
    if (reg03Len < 23) return; // minimum register length

    uint8_t nCells = (reg03Len > REG03_NCELLS_U8) ? reg03[REG03_NCELLS_U8] : 0;
    uint8_t nNtc = (reg03Len > REG03_NNTC_U8) ? reg03[REG03_NNTC_U8] : 0;
    if (nCells > 16) nCells = 16;
    if (nNtc > 5) nNtc = 5;

    uint8_t totalLen = 16 + nCells * 2 + 1 + nNtc * 2;
    if (totalLen > sizeof(_batBuffer)) return;

    uint8_t pos = 0;

    // Header (little-endian)
    _batBuffer[pos++] = BW_MAGIC_BATTERY;

    // Pack voltage (BMS big-endian → BLE little-endian)
    uint16_t packV = beU16(reg03, REG03_PACK_V_U16, reg03Len);
    _batBuffer[pos++] = packV & 0xFF;
    _batBuffer[pos++] = (packV >> 8) & 0xFF;

    // Current (signed)
    int16_t current = beS16(reg03, REG03_CURRENT_S16, reg03Len);
    _batBuffer[pos++] = current & 0xFF;
    _batBuffer[pos++] = (current >> 8) & 0xFF;

    // Remaining Ah
    uint16_t remAh = beU16(reg03, REG03_REMAINING_U16, reg03Len);
    _batBuffer[pos++] = remAh & 0xFF;
    _batBuffer[pos++] = (remAh >> 8) & 0xFF;

    // Full Ah
    uint16_t fullAh = beU16(reg03, REG03_FULL_U16, reg03Len);
    _batBuffer[pos++] = fullAh & 0xFF;
    _batBuffer[pos++] = (fullAh >> 8) & 0xFF;

    // SOC
    _batBuffer[pos++] = (reg03Len > REG03_SOC_U8) ? reg03[REG03_SOC_U8] : 0;

    // Cycles
    uint16_t cycles = beU16(reg03, REG03_CYCLES_U16, reg03Len);
    _batBuffer[pos++] = cycles & 0xFF;
    _batBuffer[pos++] = (cycles >> 8) & 0xFF;

    // Errors
    uint16_t errors = beU16(reg03, REG03_ERRORS_U16, reg03Len);
    _batBuffer[pos++] = errors & 0xFF;
    _batBuffer[pos++] = (errors >> 8) & 0xFF;

    // FET status
    _batBuffer[pos++] = (reg03Len > REG03_FET_U8) ? reg03[REG03_FET_U8] : 0;

    // N cells
    _batBuffer[pos++] = nCells;

    // Cell voltages from reg04 (big-endian → little-endian)
    for (uint8_t i = 0; i < nCells && (i * 2 + 1) < reg04Len; i++) {
        uint16_t cellV = beU16(reg04, i * 2, reg04Len);
        _batBuffer[pos++] = cellV & 0xFF;
        _batBuffer[pos++] = (cellV >> 8) & 0xFF;
    }

    // N NTC
    _batBuffer[pos++] = nNtc;

    // NTC temps from reg03 (big-endian → little-endian, starting at offset 23)
    for (uint8_t i = 0; i < nNtc; i++) {
        uint8_t off = 23 + i * 2;
        uint16_t temp = beU16(reg03, off, reg03Len);
        _batBuffer[pos++] = temp & 0xFF;
        _batBuffer[pos++] = (temp >> 8) & 0xFF;
    }

    _batLen = pos;
    _batDirty = true;
}

// --- BLE Callbacks ---

void BoatWatchBLE::onConnect(NimBLEServer* pServer) {
    _connected = true;
    _authenticated = false;
    ESP_LOGI(TAG, "Client connected — awaiting auth");
}

void BoatWatchBLE::onDisconnect(NimBLEServer* pServer) {
    _connected = false;
    _authenticated = false;
    ESP_LOGI(TAG, "Client disconnected — auth reset");

    // Restart advertising
    NimBLEDevice::getAdvertising()->start();
}

void BoatWatchBLE::onWrite(NimBLECharacteristic* pCharacteristic) {
    std::string val = pCharacteristic->getValue();
    if (val.size() >= 2) {
        handleCommand((const uint8_t*)val.data(), val.size());
    }
}

void BoatWatchBLE::handleCommand(const uint8_t* data, size_t len) {
    if (len < 2 || data[0] != BW_MAGIC_AUTOPILOT) return;

    uint8_t cmd = data[1];

    // Auth command — always allowed
    if (cmd == BW_CMD_AUTH) {
        if (len >= 6) {
            char pin[5] = {0};
            memcpy(pin, data + 2, 4);
            if (_pin.equals(pin)) {
                _authenticated = true;
                sendAuthResponse(true);
                ESP_LOGI(TAG, "Auth accepted (PIN: %s)", pin);
            } else {
                sendAuthResponse(false);
                ESP_LOGW(TAG, "Auth denied (PIN: %s, expected: %s)", pin, _pin.c_str());
            }
        } else {
            sendAuthResponse(false);
        }
        return;
    }

    // All other commands require auth
    if (!_authenticated) {
        ESP_LOGW(TAG, "Command 0x%02X rejected — not authenticated", cmd);
        return;
    }

    if (_commandCallback) {
        // Pass cmd and payload (after magic + cmd bytes)
        const uint8_t* payload = (len > 2) ? data + 2 : nullptr;
        size_t payloadLen = (len > 2) ? len - 2 : 0;
        _commandCallback(cmd, payload, payloadLen);
    }
}

void BoatWatchBLE::sendAuthResponse(bool accepted) {
    uint8_t resp[2] = { BW_MAGIC_AUTH_RESP, uint8_t(accepted ? 0x01 : 0x00) };
    // Send on both notify characteristics
    _autopilotChar->setValue(resp, 2);
    _autopilotChar->notify();
    _batteryChar->setValue(resp, 2);
    _batteryChar->notify();
}
