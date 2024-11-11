# JDB BMS Support

Support the JDB UART Protocol monitoring standard parameters.

This code was written because the standard BLE interface that comes with these BMS's has no security. Anyone who is close enough can connect and mess with the BMS including re-configuring the settings. For that reason, I would prefer to connect directly to the UART and expose only what is necessary, read only, with some basic security.

The class polls the UART periodically for updates of registers 03, 04 and 05 although 05 only on start.
The registers are decoded and stored in the class so that other code can use the values.

Details of the UART protocol can be found in https://github.com/FurTrader/OverkillSolarBMS/blob/master/Comm_Protocol_Documentation/Translated_to_english_JBD_comm_ptotocol_20230321_V11.pdf copied into this location also.


NB the JDB BMS is BigEndian, but CAN is LittleEndian so all multi byte representation must be converted in the registers. This is done on receipt of messages from the BMS.

## -> BLE pass through

Unfortunately the BLE stack in ESP32 for Arduino uses 40% of the flash and does not appear to be stable so the code for the GATT server has been moved to the archive and is no longer used.



## UART -> ESP32  -> N2K message

Handled by JdbBMS using

      JdbBMS bms(&Serial1);
      void setup() {
        ...
        bms.begin();
      }
      ...
      void loop() {
        ...
        bms.update();
        tN2kMsg N2kMsg;
        if ( bms.setN2KMsg(N2kMsg) )  {
            sendMessage(N2KMsg);
        }
      }

# Standard N2K messages

Safe to emit onto the N2K Bus

* 0x1F214: PGN 127508 - Battery Status 
* 0x1F212: PGN 127506 - DC Detailed Status
* 0x1F219: PGN 127513 - Battery Configuration Status

# Proprietary N2K Messages

Probably safe to emit, but nothing else will understand this and its tightly bound to the JDB BMS. 
Here for internal use over http and tcp.

PGN 130829L

Field 1 is Manufacturer code (bits 0-10) + reserveed (11-12) industry (13-15) in standard format
Manufacture code is 2046 Industry 4 (marine) = 0x9ffe  as a U16

## Register 0x03 - BMS Status

| Field # | Field Name        | Description | Unit       | Byte offset |Type                      |
| ------- | ----------------- | ----------- | ---------- | ----------- | ------------- |
| 1       | Proprietary Code  | 0x9ffe      |            | 0           | Unsigned 16 bit Proprietary ID |  
| 2       | Instance          |             |            | 2           | U8 Battery Instance           |
| 3       | Register          | 3           | ident      | 3           | U8 BMS Register number       |
| 4       | Register Length   |             |            | 4           | U8 int     |
| 5       | Pack Voltage      |             | 0.01V      | 5           | U16  double    |
| 6       | Current           |             | 0.01A      | 7           | S16  double    |
| 7       | Remaining Capacity|             | 0.01Ah     | 9           | U16  double   |
| 8       | Nominal Capacity  |             | 0.01Ah     | 11          | U16  double   |
| 9       | Manufacture Date  | date, bits 15:9=year - 2000<br>bits 8:5=month<br>bits 4:0=Day            | dateEncoded| 13          | U16  date |
| 10       | Balance Status 1  | 1=active 0=inactive for cells 0-15 |  | 15 | U16  bitmap   |
| 11      | Balance Status 2  | 1=active 0=inactive for cells 16-31|  | 17 | U16  bitmap   |
| 12      | Protection Status 2 | 16 bit:<br>bit 0: Cell overvolt<br>bit 1: Cell undervolt<br>         bit 2: Pack overvolt<br>         bit 3: Pack undervolt<br>         bit 4: Charge overtemp<br>         bit 5: Charge undertemp<br>         bit 6: Discharge overtemp<br>         bit 7: Discharge undertemp<br>         bit 8: Charge overcurrent<br>         bit 9: Discharge overcurrent<br>         bit 10: Short Circuit<br>         bit 11: Frontend IC error<br>         bit 12: Charge or Discharge FET locked by config (See register 0xE1 "MOSFET control")<br>    |  | 19| U16  bitmap   |
| 13      | Software version  |              |           | 21          | U8  BCD   |
| 14      | State of charge   |              | %         | 22          | U8  int   |
| 15      | Fet Control       |   bit 0: set=charge On <br>bit 1: set=discharge On<br>bit 2: set=Current limit on<br>bit 3: set=Heating on                  |           | 23          | U8  bitmap   |
| 16      | Number of cells   |              |           | 24          | U8  int   |
| 17      | Number of NTC     |              |           | 25          | U8  int   |
| 18      | Temperature       | Temperature  | 0.1K      | 26          | U16 array double  |
| 19      | Humidity          | Humidity     | % RH      | 26+2xNTC    | U8  int  |
| 20      | Alarm Status      | not normally used |      | 26+2xNTC+1  | U16 bitmap  |
| 21      | Full charge capacity |           | 0.01Ah    | 26+2xNTC+3  | U16 double  |
| 22      | remaining charge capacity |      | 0.01Ah    | 26+2xNTC+5  | U16 double  |
| 23      | Balance current   |              | 0.001A    | 26+2xNTC+7  | U16 double  |


Field 6 will be 0.1A if bit 12 offset 29 (Function code) of register 0xfa (parameter settings) is 1.
Field 7,21,22 will be 0.1Ah if bit 12 offset 29 (Function code) of register 0xfa (parameter settings) is 1.

## Register 0x04 - Cell Voltages

| Field # | Field Name        | Description | Unit       | Byte offset |Type                      |
| ------- | ----------------- | ----------- | ---------- | ----------- | ------------- |
| 1       | Proprietary Code  | 0x9ffe      |            | 0           | Unsigned 16 bit Proprietary ID |  
| 2       | Instance          |             |            | 2           | U8 Battery Instance           |
| 3       | Register          | 4           | register   | 2        | U8 BMS Register number       |
| 4       | Register Length   |             |            | 3           | U8      |
| 5       | Cell Voltage      |             | 0.001V     | 4           | U16  array of doubles to end of message |



## Register 0x04 - Hardware Version String

| Field # | Field Name        | Description | Unit       | Byte offset |Type                      |
| ------- | ----------------- | ----------- | ---------- | ----------- | ------------- |
| 1       | Proprietary Code  | 0x9ffe      |            | 0           | Unsigned 16 bit Proprietary ID |  
| 2       | Register          | 5           | ident      | 2           | U8 BMS Register number       |
| 3       | Register Length   |             | SID        | 3           | U8      |
| 4       | Hardware version string |       |            | 4           | U8 ASCII array to end of message |


