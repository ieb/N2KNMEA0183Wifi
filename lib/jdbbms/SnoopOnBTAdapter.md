Snooping on the BT adapter with a real BMS.

Supply voltage from the BMS is 12v or the battery voltage. Previously believed to be something else.
TTL levels are 3.3v based on scope.

Pins are 
12V BMS TX  BMS RX GND


The BMS keeps both signal lines at 0v when idle, however when it detects activity (how?) it pulls the BMS TX line up to 3V. If there is no activity then after about 30s it will go back to sleep and remove the pull up. BMS TX goes back to 0V in about 1S.

Its not clear what wakes up the BMS interface.
12V is permanently powered, 4.7K to gnd has no effect.
An edge at the BMS RX line either rising or falling triggers the TX line to raise.

If the LDO is enabled all the time, then in operation (BMS TX high), 0mA flows through the led in the isolator, but when the BMS TX goes low, there will be 1mA flowing through the LED.
Also One of the 6N137 will be powered permanently, (4mA)

So we cant use a LDO without an enable driven by the CAN side, LP2985 may work. Needs to be raised to enable.
Can only do this via another low speed opto isolator.

The BMS is not outputting enough current to drive a 6N137 so will have to switch to a digital isolator that can. LP2985 looks as if it will work ok.

Final circuit that works is a Digital Isolator, eg a STIS0621 supplied by a LP2985 which the enable 
raised high via a PC817 connected to 12v on the BMS side and the 5v line on the CAN side. Current 
drawn when the CAN side is disabled is < 1uA and the serial output is clean.

BMS behaves as expected, waking up on the first serial packet and going to sleep when there is no activity.

Investigation notes below.



BMS TX Device RX is high on idle when BMS is awake. When sleeping
BMS RX Device TX is dependent on the the device.

Requests at turn on of the BT adapter

Enter Factory mode
> DD 5A 00 02 56 78 FF 30 77 
< DD 00 00 00 00 00 77 
Confirmed

 A2  Not known ????
> DD A5 A2 00 FF 5E 77 
< DD A2 00 01 00 FF FF 77 
Write 01  

Exit factory mode. 
> DD 5A 01 02 00 00 FF FD 77 
< DD 01 00 00 00 00 77 
Confrmed

Read 05 Version string in ACII
> DD A5 05 00 FF FB 77 
< DD 05 00 15 4A 42 44 2D 53 50 30 34 53 30 36 30 2D 33 30 30 41 2D 4C 34 53 FA FD 77 
           ^^ Length                                                         ^^^^^ Checksum   
              J  B  D  -  S  P  0  4  S  0  6  0  -  3  0   0  A  - L  4  S    



On BT connect

Read 04 Cell voltages
> DD A5 04 00 FF FC 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
Read 03 Status
> DD A5 03 00 FF FD 77 
< DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 

Read 06 password
> DD 5A 06 07 06 00 00 00 00 00 00 FF ED 77 
< DD 06 00 00 00 00 77 


Then read 03, 04
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 03 00 FF FD 77 
 > DD A5 04 00 FF FC 77 
 > DD A5 03 00 FF FD 77



 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 05 0D 05 FF B1 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 07 0D 06 0D 05 FF AF 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 07 0D 06 0D 05 FF AF 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5E 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FC 77 
 < DD 04 00 08 0D 03 0D 06 0D 05 0D 05 FF B1 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5F 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FB 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5E 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FC 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 4B 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F9 0F 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5E 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FC 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5E 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FC 77 
 < DD 04 00 08 0D 03 0D 06 0D 06 0D 05 FF B0 77 
 < DD 03 00 26 05 35 00 00 74 65 76 C0 00 04 2E A8 00 00 00 00 00 00 25 62 03 04 03 0B 5E 0B 4D 0B 4F 00 00 00 76 C0 74 65 00 00 F8 FC 77 
