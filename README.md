# N2K and NMEA0183 Wifi server exposing http, tcp and udp services.

* Runs on a ESP32. 
* Connects to a NMEA2000 bus using the ESP CAN device and a CAN Driver as a CAN Node. 
* Parses NMEA2000 messages and stores them with history. 
* Emits NMEA0183 messages on tcp and udp.
* Exposes a http admin interface for configuration.
* Exposes the store over http.
* Exposes updates to the store over websockets.
* Hosts UI applications delivered over http.
* Runs either as an WiFi station or as an Access Point.


ToDo

* [x] Setup Wifi
* [x] Setup MDNS registration
* [x] Implement webserver
* [x] Serve files from Flash (SPIFFS)
* [x] Implement data api /api/data/<n> where n == 0-10.
* [x] Expose set of standard CAN messages on /api/data
* [x] Implement simple UI in Javascript hosted on SPIFFS, targetting eink and normal browsers (based on SignalK eink)
* [x] Implement admin interface.
* [x] Support configuration and calibration via web browser.
* [x] Implement TCP server 
* [x] Implement NMEA0183 bridge
* [x] Reduce Wifi power to 2dbm, also helps avoid can brownouts and hangs.
* [x] Test NMEA0183 with NKE, Navionics and NMea android apps.
* [x] Implement UDP server 
* [x] Implement WebSocket Server
* [-] ~~Wire Store into NMEA0183 outputs~~
* [x] Expose message stream over websockets
* [x] Emit NMEA0183 messages generated from calculations
* [ ] Verify performance messages
* [ ] Remove N2KCollector
* [ ] Emit data for websockets in raw form tbd.
* [ ] Emit raw pgn messages in some form.
* [ ] Port in web apps from Electron NMEA App


## Archived functionality

The project was forked from CanDiagnose https://github.com/ieb/CanDiagnose wip branch which contains the functionality below.

* [x] Implement BPM280 source  (moved to archive)
* [x] Implement calibration mechanism using DAC (moved to archive)
* [Fail] Implement ADC Source (esp adc not sufficiently accurate)
* [x] Redesign PCB to use 16bit ADC over i2c  (ADS1115)
* [x] Implement ADC sensor code (move to archive)
* [x] Add OLED display  (moved to archive)
* [x] Add touch sensor to control oled display (moved to archive)
* [x] Bench Calibrate expecialy shunt (moved to archive)
* [x] Install test and calibrate. - Failed, the distance between the board and the batteries is too great to get reliable shunt measurements. 
* [x] Investigate using a shunt amplifier as used by VRA Alternator controller
* [x] Implement remote battery sensor using Modbus  (see BatterySensor project) (moved to archive)
* [x] Reimplement PCB to have no BME280 and no ADS1115 replacing with a RS485 interface to ModBus devices.  (see CanPressure for Can based pressure, humidity, temperature sensor) (moved to archive)
* [x] Implement Modbus master (moved to archive)
* [x] Support Configuraiton of single and differential ADC.


# Usage

The device will boot and connect to wifi controlled by its burned in config file (data/config.txt). 
There are 2 modes it can run in, a WiFi client or a AP. If its configured to be an AP, then join its network. If its a client find its ip. From now on this will be <ip>

Go to its ip on http://<ip> and you will see a data view of the data it is capturing.
Go to http://<ip>/admin.html and you will see a admin view with the ability to upload a new configuration file and reboot.

Both these views are SPAs served from static files burned into the ESP32 Flash using APIs.

Connecting to the serial port monitor allows lower level control and diagnostics, enter 'h<CR>' to get help.

# Developing

Project uses PlatformIO.  WebUI is in  ui/einkweb with build files added to data/ to be built into a flash image using ./buidui.sh

## PIO commands

because I alwaysforget.

* pio run -t upload
* pio device monitor

See buildui.sh for SPIFFS image commands.

