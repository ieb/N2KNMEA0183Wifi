# BLE Transport Protocol

The firmware exposes two BLE GATT services: the **BoatWatch Service** for autopilot control and battery monitoring, and the **NMEABridge Nav Service** for navigation data. Up to 3 BLE clients may connect simultaneously.

## Connection

1. Scan for service UUID `0000AA00` (BoatWatch) or `0000FF00` (Nav)
2. Connect GATT
3. Request MTU (64 minimum, 512 recommended)
4. Discover services
5. Enable notifications via CCC descriptor write (UUID `00002902`)
6. Auto-reconnect on disconnect after 3 seconds

Byte order is **little-endian** for all multi-byte values throughout both services.

---

## BoatWatch Service (0xAA00)

Intended mostly for use by wearOS Apps.

| UUID | Characteristic | Properties | Direction |
|------|---------------|-----------|-----------|
| `0000AA00-0000-1000-8000-00805f9b34fb` | Service | -- | -- |
| `0000AA01-0000-1000-8000-00805f9b34fb` | Autopilot State | NOTIFY, READ | Firmware -> Client |
| `0000AA02-0000-1000-8000-00805f9b34fb` | Command | WRITE | Client -> Firmware |
| `0000AA03-0000-1000-8000-00805f9b34fb` | Battery State | NOTIFY, READ | Firmware -> Client |

### Authentication

Autopilot state and battery notifications require authentication. After subscribing to notifications, write an auth command to `0xAA02`:

| Offset | Size | Type | Field | Value |
|--------|------|------|-------|-------|
| 0 | 1 | U8 | magic | `0xAA` |
| 1 | 1 | U8 | cmd | `0xF0` (AUTH) |
| 2 | 4 | char[4] | PIN | ASCII digits, e.g. `"0000"` |

The firmware responds with an auth result notification on both `0xAA01` and `0xAA03`:

| Offset | Size | Type | Field | Value |
|--------|------|------|-------|-------|
| 0 | 1 | U8 | magic | `0xAF` |
| 1 | 1 | U8 | result | `0x01` = accepted, `0x00` = denied |

### Autopilot State (0xAA01)

Magic byte: `0xAA`. Payload: 10 bytes. Update rate: every 5 seconds or on change.

| Offset | Size | Type | Field | Scale/Values |
|--------|------|------|-------|-------------|
| 0 | 1 | U8 | magic | `0xAA` |
| 1 | 1 | U8 | mode | 0=STANDBY, 1=COMPASS, 2=WIND_AWA, 3=WIND_TWA |
| 2 | 2 | U16 | current_heading | 0.01 deg (0-36000) |
| 4 | 2 | U16 | target_heading | 0.01 deg (0-36000) |
| 6 | 2 | S16 | target_wind | 0.01 deg (-18000 to +18000) |
| 8 | 2 | U16 | reserved | `0x0000` |

### Commands (0xAA02)

Magic byte: `0xAA`. All commands require prior authentication.

**Autopilot Mode commands (2 bytes, no payload):**

| Cmd | Name |
|-----|------|
| `0x01` | STANDBY |
| `0x02` | COMPASS (heading hold) |
| `0x03` | WIND_AWA (apparent wind) |
| `0x04` | WIND_TWA (true wind) |


**Autopilot Set commands (4 bytes, U16 or S16 payload):**

| Cmd | Name | Payload | Unit |
|-----|------|---------|------|
| `0x10` | SET_HEADING | U16 | 0.01 deg (0-36000) |
| `0x11` | SET_WIND | S16 | 0.01 deg |

**Autopilot Adjust commands (4 bytes, S16 payload):**

| Cmd | Name | Payload | Unit |
|-----|------|---------|------|
| `0x20` | ADJUST_HEADING | S16 | 0.01 deg delta |
| `0x21` | ADJUST_WIND | S16 | 0.01 deg delta |

**Wifi Adjust commands (2 bytes, No payload):**

| Cmd | Name | Payload | Unit |
|-----|------|---------|------|
| `0x40` | ENABLE_WIFI | None | NA |
| `0x41` | DISABLE_WIFI | None | NA |



### Battery State (0xAA03)

Magic byte: `0xBB`. Payload: variable (typically 31 bytes for 4 cells, 3 NTC). Update rate: every 5 seconds or on change.

