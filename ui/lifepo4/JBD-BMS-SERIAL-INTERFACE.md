# JBD BMS SERIAL INTERFACE AND REGISTER MAP

From https://gitlab.com/bms-tools/bms-tools/-/blob/master/JBD_REGISTER_MAP.md?ref_type=heads so I can work offline.


## Glossary / abbreviations

| Abbreviation | Meaning               |
|--------------|-----------------------|
| U16          | Unsigned 16 bit value |
| S16          | Signed 16 bit value   |



## Serial communication 

Serial port communcation is 9600 baud, 8 data bits, no parity, 1 stop bit  (9600 8N1).

### Packet details

Packets to/from the BMS consist of:

| Start Byte | Payload       | Checksum   | End Byte |
|------      |------         |------      |------    |
| 0xDD       |3 or more bytes|2 bytes, U16|0x77      |

#### Checksum

The checksum is simply sum of the payload byte values subtracted from 0x10000 (65536).

#### Payload to BMS 

| Command byte | Read: 0xA5, Write: 0x5A | Register Address Byte|Data length byte|Data bytes, n = data length byte |

#### Payload from BMS 

| Register Address Byte|Command status: OK: 0x0, Error: 0x80 |Data length byte|Data bytes, n = data length byte |

### Register Descriptions

#### Register 0x03 "Basic Info" (READ ONLY)

| Byte offset|Data                      |Format|Unit   |Field name(s)|Notes|
|-----       |----                      |----- |----   |-----        |-----|    
| 0x0        |Pack voltage              |U16   |10mV   |pack_mv      |     |
| 0x2        |Pack amperes              |S16   |10mA   |pack_ma      |Negative values indicate discharge|
| 0x4        |Balance Capacity          |U16   |10mAH  |cycle_cap    | |
| 0x6        |Full Capacity             |U16   |10mAH  |design_cap   | |
| 0x8        |Discharge/Charge Cycles   |U16   |1 cycle|cycle_cnt    | |
| 0xA        |Manufacture date|16 bit:<br>bits 15:9=year - 2000<br>bits 8:5=month<br>bits 4:0=Day<br>| -- |year, month, day| |  
| 0xC        |Cell balance status|16 bit:<br>bit 0: cell 1 balance active<br>bit 1: cell 2 balance active<br>...etc...| -- |    bal_0, bal_1, ... etc ...  | |
| 0xE        |Cell balance status|16 bit:<br>        bit 0: cell 17 balance active<br>         bit 1: cell 18 balance active<br>         ...etc...|--|bal_16, bal_17, &lt;etc&gt; | |
| 0x10|Current errors|16 bit:<br>bit 0: Cell overvolt<br>bit 1: Cell undervolt<br>         bit 2: Pack overvolt<br>         bit 3: Pack undervolt<br>         bit 4: Charge overtemp<br>         bit 5: Charge undertemp<br>         bit 6: Discharge overtemp<br>         bit 7: Discharge undertemp<br>         bit 8: Charge overcurrent<br>         bit 9: Discharge overcurrent<br>         bit 10: Short Circuit<br>         bit 11: Frontend IC error<br>         bit 12: Charge or Discharge FET locked by config (See register 0xE1 "MOSFET control")<br>        |--| covp_err, cuvp_err, povp_err, puvp_err, chgot_err, chgut_err, dsgot_err, dsgut_err, chgoc_err, dsgoc_err, sc_err, afe_err, software_err| |
| 0x11|Software Version|1 byte: 0x10 = 1.0 (BCD?)|--|version| |
| 0x12|State of Charge|1 byte|percent|cap_pct| |    
| 0x13|FET status|1 byte| bit 0: charge FET <br>         bit 1: discharge FET<br>         bit set = FET is conducting |chg_fet_en, dsg_fet_en| |    
| 0x14|Pack cells|1 byte|1 cell|cell_cnt| |    
| 0x15|NTC count|1 byte|1 NTC|ntc_cnt| |
| 0x16 .. 0x16 + ntc_cnt x 2|NTC Values|16 bits|0.1K|ntc0, ntc1, &lt;etc&gt;|


