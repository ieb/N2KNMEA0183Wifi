# JBD LifePO4 BMS Display

This is a LifePO4 BMS Display using a seasmart stream of N2K messages from a JBD BMS registers
To modify the display, change the html, it should support upto 32 cells.

It doesn't change any settings, although it could be patched to do that.


# Why ?

Because I use ChromeOS for other things on my boat, and none of the Android apps that use BLE work as they require precise location information, which ChromeBooks dont have.... so I wrote this... then it evolved to use Seasmart over http as there was no security with the BLE adapter and anyone could walk by and change the BMS settings.


# How does it work ?

It consumes PGN 127508 and 130829 from a seasmart http stream the latter containing registers 03, 04, 05. On reception the display is modified. History is captured and saved every 60s into local storage giving graphs of several parameters over a few days.

<div>
<img alt="UI" src="screenshots/Screenshot 2024-12-23 at 18.11.23.png" />
</div>


# Todo

- [x] Add history and graphing using local storage for longer term persistence.
- [-] ~~Make into a Chrome extension to make it easier to load from Chrome.~~  Not worth it given Chrome extensions will die eventually.
- [x] Convert into a PWA.
- [x] Extend time window to 24h and allow zooming into the graphs.
- [-] ~~Make the BLE work in the background ~~  The Web Bluetooth API is not available in any background task.
- [x] Add charge discharge gauge in svg
- [x] Port to use seasmart http stream and deprecate BLE stream
- [x] State of charge and remaining charge graphs