| Offset | Size | Type | Field | Scale |
|--------|------|------|-------|-------|
| 0 | 1 | U8 | magic | `0xBB` |
| 1 | 2 | U16 | pack_voltage | 0.01 V |
| 3 | 2 | S16 | current | 0.01 A |
| 5 | 2 | U16 | remaining_ah | 0.01 Ah |
| 7 | 2 | U16 | full_ah | 0.01 Ah |
| 9 | 1 | U8 | soc | 1% (0-100) |
| 10 | 2 | U16 | cycles | 1 |
| 12 | 2 | U16 | errors | bitmap (16 protection flags) |
| 14 | 1 | U8 | fet_status | bit0=charge, bit1=discharge |
| 15 | 1 | U8 | n_cells | count |
| 16 | 2*N | U16[] | cell_voltages | 0.001 V each |
| 16+2N | 1 | U8 | n_ntc | count |
| 17+2N | 2*M | U16[] | ntc_temps | 0.1 K (convert: val*0.1 - 273.15 = C) |

---

## NMEABridge Nav Service (0xFF00)

| UUID | Characteristic | Properties | Direction |
|------|---------------|-----------|-----------|
| `0000FF00-0000-1000-8000-00805f9b34fb` | Service | -- | -- |
| `0000FF01-0000-1000-8000-00805f9b34fb` | Navigation State | NOTIFY, READ | Firmware -> Client |
| `0000FF02-0000-1000-8000-00805f9b34fb` | Engine State | NOTIFY, READ | Firmware -> Client |
| `0000FF03-0000-1000-8000-00805f9b34fb` | System | Write |  Client -> Firmware |

Authentication required. Only Authenticated clients receive navigation and engine data.

### Navigation State (0xFF01)

Magic byte: `0xCC`. Payload: 29 bytes. Update rate: 1 Hz.

| Offset | Size | Type | Field | Scale | Range |
|--------|------|------|-------|-------|-------|
| 0 | 1 | U8 | magic | `0xCC` | identifier |
| 1 | 4 | S32 | latitude | 1e-7 deg | +/-90 deg |
| 5 | 4 | S32 | longitude | 1e-7 deg | +/-180 deg |
| 9 | 2 | U16 | cog | 0.0001 rad | 0-6.2832 |
| 11 | 2 | U16 | sog | 0.01 m/s | 0-655.34 |
| 13 | 2 | S16 | variation | 0.0001 rad | +/-3.1416 |
| 15 | 2 | U16 | heading | 0.0001 rad | 0-6.2832 |
| 17 | 2 | U16 | depth | 0.01 m | 0-655.34 |
| 19 | 2 | U16 | awa | 0.0001 rad | 0-6.2832 |
| 21 | 2 | U16 | aws | 0.01 m/s | 0-655.34 |
| 23 | 2 | U16 | stw | 0.01 m/s | 0-655.34 |
| 25 | 4 | U32 | log | 1 m | 0-4,294,967,294 |

**Data Not Available sentinels (NMEA 2000 convention):**

| Type | Sentinel |
|------|----------|
| U16 | `0xFFFF` |
| S16 | `0x7FFF` |
| U32 | `0xFFFFFFFF` |
| S32 | `0x7FFFFFFF` |

### Example payload

```
hex: CC 60 13 D8 1D 40 6A 56 FA 5C 3D 01 01 57 00 5C 3D E2 04 AE 1E 20 03 F0 00 98 3A 00 00
```

Decodes to: 50.0700 N, 009.5000 W, COG 90.0 deg, SOG 2.57 m/s, VAR 0.5 deg E, HDG 90.0 deg, DEPTH 12.50 m, AWA 45.0 deg, AWS 8.00 m/s, STW 2.40 m/s, LOG 15000 m

### Engine State (0xFF02)

Magic byte: `0xDD`. Payload: 32 bytes. Update rate: 1 Hz max, notify on change. Single engine (instance 0).

The engine is not always running. When 127488 / 127489 stop arriving, the firmware applies a 5 s staleness timeout and reports the "not available" sentinel for RPM, coolant, alternator V/T, oil pressure and status bits. Fuel level, engine-room temperature and engine battery voltage continue to update regardless.

