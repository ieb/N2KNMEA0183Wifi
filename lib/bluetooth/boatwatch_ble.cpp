#define LOG_LOCAL_LEVEL ESP_LOG_INFO
#include "esp_log.h"
#include "boatwatch_ble.h"
#include "config.h"

static const char* TAG = "BW_BLE";

// BMS register offsets (little-endian — byte-swapped from BMS big-endian by copyReg03/copyReg04)
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
// NTC temps start at offset 23 (each U16 little-endian)


void BoatWatchBLE::begin(const char* deviceName, const char* _configurationFile) {
    if ( !ConfigurationFile::get(_configurationFile, "ble.pin", _pin)) {
        _pin = "0000";
    }

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

    // FF00 — NMEABridge Nav Service
    NimBLEService* navService = _server->createService(BW_NAV_SERVICE_UUID);
    _navChar = navService->createCharacteristic(
        BW_NAV_STATE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    navService->start();

    // Start advertising both services
    NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(BW_SERVICE_UUID);
    advertising->setName(deviceName);
    advertising->enableScanResponse(true);
    advertising->addServiceUUID(BW_NAV_SERVICE_UUID);
    advertising->start();

    ESP_LOGI(TAG, "BLE server started: %s (PIN: %s)", deviceName, _pin);
}

bool BoatWatchBLE::hasAuthenticatedClients() const {
    for (auto &it : _clients) {
        if (it.second) return true;
    }
    return false;
}

void BoatWatchBLE::notify() {
    if (_server->getConnectedCount() == 0) {
        if (!_clients.empty()) {
            ESP_LOGW(TAG, "Missed disconnect detected — clearing %d client(s)", _clients.size());
            _clients.clear();
            NimBLEDevice::getAdvertising()->start();
        }
        return;
    }

    unsigned long now = millis();

    // Nav state — no auth required, any connected client receives it
    if (_navDirty || (now - _lastNavNotify >= BW_NAV_INTERVAL_MS)) {
        _navChar->setValue(_navBuffer, 29);
        _navChar->notify();
        _lastNavNotify = now;
        _navDirty = false;
    }

    // Autopilot and battery require authentication
    if (!hasAuthenticatedClients()) return;

    // Autopilot when updated, or at least every 5s
    if (_apDirty || (now - _lastApNotify >= BW_MAX_AUTOPILOT_INTERVAL_MS)) {
        _autopilotChar->setValue(_apBuffer, 10);
        _autopilotChar->notify();
        _lastApNotify = now;
        _apDirty = false;
    }

    // Battery when updated or at least every 5s
    if (_batLen > 0 && ( _batDirty || (now - _lastBatNotify >= BW_MAX_BATTERY_INTERVAL_MS))) {
        _batteryChar->setValue(_batBuffer, _batLen);
        _batteryChar->notify();
        _lastBatNotify = now;
        _batDirty = false;
    }
}

// Helper to write little-endian values into a buffer
static void writeU16(uint8_t* buf, uint8_t &pos, double val, double scale, uint16_t na) {
    uint16_t v = (val <= -1e8) ? na : (uint16_t)(val * scale);
    buf[pos++] = v & 0xFF;
    buf[pos++] = (v >> 8) & 0xFF;
}

static void writeS16(uint8_t* buf, uint8_t &pos, double val, double scale, int16_t na) {
    int16_t v = (val <= -1e8) ? na : (int16_t)(val * scale);
    buf[pos++] = v & 0xFF;
    buf[pos++] = (v >> 8) & 0xFF;
}

static void writeS32(uint8_t* buf, uint8_t &pos, double val, double scale, int32_t na) {
    int32_t v = (val <= -1e8) ? na : (int32_t)(val * scale);
    buf[pos++] = v & 0xFF;
    buf[pos++] = (v >> 8) & 0xFF;
    buf[pos++] = (v >> 16) & 0xFF;
    buf[pos++] = (v >> 24) & 0xFF;
}

static void writeU32(uint8_t* buf, uint8_t &pos, uint32_t val) {
    buf[pos++] = val & 0xFF;
    buf[pos++] = (val >> 8) & 0xFF;
    buf[pos++] = (val >> 16) & 0xFF;
    buf[pos++] = (val >> 24) & 0xFF;
}

void BoatWatchBLE::setNavState(double lat, double lon, double cog, double sog,
                                double variation, double heading, double depth,
                                double awa, double aws, double stw, uint32_t log) {
    uint8_t pos = 0;
    _navBuffer[pos++] = BW_MAGIC_NAV;

    // lat/lon: degrees → 1e-7 degree integer (S32)
    writeS32(_navBuffer, pos, lat, 1e7, 0x7FFFFFFF);
    writeS32(_navBuffer, pos, lon, 1e7, 0x7FFFFFFF);

    // angles: already in radians → 0.0001 rad units
    writeU16(_navBuffer, pos, cog, 10000.0, 0xFFFF);          // COG
    writeU16(_navBuffer, pos, sog, 100.0, 0xFFFF);            // SOG (m/s → 0.01 m/s)
    writeS16(_navBuffer, pos, variation, 10000.0, 0x7FFF);    // Variation
    writeU16(_navBuffer, pos, heading, 10000.0, 0xFFFF);       // Heading
    writeU16(_navBuffer, pos, depth, 100.0, 0xFFFF);           // Depth (m → 0.01 m)
    writeU16(_navBuffer, pos, awa, 10000.0, 0xFFFF);           // AWA
    writeU16(_navBuffer, pos, aws, 100.0, 0xFFFF);             // AWS (m/s → 0.01 m/s)
    writeU16(_navBuffer, pos, stw, 100.0, 0xFFFF);             // STW (m/s → 0.01 m/s)
    writeU32(_navBuffer, pos, log);                             // Log (already in metres)

    _navDirty = true;
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

    // Header
    _batBuffer[pos++] = BW_MAGIC_BATTERY;

    // Registers are already little-endian (byte-swapped by JdbBMS::copyReg03/04),
    // and BLE protocol is little-endian, so copy bytes directly.

    // Pack voltage U16
    memcpy(&_batBuffer[pos], &reg03[REG03_PACK_V_U16], 2); pos += 2;
    // Current S16
    memcpy(&_batBuffer[pos], &reg03[REG03_CURRENT_S16], 2); pos += 2;
    // Remaining Ah U16
    memcpy(&_batBuffer[pos], &reg03[REG03_REMAINING_U16], 2); pos += 2;
    // Full Ah U16
    memcpy(&_batBuffer[pos], &reg03[REG03_FULL_U16], 2); pos += 2;
    // SOC U8
    _batBuffer[pos++] = reg03[REG03_SOC_U8];
    // Cycles U16
    memcpy(&_batBuffer[pos], &reg03[REG03_CYCLES_U16], 2); pos += 2;
    // Errors U16
    memcpy(&_batBuffer[pos], &reg03[REG03_ERRORS_U16], 2); pos += 2;
    // FET status U8
    _batBuffer[pos++] = reg03[REG03_FET_U8];
    // N cells U8
    _batBuffer[pos++] = nCells;

    // Cell voltages from reg04
    uint8_t cellBytes = nCells * 2;
    if (cellBytes <= reg04Len) {
        memcpy(&_batBuffer[pos], reg04, cellBytes); pos += cellBytes;
    }

    // N NTC U8
    _batBuffer[pos++] = nNtc;

    // NTC temps from reg03 (starting at offset 23)
    uint8_t ntcBytes = nNtc * 2;
    if (23 + ntcBytes <= reg03Len) {
        memcpy(&_batBuffer[pos], &reg03[23], ntcBytes); pos += ntcBytes;
    }

    _batLen = pos;
    _batDirty = true;
}

// --- BLE Callbacks ---

void BoatWatchBLE::onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) {
    uint16_t connHandle = connInfo.getConnHandle();
    _clients[connHandle] = false;
    ESP_LOGI(TAG, "Client %d connected — awaiting auth (%d clients)", connHandle, _clients.size());

    // Keep advertising so more clients can connect (up to BW_MAX_CLIENTS)
    if (_server->getConnectedCount() < BW_MAX_CLIENTS) {
        NimBLEDevice::getAdvertising()->start();
    }
}

