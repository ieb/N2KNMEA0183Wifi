

const BMS_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';
// Tx and Rx characteristics, connect to send and recieve on the BMS Uart
const BMS_TXCH_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';
const BMS_RXCH_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';


Commands are written to the TX channel
The RX channel is observed for notifications containing responses to the commands.

Commands are effectively modbus commands.


const BMS_READ_REG3 = Uint8Array.of(0xdd, 0xa5, 0x3, 0x0, 0xff, 0xfd, 0x77);
// read register 0x04
const BMS_READ_REG4 = Uint8Array.of(0xdd, 0xa5, 0x4, 0x0, 0xff, 0xfc, 0x77);

Byte 0
0xdd == start of message

Byte 1
0xA5 == read  
0x5A == write 

Byte 2,  
Register address = 0x03 or 0x04

Byte 3
Data length
0 in the above

U16 checksum
0xff, 0xfc

End message
0x77