| Offset | Size | Type | Field | Scale | Range |
|--------|------|------|-------|-------|-------|
| 0  | 1 | U8  | magic              | `0xDD`       | identifier |
| 1  | 2 | U16 | rpm                | 0.25 rpm/bit | 0-16383.75 rpm |
| 3  | 4 | U32 | engine_hours       | 1 s/bit      | cumulative, EEPROM-backed |
| 7  | 2 | U16 | coolant_temp       | 0.01 K       | convert: `val*0.01 - 273.15` = degC |
| 9  | 2 | U16 | alternator_temp    | 0.01 K       | convert: `val*0.01 - 273.15` = degC (see Non-Standard Mappings) |
| 11 | 2 | U16 | alternator_volts   | 0.01 V       | 0-655.34 V |
| 13 | 2 | U16 | oil_pressure       | 100 Pa/bit   | 0-6553400 Pa (1 hPa per count) |
| 15 | 2 | U16 | exhaust_temp       | 0.01 K       | PGN 130312/130316 source 14 |
| 17 | 2 | U16 | engine_room_temp   | 0.01 K       | PGN 130312/130316 source 3 |
| 19 | 2 | U16 | engine_batt_volts  | 0.01 V       | cranking battery, PGN 127508 instance 0 |
| 21 | 2 | U16 | fuel_level         | 0.004 %/bit  | 0-25000 = 0-100 % |
| 23 | 2 | U16 | status1            | bitmap       | see Status Bits |
| 25 | 2 | U16 | status2            | bitmap       | see Status Bits |
| 27 | 2 | U16 | raw_water_flow     | 0.01 lpm     | From FlowSensor |
| 29 | 2 | U16 | raw_water_temp     | 0.01 K       | From FlowSensor |
| 31 | 1 | U8  | flowmeter_status   | bitmap       | see FlowSensor Bits |

**Data Not Available sentinels** (same convention as Navigation State): `U16 = 0xFFFF`, `U32 = 0xFFFFFFFF`.

#### Status Bits

`status1` - PGN 127489 Discrete Status 1:

| Bit | Mask | Name | Trigger |
|-----|------|------|---------|
| 0  | `0x0001` | CHECK_ENGINE         | latched on any fault |
| 1  | `0x0002` | OVER_TEMPERATURE     | coolant > 97 degC for 15 s |
| 2  | `0x0004` | LOW_OIL_PRESSURE     | oil < ~68.9 kPa for 5 s (only while > 800 rpm) |
| 5  | `0x0020` | LOW_SYSTEM_VOLTAGE   | battery < 11.8 V for 5 s |
| 7  | `0x0080` | WATER_FLOW           | exhaust > 80 degC |
| 9  | `0x0200` | CHARGE_INDICATOR     | alternator < 12.2 V for 5 s |
| 15 | `0x8000` | EMERGENCY_STOP       | latched |

`status2` - PGN 127489 Discrete Status 2:

| Bit | Mask | Name | Trigger |
|-----|------|------|---------|
| 3 | `0x0008` | MAINTENANCE_NEEDED    | scheduled service due |
| 4 | `0x0010` | ENGINE_COMM_ERROR     | sensor failure detected |
| 7 | `0x0080` | ENGINE_SHUTTING_DOWN  | RPM dropped below 500 with alarms latched |

All other bits are reserved and should be masked off by clients.

`flow_meter_status` from FLowSensor

0x01 == NO Fluid
0x02 == Still
0x03 == Flowing

Other bits not relevant.



#### Non-Standard Mappings