void BoatWatchBLE::onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) {
    uint16_t connHandle = connInfo.getConnHandle();
    _clients.erase(connHandle);
    ESP_LOGI(TAG, "Client %d disconnected (reason=%d) — %d clients remain", connHandle, reason, _clients.size());

    // Restart advertising if below max
    if (_server->getConnectedCount() < BW_MAX_CLIENTS) {
        NimBLEDevice::getAdvertising()->start();
    }
}

void BoatWatchBLE::onWrite(NimBLECharacteristic* pCharacteristic, NimBLEConnInfo& connInfo) {
    NimBLEAttValue val = pCharacteristic->getValue();
    if (val.size() >= 2) {
        handleCommand(connInfo.getConnHandle(), val.data(), val.size());
    }
}

void BoatWatchBLE::handleCommand(uint16_t connHandle, const uint8_t* data, size_t len) {
    if (len < 2 || data[0] != BW_MAGIC_AUTOPILOT) return;

    uint8_t cmd = data[1];

    // Auth command — always allowed
    if (cmd == BW_CMD_AUTH) {
        if (len >= 6) {
            char pin[5] = {0};
            memcpy(pin, data + 2, 4);
            if (_pin.equals(pin)) {
                _clients[connHandle] = true;
                sendAuthResponse(connHandle, true);
                ESP_LOGI(TAG, "Client %d auth accepted", connHandle);
            } else {
                sendAuthResponse(connHandle, false);
                ESP_LOGW(TAG, "Client %d auth denied (PIN: %s)", connHandle, pin);
            }
        } else {
            sendAuthResponse(connHandle, false);
        }
        return;
    }

    // All other commands require auth
    auto it = _clients.find(connHandle);
    if (it == _clients.end() || !it->second) {
        ESP_LOGW(TAG, "Client %d cmd 0x%02X rejected — not authenticated", connHandle, cmd);
        return;
    }

    if (_commandCallback) {
        const uint8_t* payload = (len > 2) ? data + 2 : nullptr;
        size_t payloadLen = (len > 2) ? len - 2 : 0;
        _commandCallback(cmd, payload, payloadLen);
    }
}

void BoatWatchBLE::sendAuthResponse(uint16_t connHandle, bool accepted) {
    uint8_t resp[2] = { BW_MAGIC_AUTH_RESP, uint8_t(accepted ? 0x01 : 0x00) };
    _autopilotChar->setValue(resp, 2);
    _autopilotChar->notify(connHandle);
    _batteryChar->setValue(resp, 2);
    _batteryChar->notify(connHandle);
}
