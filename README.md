# N2K / NMEA0183 WiFi + BLE bridge

ESP32-C3 firmware that bridges an NMEA2000 (CAN) bus to WiFi and Bluetooth LE
clients. Parses a working subset of N2K PGNs, emits NMEA0183 and SeaSmart over
TCP/UDP/HTTP streams, serves a local web UI and admin, and publishes a
compact binary boat-state feed over BLE GATT for mobile PWAs.

Also bridges a JBD / JDB BMS over TTL/UART, exposing register data both as
custom PGNs on the N2K bus and as a dedicated BLE battery characteristic.

## Features

* NMEA2000 CAN node — parse + emit, built on top of the NMEA2000 library.
* NMEA0183 generation from N2K PGNs (see `lib/N2KHandler/NMEA0183N2KMessages.h`).
* TCP server on port 10110, UDP broadcast, and long-lived chunked HTTP streams
  (`/api/nmea0183`, `/api/seasmart`) with per-client PGN filtering.
* SeaSmart (PCDIN) passthrough with filter negotiation.
* BLE GATT server (`BoatWatchBLE`) — see `docs/ble-transport.md`:
  * `0xAA00` service — autopilot state, command channel, battery.
  * `0xFF00` service — navigation state (lat/lon, COG/SOG, heading, wind,
    depth, STW, log) and engine state (RPM, temps, volts, pressures, hours,
    status bits).
  * PIN-based auth with per-connection and global brute-force lockouts.
  * Fields revert to "not available" sentinels when their source PGN stops
    arriving (≤15 s for nav and slow-cadence engine fields; 5 s for
    engine-running-only fields), so clients don't see stale values.
* JBD BMS bridge over UART — cell voltages, pack V/I/SoC, temps, FET status,
  errors.
* Engine freeze-frame logging to flash (`lib/freezeframe`).
* Performance calculations (polar VMG, target boat speed, target wind angle,
  leeway — see `lib/performance`).
* Logbook to SPIFFS (`lib/logbook`).
* HTTP admin interface (config upload, FS operations, reboot, status).
* WiFi station or AP mode, mDNS.

## UIs

The UIs live in their own repos and talk to the firmware over HTTP streams
or BLE:

* [N2KBMSFwUi](https://github.com/ieb/N2KBMSFwUi) — read-only SPIFFS-hosted UI
  for mobile browsers.
* [N2KUi](https://github.com/ieb/N2KUi) — installable PWA with admin.
* [N2KLifePo4](https://github.com/ieb/N2KLifePo4) — installable PWA for the
  LiFePO4 BMS (BLE).
* [NMEA2000_Booklet](https://github.com/ieb/NMEA2000_Booklet) — Kindle 4
  booklet for use on deck in sunlight.

## Hardware

Current target is an ESP32-C3 on a custom PCB (see `pcb/`). Brownout
threshold is lowered from the 3.1 V default to 2.8 V to ride out BLE radio
bring-up transients. CAN transceiver, isolated UART to the BMS, LED, and
connectors are documented in the schematic.

<div>
<img alt="ESP32-C3 board" src="screenshots/Screenshot 2024-12-17 at 16.58.34.png" />
</div>

## HTTP API

All paths marked "admin only" require HTTP basic auth against credentials in
`config.txt`.

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET  | `/**`              | Static file from SPIFFS (UI bundle). |
| GET  | `/api/store`       | Current store snapshot, CSV. |
| GET  | `/api/devices`     | Devices seen on the N2K bus, text. |
| GET  | `/api/nmea0183`    | Chunked NMEA0183 stream. |
| GET  | `/api/seasmart`    | Chunked SeaSmart stream; `?pgns=...` filters. |
| GET  | `/api/status.json` | Filesystem + heap status. *admin* |
| GET  | `/api/fs.json`     | Filesystem listing. *admin* |
| POST | `/api/fs.json`     | `op=delete` or `op=upload` (multipart). *admin* |
| GET  | `/config.txt`      | Current configuration file. *admin* |
| POST | `/api/reboot.json` | Reboot. *admin* |

Simulators for the HTTP/TCP/BMS side live under `simulator/`.

## TCP / UDP (port 10110)

Emits NMEA0183 sentences by default. A client can switch its session to
SeaSmart by sending a PGN filter request — once switched, the stream stays
in SeaSmart mode for that client. Some noisy PGNs (e.g. Raymarine pilot
updates) are filtered by default to protect bandwidth.

    $PCDCM,1,7,127489,127505,127488,128259,129026,130312,128267*77

UDP is used for broadcast to LAN clients. Note that ChromeOS blocks UDP
broadcast to Android apps running in containers, so the TCP and HTTP stream
paths exist as a workaround.

## BLE

See `docs/ble-transport.md` for the binary frame layouts, magic bytes,
scaling factors, and notification cadence. Characteristics notify at ≤2 Hz
when data changes, and fall back to a 1 Hz keep-alive carrying the latest
values (or NA sentinels if the source PGN has gone stale).

Authentication is a 4-digit PIN (`ble.pin` in `config.txt`). Brute force is
bounded by a per-connection lockout (30 s after 5 failures, disconnect after
10) and a global lockout (5 min after 20 cumulative failures across all
connections). Unauthenticated clients are disconnected after 30 s.

## SeaSmart format reference

SeaSmart/PCDIN sentences published on the NMEA0183 streams:

    $PCDIN,01F119,00000000,0F,2AAF00D1067414FF*59
                                               ^^ checksum
                              ^^^^^^^^^^^^^^^^ data (whole message)
                           ^^ source
                  ^^^^^^^^ hex time
           ^^^^^^ PGN
    ^^^^^^ NMEA0183 id

Hex time decoded as `((parseInt(value,32)/1024)+1262304000)*1000` giving ms
since 1970. Reference: [SeaSmart protocol PDF](http://www.seasmart.net/pdf/SeaSmart_HTTP_Protocol_RevG_043012.pdf).

## Usage

On boot the firmware reads `data/config.txt` from SPIFFS and either joins
the configured WiFi network (station mode) or starts its own AP. Find the
resulting IP, then:

* `http://<ip>/`          — data / status view.
* `http://<ip>/admin.html` — admin view (upload config, reboot).

A serial monitor on the ESP32 gives lower-level diagnostics; press `h<CR>`
for a help screen. The running git SHA is printed with `h`.

## Developing

Project uses PlatformIO. Default environment is `esp32-c3`.

    pio run                                  # build firmware
    pio run -t upload                        # flash firmware
    pio run --target buildfs -e esp32-c3     # build SPIFFS image
    pio run --target uploadfs -e esp32-c3    # flash SPIFFS image
    pio device monitor                       # serial console

The SPIFFS image is populated from `data/`. To repopulate it from the
current UI source, clone the relevant UI repo (for the read-only UI that's
[N2KBMSFwUi](https://github.com/ieb/N2KBMSFwUi)) and run its build script.
Simulators under `simulator/` are Node-based and useful for exercising the
HTTP/TCP/BMS paths without hardware.

## Known limitations / history

* WebSockets were removed — the ESP async WebSocket library crashes when
  more than one client connects and the upstream bug is unfixed. Chunked
  HTTP streams replaced them and are stable under load.
* Earlier PCB revisions carried a BME280, ADS1115, TFT display, touch
  sensors, and an OLED. These are all archived — sensing moved to external
  CAN-based sensors (see CanPressure) and display moved to apps. The
  archived code lives under `lib/archive/`.
* An earlier instability was traced to blocking TCP writes hanging the main
  loop; fixed by moving to an async TCP server. CAN bus loaded to 100 % is
  handled without drops.

## Layout

    src/                 firmware entry point
    lib/
      N2KHandler/        PGN parsing, NMEA0183 emitters, freeze-frame hooks
      bluetooth/         BoatWatch BLE server, engine/nav encoders
      network/           HTTP, TCP, UDP, mDNS, wifi bring-up
      jdbbms/            JBD/JDB BMS UART driver
      performance/       polar-based performance calculations
      logbook/           SPIFFS logbook writer
      freezeframe/       engine event freeze-frame recorder
      config/            config.txt loader
    docs/ble-transport.md   BLE GATT + binary framing spec
    simulator/           Node-based HTTP/TCP/BMS simulators
    pcb/                 board design files
    ui/                  scratch / local UI assets (main UIs are in separate repos)