The upstream N2KEngine firmware (https://github.com/ieb/N2KEngine) remaps several PGN fields to carry measurements that have no standard slot. Consumers that read the source PGNs directly must be aware of these remappings; this characteristic presents the decoded values in their logical positions.

1. **`alternator_temp` originates from the PGN 127489 engine-oil-temperature field.** The engine has no oil temperature sensor. The firmware comment ("alternator temperature as engineOil temperature, more important with LiFePO4") documents the substitution. True oil temperature is never emitted.
2. **PGN 127508 instance 2 is a synthetic "battery"** whose Battery Voltage = alternator output and Battery Temperature = alternator NTC. It is not a real battery. `alternator_volts` and `alternator_temp` in this characteristic are sourced from PGN 127489, not from instance 2; clients should ignore PGN 127508 instance 2 entirely.
3. **N2KEngine may emit the engine temperature triplet on legacy PGN 130312 or on PGN 130316.** The bridge accepts either PGN for source 14 (exhaust) and source 3 (engine room) and normalizes them into this characteristic.
4. **Firmware-proprietary temperature sources 30 and 31+** are not surfaced here. Source 30 duplicates the alternator NTC, while sources 31+N expose OneWire DS18B20 probes of variable count.

Exhaust temperature (source 14) and engine-room temperature (source 3) are standard NMEA 2000 temperature sources.

#### Fields deliberately excluded

The N2KEngine firmware never populates fuel rate, coolant pressure, fuel pressure, boost pressure, engine load, engine torque or tilt/trim, so they are omitted here.

### Example payload

```
hex: DD 20 1C F0 D3 1D 00 E7 8B FF 87 8C 05 AC 0D B3 E7 4B 73 EC 04 3E 49 00 00 00 00 FF FF FF FF FF
```

Decodes to: RPM 1800, engine_hours 543 h (1,954,800 s), coolant 85.0 degC, alternator 75.0 degC / 14.20 V, oil pressure 350 kPa, exhaust 320.0 degC, engine room 22.0 degC, engine battery 12.60 V, fuel 75.0 %, no alarms, raw water flow / temp / status not available.

---

#### Data Sources

| Field | NMEA 2000 PGN | Notes |
|-------|---------------|-------|
| Latitude, Longitude | 129025, 129029 | GNSS position |
| COG, SOG | 129026 | Course/speed over ground |
| Variation | 127258, 127250 | Magnetic variation |
| Heading | 127250 | Magnetic heading |
| Depth | 128267 | Depth below transducer |
| AWA, AWS | 130306 | Apparent wind |
| STW | 128259 | Speed through water |
| Log | 128275 | Cumulative distance |
| Autopilot | 65379, 65359, 65360, 65345 | Raymarine proprietary |
| Battery | JDB BMS via serial | Registers 03/04 |
| Engine RPM | 127488 | Rapid engine, 500 ms |
| Engine hours, coolant, alternator V, alternator T, oil pressure, status | 127489 | Dynamic engine, 1 s; alternator T carried in oil-temp field (remap) |
| Exhaust temp | 130312/130316 src 14 | Legacy/extended temperature |
| Engine room temp | 130312/130316 src 3  | Legacy/extended temperature |
| Engine battery volts | 127508 instance 0 | Cranking battery |
| Fuel level | 127505 instance 0 | Diesel, 60 L capacity |


---


## FlowMeter Service (0xAC00)

The FlowMeter Service is hosted by the FlowMeter / NMEABridge host firmware. A FlowSensor
connects as a BLE client and writes flow measurement frames to it. The host returns the
authentication result to the FlowSensor on the same characteristic (notify).

| UUID | Characteristic | Properties | Direction |
|------|---------------|-----------|-----------|
| `0000AC00-0000-1000-8000-00805f9b34fb` | Remote FlowMeter Service | -- | -- |
| `0000AC01-0000-1000-8000-00805f9b34fb` | Remote FlowMeter Characteristic | WRITE, NOTIFY | FlowSensor -> Host (data); Host -> FlowSensor (auth result) |

### Authentication

FlowMeter writes require authentication. Before writing data, the FlowSensor writes an auth
command to `0xAC01`:

| Offset | Size | Type | Field | Value |
|--------|------|------|-------|-------|
| 0 | 1 | U8 | magic | `0xEE` |
| 1 | 1 | U8 | cmd | `0xF0` (AUTH) |
| 2 | 4 | char[4] | PIN | ASCII digits, e.g. `"0000"` |

The host responds with an auth result notification on `0xAC01`:

| Offset | Size | Type | Field | Value |
|--------|------|------|-------|-------|
| 0 | 1 | U8 | magic | `0xAF` |
| 1 | 1 | U8 | result | `0x01` = accepted, `0x00` = denied |

Only data frames from authenticated clients are accepted.

### FlowMeter State (0xAC01)

Write magic byte: `0xEE`. Write command byte: `0x50`. Payload: 13 bytes.

Note the NMEA2000 standard for Fluid Flow rate is L/h however, that would limit the maximum
range to 11 l/m in a U16, so lpm is being used. If using this data packet in a NMEA2000 context
conversions may be required at the receiving end.

| Offset | Size | Type | Field | Scale/Values |
|--------|------|------|-------|-------------|
| 0  | 1 | U8 | magic | `0xEE` |
| 1  | 1 | U8 | cmd | `0x50` |
| 2  | 1 | U8 | status | See Status U8 |
| 3  | 2 | U16 | flowRateLPM | 0.01 lpm (0-650) |  
| 5  | 2 | U16 | upstreamC | 0.01 K (0-650) |
| 7  | 2 | U16 | downstreamC | 0.01 K (0-650) |
| 9  | 2 | U16 | voltage | 0.01 V (0-650) |
| 11 | 2 | U16 | power | 0.01 W (0-650) |

## Status U8

	Bitmap bits 0-1
	0x01=NO_FLUID
	0x02=STILL
	0x03=FLOWING
	bit 2 FlowMeter Configured (address + pin)
	bit 3 FlowMeter Paired (address exists)
	bit 4 FlowMeter authenticated (pin valid)

**Data Not Available sentinels (NMEA 2000 convention):**

| Type | Sentinel |
|------|----------|
| U16 | `0xFFFF` |
| S16 | `0x7FFF` |
| U32 | `0xFFFFFFFF` |
| S32 | `0x7FFFFFFF` |

Note: the FlowSensor firmware currently emits the S16 sentinel `0x7FFF` for the temperature
fields (`upstreamC`, `downstreamC`) and `0xFFFF` for `flowRateLPM`, `voltage` and `power`.

