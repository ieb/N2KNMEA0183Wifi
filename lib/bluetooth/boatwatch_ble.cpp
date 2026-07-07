#define LOG_LOCAL_LEVEL ESP_LOG_INFO
#include "esp_log.h"
#include "esp_system.h"     // esp_get_free_heap_size, esp_get_minimum_free_heap_size
#include "boatwatch_ble.h"
#include "config.h"

static const char* TAG = "BW_BLE";

// Small RAII wrapper for a FreeRTOS mutex. Held only for tiny critical
// sections around _clients / global-auth access — see the mutex comment
// in boatwatch_ble.h. Portable-tick wait is INT_MAX (effectively forever)
// because these sections are microseconds long and blocking a caller for
// them is far preferable to skipping the lock and racing the tree.
class MutexLock {
public:
    explicit MutexLock(SemaphoreHandle_t m) : _m(m) {
        if (_m) xSemaphoreTake(_m, portMAX_DELAY);
    }
    ~MutexLock() { if (_m) xSemaphoreGive(_m); }
    MutexLock(const MutexLock&) = delete;
    MutexLock& operator=(const MutexLock&) = delete;
private:
    SemaphoreHandle_t _m;
};

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

    // Must exist before the server is created — the very first onConnect
    // callback can fire as soon as advertising->start() below.
    _clientsMutex = xSemaphoreCreateMutex();

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

    // deprecated service->start();

    // FF00 — NMEABridge Nav Service
    NimBLEService* navService = _server->createService(BW_NAV_SERVICE_UUID);
    _navChar = navService->createCharacteristic(
        BW_NAV_STATE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    // FF02 — Engine State (NOTIFY + READ)
    _engineChar = navService->createCharacteristic(
        BW_NAV_ENGINE_CHAR_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );

    // Prime with an all-sentinel payload so initial reads and the 1 Hz keep-alive
    // notify carry a valid frame (magic 0xDD + 0xFF fill) before any engine PGN arrives.
    EngineBlePayload empty;
    engineBlePayloadInitNA(&empty);
    encodeEngineBle(_engineBuffer, &empty);
    _engineChar->setValue(_engineBuffer, BW_ENGINE_PAYLOAD_LEN);
    // deprecated navService->start();

    // Start advertising both services
    NimBLEAdvertising* advertising = NimBLEDevice::getAdvertising();
    advertising->addServiceUUID(BW_SERVICE_UUID);
    advertising->setName(deviceName);
    advertising->enableScanResponse(true);
    advertising->start();

    ESP_LOGI(TAG, "BLE server started: %s (PIN: %s)", deviceName, _pin);



}

bool BoatWatchBLE::hasAuthenticatedClients() const {
    MutexLock lock(_clientsMutex);
    for (auto &it : _clients) {
        if (it.second.authed) return true;
    }
    return false;
}

