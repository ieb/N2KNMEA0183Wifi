# UIs

Here are a variety of UIs that are burned into the firmware.
They all use the http API to fetch data from the ESP32 once loaded, defined in swagger.yaml in this directory.

# v2

React (preact) based SPA UI with instruments, and can diagnoses screens and an admin ui that allows update of the ESP32 filesystem. Uses a WebSocket SeaSmart stream for raw can messages. Has a can decoder built in. Uses an API for managing the filesystem.


# einkweb

Is a minimal eink browser implementation targetting Generation 1 Kindle devices, but also works on modern browsers and Andriod.  Needs update to work on the latest streams. Dont use for the moment.




