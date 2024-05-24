# JBD LifePO4 BMS Display

This is a LifePO4 BMS Display for JBD BMS's with a Bluetooth Adapter. Its implemented as a single HTML page using the WebAPI BLE support present in most modern browsers. To use, open the index.html and click connect.

To modify the display, change the html, it should support upto 32 cells.

It doesn't change any settings, although it could be patched to do that.


# Why ?

Because I use ChromeOS for other things on my boat, and none of the Android apps that use BLE work as they require precise location information, which ChromeBooks dont have.... so I wrote this.


# How does it work ?

The Bluetooth adapter for these BMS exposes Modbus RTE from the BMS UART over 2 BLE Characteristics, one to write to, the other to read from. The code sends a read request for registers 0x03 and 0x04 and listens for notifications containing the responses, which it then decodes and displays.

# Todo

- [x] Add history and graphing using local storage for longer term persistence.
- [ ] Make the BLE work in the background 
- [ ] Make into a Chrome extension to make it easier to load from Chrome. 