void BoatWatchBLE::notify() {
    unsigned long now = millis();

    // Advertising watchdog. Runs regardless of client count because the
    // observed failure mode is "connected client(s) present, but advertising
    // silently stopped and never restarted" — so scanners see nothing and
    // no new client can connect until an existing one drops. On the ESP32-C3
    // NimBLE port this has been observed after ~76 back-to-back connect/
    // disconnect cycles, correlating with heap fragmentation.
    if ((now - _lastAdvCheckMs) >= BW_ADV_WATCHDOG_MS) {
        _lastAdvCheckMs = now;
        NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
        if (adv && !adv->isAdvertising()
            && _server->getConnectedCount() < BW_MAX_CLIENTS) {
            if (_advStuckSince == 0) {
                _advStuckSince = now;
                ESP_LOGW(TAG,
                    "Advertising watchdog: stopped despite conn=%d < max=%d "
                    "(heap=%u min=%u) — restarting",
                    (int)_server->getConnectedCount(), BW_MAX_CLIENTS,
                    (unsigned)esp_get_free_heap_size(),
                    (unsigned)esp_get_minimum_free_heap_size());
            }
            adv->start();
        } else if (_advStuckSince != 0) {
            ESP_LOGI(TAG,
                "Advertising watchdog: recovered after %lu ms",
                (unsigned long)(now - _advStuckSince));
            _advStuckSince = 0;
        }
    }

    if (_server->getConnectedCount() == 0) {
        // Missed-disconnect recovery: another (NimBLE) task could touch
        // _clients while we test/clear. Guard the read *and* the clear.
        bool wasNonEmpty = false;
        size_t sz = 0;
        {
            MutexLock lock(_clientsMutex);
            wasNonEmpty = !_clients.empty();
            sz = _clients.size();
            if (wasNonEmpty) _clients.clear();
        }
        if (wasNonEmpty) {
            ESP_LOGW(TAG, "Missed disconnect detected — clearing %d client(s)", (int)sz);
            NimBLEDevice::getAdvertising()->start();
            digitalWrite(BLE_LED_PIN, LOW);
        }
        return;
    }

    // Disconnect any client that connected but never authenticated within the
    // idle window. Stops an attacker (or a broken client) from holding the
    // BW_MAX_CLIENTS connection slots and denying service to legitimate peers.
    // Collect handles under the lock, then call _server->disconnect() OUTSIDE
    // the lock — that call can synchronously invoke onDisconnect which will
    // try to take the mutex itself.
    uint16_t idleHandles[BW_MAX_CLIENTS];
    size_t nIdle = 0;
    {
        MutexLock lock(_clientsMutex);
        for (auto &kv : _clients) {
            if (!kv.second.authed
                && (now - kv.second.connectedAtMs) > BW_UNAUTH_IDLE_TIMEOUT_MS
                && nIdle < BW_MAX_CLIENTS) {
                idleHandles[nIdle++] = kv.first;
            }
        }
    }
    for (size_t i = 0; i < nIdle; i++) {
        ESP_LOGW(TAG, "Client %u idle-unauth timeout — disconnecting",
                 idleHandles[i]);
        _server->disconnect(idleHandles[i]);
    }

    if (!hasAuthenticatedClients()) return;

    // Autopilot when updated, or at least every 5s
    if ((_navDirty && (now - _lastNavNotify >= BW_MIN_NAV_INTERVAL_MS)) || (now - _lastNavNotify >= BW_NAV_INTERVAL_MS)) {
        _navChar->setValue(_navBuffer, 29);
        _navChar->notify();
        _lastNavNotify = now;
        _navDirty = false;
    }

    // Engine state when updated, or at least every 1s
    if ((_engineDirty && (now - _lastEngineNotify >= BW_MIN_ENGINE_INTERVAL_MS))
        || (now - _lastEngineNotify >= BW_ENGINE_INTERVAL_MS)) {
        _engineChar->setValue(_engineBuffer, BW_ENGINE_PAYLOAD_LEN);
        _engineChar->notify();
        _lastEngineNotify = now;
        _engineDirty = false;
    }


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
    if ( (now - _ledSwitch) > 1000 ) {
        _ledSwitch = now;
        _ledOn = !_ledOn;

        digitalWrite(BLE_LED_PIN, _ledOn);
    }
    return;
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

void BoatWatchBLE::setEngineState(const EngineBlePayload& p) {
    encodeEngineBle(_engineBuffer, &p);
    _engineDirty = true;
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
    size_t mapSize;
    {
        MutexLock lock(_clientsMutex);
        _clients[connHandle] = ClientState{false, 0, 0, millis()};
        mapSize = _clients.size();
    }
    // Instrumentation: log free heap, min-ever free heap, connected-count vs
    // map size, and advertising state. Divergence between getConnectedCount()
    // and _clients.size() is the smoking gun for a per-client-state leak;
    // a monotonically-falling min-free heap points at a notify/allocation leak.
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    ESP_LOGI(TAG,
        "Client %d connected — awaiting auth (map=%d conn=%d adv=%d heap=%u min=%u)",
        connHandle,
        (int)mapSize,
        (int)_server->getConnectedCount(),
        adv ? (int)adv->isAdvertising() : -1,
        (unsigned)esp_get_free_heap_size(),
        (unsigned)esp_get_minimum_free_heap_size());

    // Keep advertising so more clients can connect (up to BW_MAX_CLIENTS)
    if (_server->getConnectedCount() < BW_MAX_CLIENTS) {
        NimBLEDevice::getAdvertising()->start();
    }
}

void BoatWatchBLE::onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) {
    uint16_t connHandle = connInfo.getConnHandle();
    size_t mapSize;
    {
        MutexLock lock(_clientsMutex);
        _clients.erase(connHandle);
        mapSize = _clients.size();
    }
    NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
    ESP_LOGI(TAG,
        "Client %d disconnected (reason=%d) — "
        "map=%d conn=%d adv=%d heap=%u min=%u",
        connHandle, reason,
        (int)mapSize,
        (int)_server->getConnectedCount(),
        adv ? (int)adv->isAdvertising() : -1,
        (unsigned)esp_get_free_heap_size(),
        (unsigned)esp_get_minimum_free_heap_size());

    // Restart advertising if below max
    if (_server->getConnectedCount() < BW_MAX_CLIENTS) {
        NimBLEDevice::getAdvertising()->start();
    }
    if ( _server->getConnectedCount() == 0) {
        _ledOn = false;
        digitalWrite(BLE_LED_PIN, _ledOn);
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

    // Auth command — allowed, but rate-limited per connection AND globally.
    if (cmd == BW_CMD_AUTH) {
        // Decode + compare PIN outside the lock; it touches only stack and
        // _pin (immutable after begin()).
        bool pinOk = false;
        if (len >= 6) {
            char pin[5] = {0};
            memcpy(pin, data + 2, 4);
            if (_pin.equals(pin)) pinOk = true;
        }

        // Serialise every read/write of _clients / global auth state.
        // Compute what to *send* under the lock, execute the BLE I/O and the
        // possible ->disconnect() call OUTSIDE the lock — disconnect() can
        // synchronously fire onDisconnect on this same task which would
        // re-enter the mutex.
        bool respondAccepted = false;
        bool respondRejected = false;
        bool forceDisconnect = false;
        bool logLockout = false;
        bool logGlobalLockout = false;
        uint8_t logFailures = 0;
        uint16_t logGlobalFailures = 0;

        {
            MutexLock lock(_clientsMutex);
            auto it = _clients.find(connHandle);
            if (it == _clients.end()) return;  // post-disconnect race
            ClientState &state = it->second;
            unsigned long now = millis();

            if (_globalBlockUntilMs != 0 && (long)(_globalBlockUntilMs - now) > 0) {
                ESP_LOGW(TAG, "Auth rejected: global lockout active");
                respondRejected = true;
            } else {
                if (_globalBlockUntilMs != 0) {
                    _globalBlockUntilMs = 0;
                    _globalAuthFailures = 0;
                }

                if (state.blockUntilMs != 0 && (long)(state.blockUntilMs - now) > 0) {
                    ESP_LOGW(TAG, "Client %d auth attempt during lockout (failures=%u)",
                             connHandle, state.failures);
                    respondRejected = true;
                } else if (pinOk) {
                    state.authed = true;
                    state.failures = 0;
                    state.blockUntilMs = 0;
                    _globalAuthFailures = 0;
                    _globalBlockUntilMs = 0;
                    respondAccepted = true;
                } else {
                    state.failures++;
                    _globalAuthFailures++;
                    logFailures = state.failures;
                    logGlobalFailures = _globalAuthFailures;
                    respondRejected = true;
                    if (state.failures >= BW_AUTH_MAX_FAILURES) {
                        forceDisconnect = true;
                    } else if (state.failures % BW_AUTH_LOCKOUT_FAILURES == 0) {
                        state.blockUntilMs = now + BW_AUTH_LOCKOUT_MS;
                        logLockout = true;
                    }
                    if (_globalAuthFailures >= BW_AUTH_GLOBAL_LOCKOUT_FAILURES) {
                        _globalBlockUntilMs = now + BW_AUTH_GLOBAL_LOCKOUT_MS;
                        logGlobalLockout = true;
                    }
                }
            }
        }
        // Lock released — BLE I/O and disconnect are safe now.
        if (respondAccepted) {
            sendAuthResponse(connHandle, true);
            ESP_LOGI(TAG, "Client %d auth accepted", connHandle);
        }
        if (respondRejected) {
            sendAuthResponse(connHandle, false);
            if (logFailures) {
                ESP_LOGW(TAG, "Client %d auth denied (failures=%u global=%u)",
                         connHandle, logFailures, logGlobalFailures);
            }
        }
        if (logLockout) {
            ESP_LOGW(TAG, "Client %d entering %lu ms auth lockout", connHandle,
                     (unsigned long)BW_AUTH_LOCKOUT_MS);
        }
        if (logGlobalLockout) {
            ESP_LOGW(TAG, "Global auth lockout engaged for %lu ms",
                     (unsigned long)BW_AUTH_GLOBAL_LOCKOUT_MS);
        }
        if (forceDisconnect) {
            ESP_LOGW(TAG, "Client %d exceeded per-connection limit — disconnecting",
                     connHandle);
            _server->disconnect(connHandle);
        }
        return;
    }

    // All other commands require auth. Copy just the authed flag under the
    // lock so we don't hold a reference to a map entry that could be erased
    // during the callback below.
    bool authed = false;
    {
        MutexLock lock(_clientsMutex);
        auto it = _clients.find(connHandle);
        if (it == _clients.end()) return;
        authed = it->second.authed;
    }
    if (!authed) {
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