#### Register 0x04 "Cell voltages" (READ ONLY)

The number of values returned depends on the cell_cnt field from 0x3 "Basic Info".

| Byte offset |Data | Format |Field name(s) |
| -----       |-----|-----   |-----         |    
| 2 * cell number (starting at zero)|Cell voltage|16 bits, unsigned, unit: 1mV|cell0_mv, cell1_mv, &lt;etc&gt;|

#### Register 0x05 "Device Name" (READ ONLY)

| Byte offset | Data |Format |Field name(s)|
| -----       |----- |-----  |-----        |    
| 0x0|Device name length|1 byte, length of following string|--|    
| 0x1 .. n|Device name |n bytes of device name|device_name|

### Passwords

**Thanks to Steve Tecza at [Overkill Solar](https://overkillsolar.com/) for doing the legwork of figuring this out.**

Devices with firmware 0x16 or higher have password capability.

_If_ there is a password set, then the password should be sent to the register password _before_ entering into factory mode by writing the password to the `use_password` register.

Note that in the stock JBD FW, you can always clear the password by using the `clear_password` register.  This effectively makes passwords useless.

| Register Address |Register Name | Data | Format | Unit |Field name(s)|Notes|
| -----            |-----         |----- |-----   |----- |-----        |-----|    
| 0x06|use_password|bytes|[length byte (0x06)][6 byte password]|--|--|Write the current password to this register to enable access to entering "factory mode," below. This register is similar to a string register (e.g. "mfg_name") in that the first byte of the payload must be the length. Length must be 6.|
| 0x07|set_password|bytes|[length byte (0x0c)][6 byte current password][6 byte new password]|--|--|This changes the password.  A single 13-byte payload is provided. Byte 0 is the length (0x0c); next 6 bytes are the current password; final 6 bytes are the new password.  This register is similar to a string register (e.g. "mfg_name") in that the first byte of the payload must be the length. Length is 12.|
| 0x09|clear_password|J1B2D4|[length byte (0x6)] 'J1B2D4'|--|--|Write the ASCII value 'J1B2D4' to remove password protection. This register is similar to a string register (e.g. "mfg_name") in that the first byte of the payload must be the length. Length is 6.|


### EEPROM Register Descriptions
These registers are read/write configuration settings that are stored in EEPROM.  They affect the operation of the BMS.

Unless otherwise noted, all registers are 16 bit big-endian.  Signedness varies.


#### Register 0x00 "Enter factory Mode"
Write the byte sequence 0x56, 0x78 to enter "Factory Mode."  In this mode, the other registers below can be accessed.

#### Register 0x01 "Exit factory Mode"
Write the byte sequence 0x0, 0x0 to exit "Factory Mode."

Write the byte sequence 0x28, 0x28 to exit "Factory Mode," update the values in the EEPROM, and reset the "Error Counts" (0xAA) register to zeroes.

#### Stored registers:

| Register Address | Register Name | Data | Format | Unit |Field name(s)|Notes |
| -----            |-----          |----- |-----   |----- |-----        |----- |    
| 0x10|design_cap|Pack capacity, as designed|U16|10 mAh|design_cap||
| 0x11|cycle_cap|Pack capacity, per cycle|U16|10 mAh|cycle_cap||
| 0x12|cap_100|Cell capacity estimate voltage, 100%|U16|1 mV|cap_100||
| 0x32|cap_80|Cell capacity estimate voltage, 80%|U16|1 mV|cap_80||
| 0x33|cap_60|Cell capacity estimate voltage, 60%|U16|1 mV|cap_60||
| 0x34|cap_40|Cell capacity estimate voltage, 40%|U16|1 mV|cap_40||
| 0x35|cap_20|Cell capacity estimate voltage, 20%|U16|1 mV|cap_20||
| 0x13|cap_0|Cell capacity estimate voltage, 0%|U16|1 mV|cap_0||
| 0x14|dsg_rate|Cell estimated self discharge rate|U16|0.1%|dsg_rate||
| 0x15|mfg_date|Manufacture date|16 bit:<br>        bits 15:9=year - 2000<br>        bits 8:5=month<br>        bits 4:0=Day<br>     | -- |year, month, day||
| 0x16|serial_num|Serial number|U16|--|serial_num||
| 0x17|cycle_cnt|Cycle count|U16|cycle|cycle_cnt||
| 0x18|chgot|Charge Overtemp threshold|U16|0.1K|chgot||
| 0x19|chgot_rel|Charge Overtemp release threshold|U16|0.1K|chgot_rel|Temp must fall below this value to release overtemp condtion|
| 0x1A|chgut|Charge Undertemp threshold|U16|0.1K|chgut||
| 0x1B|chgut_rel|Charge Undertemp release threshold|U16|0.1K|chgut_rel|Temp must rise above this value to release overtemp condtion|
| 0x3A|chg_t_delays|Charge over/undertemp release delay| 2 bytes:<br>        &nbsp; byte 0: Charge under temp release delay<br>        &nbsp; byte 1: Charge over temp release delay<br>     |s|chgut_delay, chgot_delay||
| 0x3B|dsg_t_delays|Discharge over/undertemp release delay| 2 bytes:<br>        &nbsp; byte 0: Discharge under temp release delay<br>        &nbsp; byte 1: Discharge over temp release delay<br>     |s|dsgut_delay, dsgot_delay||
| 0x1C|dsgot|Discharge Overtemp threshold|U16|0.1K|dsgot||
| 0x1D|dsgot_rel|Discharge Overtemp release threshold|U16|0.1K|dsgot_rel|Temp must fall below this value to release overtemp condtion|
| 0x1E|dsgut|Discharge Undertemp threshold|U16|0.1K|dsgut||
| 0x1F|dsgut_rel|Discharge Undertemp release threshold|U16|0.1K|dsgut_rel|Temp must rise above this value to release overtemp condtion|
| 0x20|povp|Pack Overvoltage Protection threshold|U16|10 mV|povp||
| 0x21|povp_rel|Pack Overvoltage Protection Release threshold|U16|10 mV|povp_rel|Pack voltage must fall below this value to release overvoltage condition|
| 0x22|puvp|Pack Undervoltage Protection threshold|U16|10 mV|puvp||
| 0x23|puvp_rel|Pack Undervoltage Protection Release threshold|U16|10 mV|puvp_rel|Pack voltage must rise above this value to release undervoltage condition|
| 0x3C|pack_v_delays|Pack over/under voltage release delay|2 bytes:<br>        &nbsp; byte 0: Pack under volt release delay<br>        &nbsp; byte 1: Pack over volt release delay<br>     |s|puvp_delay, povp_delay||
| 0x24|covp|Cell Overvoltage Protection threshold|U16|1 mV|covp||
| 0x25|covp_rel|Cell Overvoltage Protection Release|U16|1 mV|covp_rel|Cell voltage must fall below this value to release overvoltage condition|
| 0x26|cuvp|Cell Undervoltage Protection threshold|U16|1 mV|cuvp||
| 0x27|cuvp_rel|Cell Undervoltage Protection Release threshold|U16|1 mV|cuvp_rel|Cell voltage must rise above this value to release undervoltage condition|
| 0x3D|cell_v_delays|Cell over/under voltage release delay|2 bytes:<br>        &nbsp; byte 0: Cell under volt release delay<br>        &nbsp; byte 1: Cell over volt release delay<br>     |s|cuvp_delay, covp_delay||
| 0x28|chgoc|Charge overcurrent threshold|S16|10 mA|chgoc|This number must be positive|
| 0x3E|chgoc_delays|Charge overcurrent delays|2 unsigned bytes:<br>        byte 0: chgoc_delay<br>        byte 1: chgoc_release|s|chgoc_delay, chgoc_rel||
| 0x29|dsgoc|Discharge overcurrent threshold|S16|10 mA|dsgoc|This number must be negative|
| 0x3f|chgoc_delays|Charge overcurrent delays|2 unsigned bytes:<br>        byte 0: dsgoc_delay<br>        byte 1: dsgoc_release|s|dsgoc_delay, dsgoc_rel||
| 0x2A|bal_start|Cell balance voltage|S16|1 mV|bal_start||
| 0x2B|bal_window|Balance window|U16|1mV|bal_window||
| 0x2C|shunt_res|Ampere measurement shunt resistor value|U16|0.1mΩ|shunt_res||
| 0x2D|func_config|Various functional config bits|U16:<br>        bit 0: switch<br>        bit 1: scrl<br>        bit 2: balance_en<br>        bit 3: chg_balance_en<br>        bit 4: led_en<br>        bit 5: led_num<br>     | -- |switch, scrl, balance_en, chg_balance_en, led_en, led_num|switch: Assume this enables the sw connector on the board?<br>        scrl: ?<br>        balance_en: Enable cell balancing<br>        chg_balance_en: Enable balancing during charge (balance_en must also be on)<br>        led_en: Assume that this enables LEDs?<br>        led_num: Show battery level with the LEDs in 20% increments<br>     |
| 0x2E|ntc_config|Enable / disable NTCs (thermistors)|U16:<br>         bit 0: NTC 1<br>         bit 1: NTC 2<br>         ... etc ...| -- | ntc1, ntc2 ... ntc8 ||
| 0x2F|cell_cnt|Number of cells in the pack|U16|1 cell|cell_cnt||
| 0x30|fet_ctrl|???|U16|1S|fet_ctrl||
| 0x31|led_timer|???|U16|1S|led_timer|Assume it's the number of seconds the LEDs stay on when status changes?|
| 0x36|covp_high|Secondary cell overvoltage protection|U16|1mV|covp_high||
| 0x37|cuvp_high|Secondary cell undervoltage protection|U16|1mV|cuvp_high||
| 0x38|sc_dsgoc2|Short circuit and secondary overcurrent settings|        2 bytes:<br>        <br>        &nbsp;byte 0: <br>        &nbsp;&nbsp;bit 7: sc_dsgoc_x2<br>        &nbsp;&nbsp;bits 4:3: sc_delay<br>        &nbsp;&nbsp;&nbsp;0 = 70uS<br>        &nbsp;&nbsp;&nbsp;1 = 100uS<br>        &nbsp;&nbsp;&nbsp;2 = 200uS<br>        &nbsp;&nbsp;&nbsp;3 = 400uS<br>        &nbsp;&nbsp;bits 2:0: sc<br>        &nbsp;&nbsp;&nbsp;0 = 22mV<br>        &nbsp;&nbsp;&nbsp;1 = 33mV<br>        &nbsp;&nbsp;&nbsp;2 = 44mV<br>        &nbsp;&nbsp;&nbsp;3 = 56mV<br>        &nbsp;&nbsp;&nbsp;4 = 67mV<br>        &nbsp;&nbsp;&nbsp;5 = 78mV<br>        &nbsp;&nbsp;&nbsp;6 = 89mV<br>        &nbsp;&nbsp;&nbsp;7 = 100mV<br>        <br>        &nbsp;byte 1: <br>        &nbsp;&nbsp;bits 7:4: dsgoc2_delay<br>        &nbsp;&nbsp;&nbsp;0 = 8ms<br>        &nbsp;&nbsp;&nbsp;1 = 20ms<br>        &nbsp;&nbsp;&nbsp;2 = 40ms<br>        &nbsp;&nbsp;&nbsp;3 = 80ms<br>        &nbsp;&nbsp;&nbsp;4 = 160ms<br>        &nbsp;&nbsp;&nbsp;5 = 320ms<br>        &nbsp;&nbsp;&nbsp;6 = 640ms<br>        &nbsp;&nbsp;&nbsp;7 = 1280ms<br>        &nbsp;&nbsp;bits 3:0: dsgoc2<br>        &nbsp;&nbsp;&nbsp;0 = 8mV<br>        &nbsp;&nbsp;&nbsp;1 = 11mV<br>        &nbsp;&nbsp;&nbsp;2 = 14mV<br>        &nbsp;&nbsp;&nbsp;3 = 17mV<br>        &nbsp;&nbsp;&nbsp;4 = 19mV<br>        &nbsp;&nbsp;&nbsp;5 = 22mV<br>        &nbsp;&nbsp;&nbsp;6 = 25mV<br>        &nbsp;&nbsp;&nbsp;7 = 28mV<br>        &nbsp;&nbsp;&nbsp;8 = 31mV<br>        &nbsp;&nbsp;&nbsp;9 = 33mV<br>        &nbsp;&nbsp;&nbsp;A = 36mV<br>        &nbsp;&nbsp;&nbsp;B = 39mV<br>        &nbsp;&nbsp;&nbsp;C = 42mV<br>        &nbsp;&nbsp;&nbsp;D = 44mV<br>        &nbsp;&nbsp;&nbsp;E = 47mV<br>        &nbsp;&nbsp;&nbsp;F = 50mV<br>     | -- |sc, sc_delay, dsgoc2, dsgoc2_delay, sc_dsgoc_x2|sc: Assuming this is the voltage across that shunt that would indicate short-circuit<br>        sc_delay: Assuming this is how long that voltage would need to be present<br>        dsgoc2: Assuming this is the voltage across that shunt that would indicate secondary overcurrent<br>        dsgoc2_delay: Assuming this is how long that voltage would need to be present<br>        dsgoc2_x2: Boolean; if set, assume all the values here are doubled<br>     |
| 0x39|cxvp_high_delay_sc_rel|Secondary cell under/over voltage release times, and short circuilt release time|2 bytes:<br>        <br>        &nbsp;byte 0: <br>        &nbsp;&nbsp;bits 7:6: cuvp_high_delay<br>        &nbsp;&nbsp;&nbsp;0 = 1S<br>        &nbsp;&nbsp;&nbsp;1 = 4S<br>        &nbsp;&nbsp;&nbsp;2 = 8S<br>        &nbsp;&nbsp;&nbsp;3 = 16S<br>        &nbsp;&nbsp;bits 5:4: covp_high_delay<br>        &nbsp;&nbsp;&nbsp;0 = 1S<br>        &nbsp;&nbsp;&nbsp;1 = 2S<br>        &nbsp;&nbsp;&nbsp;2 = 4S<br>        &nbsp;&nbsp;&nbsp;3 = 8S<br>        <br>        &nbsp;byte 1: Short Circuit release time, seconds| -- | cuvp_high_delay, covp_high_delay, sc_rel||
| 0xA0|mfg_name|Manufacturer name|Variable length string: <br>        Byte 0: Length of string (n)<br>        Byte 1 ... n + 1: String<br>     | -- |mfg_name||
| 0xA1|device_name|Device name|Variable length string: <br>        Byte 0: Length of string (n)<br>        Byte 1 ... n + 1: String<br>     | -- |device_name||
| 0xA2|barcode|Barcode|Variable length string: <br>        Byte 0: Length of string (n)<br>        Byte 1 ... n + 1: String<br>     | -- |barcode||
| 0xAA|error_cnts|Various error condition counts|11 U16| -- |sc_err_cnt, chgoc_err_cnt, dsgoc_err_cnt, covp_err_cnt, cuvp_err_cnt, chgot_err_cnt, chgut_err_cnt, dsgot_err_cnt, dsgut_err_cnt, povp_err_cnt, puvp_err_cnt|READ ONLY|
| 0xB0 .. 0xCF||Cell voltage calibration registers (32)|U16|1mV||Write the actually measured value of each cell to set the calibration|
| 0xD0 .. 0xD7||NTC calibration registers (8)|U16|0.1K||Write the actually measured temperature of each NTC to set the calibration|
| 0xE1||MOSFET control|U16:<br>        &nbsp;bit 0: Set to disable charge FET<br>        &nbsp;bit 1: Set to disable discharge FET<br>     |--|||
| 0xE2||Balance control|U16:<br>        &nbsp;0x01: Open odd cells&nbsp;0x02: Open even cells&nbsp;0x03: Close all cells|--||To exit this mode: Enter, then exit factory mode.|
| 0xAD| |Idle Current Calibration|        U16: Write 0x0 when no current is flowing|--|||
| 0xAE| |Charge Current Calibration|U16||Write the actual current. This value is positive.|
| 0xAF| |Discharge Current Calibration|U16||Write the actual current. This value is positive.|
| 0xE0| |Capacity remaining|U16|||