# Connectors


    ---------------------------------------------
    |           a b c d e f g h                 |
    |  A                                        |
    |  B                                        |
    |  C                                        |
    |  D                                     H  |
    |  E                                     I  |
    |  F                                     J  |
    |  G           i j k l m                 K  |
    ---------------------------------------------

    a  SPI BL   GPIO13  not in use
    b  SPI RST  GPIO12  not in use
    c  SPI DC   GPIO26  not in use
    d  SPI CS   GPIO25  not in use
    e  SPI SCK  GPIO33  not in use
    f  SPI MOSI GPIO32  not in use
    g  SPI GND          not in use
    h  SPI 3V           not in use
    i  i2c GND      Display black/blue not in use
    j  i2c SCL  D5    Display green not in use
    k  i2c SDA  D18    Display white not in use
    l  i2c BTN  D19    Display yellow not in use
    m  i2c 3V       Display red not in use

    A  1wire 1w  D21  not in use
    B  1wire GND  not in use
    C  1wire 3V not in use
    D  RS-485 5.8V not in use
    E  RS-485 GND not in use
    F  RS-485 A  not in use
    G  RS-485 B not in use
    H  CAN 12V
    I  CAN 0V
    J  CAN CANH
    K  CAN CANL


    Other Pins Not mentioned above
    RS485-TX TX2/GPIO17
    RS485-RX RX2/GPIO16
    RS485-EN D4
    CAN-RX  D22
    CAN-TX  D23

# Displays

Rather than using decicated hardware displays I have decided to switch to apps since the power consumption is better and they require no installation onboard.  Most of the display code is in the archive subfolder.


## eInk Waveshare display

This uses SPI output only with a bunch of additional pins.

    eInk DIN <-  f  SPI MOSI GPIO32
    eInk CLK <-  e  SPI SCK  GPIO33
    eInk CS  <-  d  SPI CS   GPIO25
    eInk DC  <-  c  SPI DC   GPIO26
    eInk RST <-  b  SPI RST  GPIO12
    eInk BUSY -> a  SPI BL   GPIO13

 

## 4 inch TFT display 480x320 24 bit colour driven by a ILI9488 driver. (archived)

uses SPI + a PWM blacklight. Control via a TPP233 Touch switch. Library is TFT_eSPI library. Pin mappings defined as compile definitions.

    -D TFT_MISO=GPIO_NUM_35
    -D TFT_MOSI=GPIO_NUM_32
    -D TFT_SCLK=GPIO_NUM_33
    -D TFT_CS=GPIO_NUM_25
    -D TFT_DC=GPIO_NUM_26
    -D TFT_RST=GPIO_NUM_27
    -D TFT_PWM_BL=GPIO_NUM_14
    -D ILI9488_DRIVER

The display sleeps after 60s of inactivity to reduce power drain, but turning off the backlight. Sleeping the IMI9488 driver has not been done as of yet.  Pages are implemented as classes using widgets. When a page is selected it is allocated into heap and does not exist while not displaying. On other drivers here all pages were compiled in, however the RAM usage is higher on account of full colour and display size. 

In most cases attempts to update the screen, on screen causes flickering so double buffering of updates is done using sprits with DMA transfers from the sprite to the screen. Images for screen are stored in jpg on flash, consuming about 30KB per screen.

Drawing to sprites also works in 1bpp, 4bpp or 16bpp.

### TFT case

3d printed case, with 2 touch sensors and round shielded cable, as ribbon will emit too much interference to nearby devices. 

Wires

|| color || designation || ESP32 Pin ||
---------------------------------------
| Red    |  5v          | 5v           |
| black  |  0v          | 0v           |
| pink   |  CS          | GPIO_NUM_25  |
| cyan   |  Reset       | GPIO_NUM_27  |
| white  |  DC/RS       | GPIO_NUM_26  |
| blue   |  SDI(MOSI)   | GPIO_NUM_32  |
| green  |  SCK         | GPIO_NUM_33  |
| grey   |  LED         | GPIO_NUM_14  |
| Purple |  SDO(MISO)   | GPIO_NUM_35  |
| Orange |  3.3v        | 3.3v         |
| Brown  | Touch Lower  | GPIO_NUM_19  |
| Yellow | Touch Top    | TBD          |

Due to the additional touch pins a fresh PCB is probably needed.


