// Demo: NMEA2000 library. 
// This demo reads messages from NMEA 2000 bus and
// sends them translated to clear text to Serial.

// Note! If you use this on Arduino Mega, I prefer to also connect interrupt line
// for MCP2515 and define N2k_CAN_INT_PIN to related line. E.g. MessageSender
// sends so many messages that Mega can not handle them. If you only use
// received messages internally without slow operations, then youmay survive
// without interrupt.

#include <Arduino.h>
#include <Wire.h>



// Pins   
#define ESP32_CAN_RX_PIN GPIO_NUM_22
#define ESP32_CAN_TX_PIN GPIO_NUM_23


#define MAX_NMEA0183_MESSAGE_SIZE 100

//#define ONEWIRE_GPIO_PIN GPIO_NUM_21
//#define SDA_PIN GPIO_NUM_18
//#define SCL_PIN GPIO_NUM_5
//#define DISPLAY_BUTTON GPIO_NUM_34

// RS584 on Serial2 TX
//#define RS485_TX GPIO_NUM_17
//#define RS485_RX GPIO_NUM_16
//#define RS485_EN GPIO_NUM_4



// Calibrations to take account of resistor tollerances, this is specific to the board being flashed.
// should probably be in a config file eventually.



#include <NMEA2000_esp32.h>

// The method recomended doesnt work well so explicitly create the NMEA2000 objects to be sure
// the pins are correct. I've had loads of problems with this depening 
// on how the libraries are created.

tNMEA2000 &NMEA2000=*(new tNMEA2000_esp32(ESP32_CAN_TX_PIN, ESP32_CAN_RX_PIN));


// #include <NMEA2000_CAN.h>

#include "listdevices.h"
#include "N2KPrinter.h"
#include "performance.h"
#include "N2KHandler.h"
#include "NMEA0183N2KMessages.h"
#include "network.h"
#include "logbook.h"


#include "esp32-hal-psram.h"



// Only define this if the main loop os so slow that 
// button presses dont work properly.
// #define USE_INTERRUPT 1

Stream *OutputStream = &Serial;
N2KPrinter n2kPrinter(OutputStream);
ListDevices listDevices(&NMEA2000, OutputStream);


LogBook logbook;
Wifi wifi(OutputStream);
WebServer webServer(OutputStream);
EchoServer echoServer(OutputStream);
TcpServer nmeaServer(OutputStream, 10110, 10);
UdpSender nmeaSender(OutputStream, 10110);


NMEA0183N2KMessages messageEncoder;
N2KMessageEncoder pgnEncoder;
Performance performance(&messageEncoder);
N2KHandler n2kHander(&messageEncoder, &pgnEncoder, &performance, &logbook);


unsigned long lastButtonPress = 0;
unsigned long lastButtonRelease = 0;





const unsigned long TransmitMessages[] PROGMEM={0};
const unsigned long ReceiveMessages[] PROGMEM={/*126992L,*/ // System time
        126992L, //SystemTime(N2kMsg)
        127245L, //Rudder(N2kMsg)
        127250L, //Heading(N2kMsg)
        127257L, //Attitude(N2kMsg)
        127488L, //EngineRapid(N2kMsg)
        127489L, //EngineDynamicParameters(N2kMsg)
        127493L, //TransmissionParameters(N2kMsg)
        127497L, //TripFuelConsumption(N2kMsg)
        127501L, //BinaryStatus(N2kMsg)
        127505L, //FluidLevel(N2kMsg)
        127506L, //DCStatus(N2kMsg)
        127508L, //DCBatteryStatus(N2kMsg)
        127513L, //BatteryConfigurationStatus(N2kMsg)
        128259L, //Speed(N2kMsg)
        128267L, //WaterDepth(N2kMsg)
        129026L, //COGSOG(N2kMsg)
        129029L, //GNSS(N2kMsg)
        129033L, //LocalOffset(N2kMsg)
        129045L, //UserDatumSettings(N2kMsg)
        129540L, //GNSSSatsInView(N2kMsg)
        130310L, //OutsideEnvironmental(N2kMsg)
        130311L, //EnvironmentalParameters(N2kMsg)
        130312L, //Temperature(N2kMsg)
        130313L, //Humidity(N2kMsg)
        130314L, //Pressure(N2kMsg)
        130316L, //TemperatureExt(N2kMsg)
        129283L, //Xte(N2kMsg)
        127258L, //MagneticVariation(N2kMsg)
        130306L, //WindSpeed(N2kMsg)
        128275L, //Log(N2kMsg)
        129025L, //LatLon(N2kMsg)
        128000L, //Leeway(N2kMsg)
        0};



void HandleNMEA2000Msg(const tN2kMsg &N2kMsg) {
   listDevices.HandleMsg(N2kMsg);
    n2kPrinter.HandleMsg(N2kMsg);
    n2kHander.handle(N2kMsg);
}

void showHelp() {
  OutputStream->println("Device analyzer started.");
  OutputStream->println("  - Analyzer will automatically print new list on list changes.");
  OutputStream->println("  - Send 'h' to show this message");
  OutputStream->println("  - Send 's' to show status");
  OutputStream->println("  - Send 'u' to print latest list of devices");
  OutputStream->println("  - Send 'o' to toggle output, can be high volume");
  OutputStream->println("  - Send 'd' to toggle packet dump, can be high volume");
  OutputStream->println("  - Send 'S' to put to sleep");
  OutputStream->println("  - Send 'A' to toggle Wifi AP");
   
}


void SendNMEA0183Message(const char * buf) {
  nmeaServer.sendBufToClients(buf);
  nmeaSender.sendBufToClients(buf);
  webServer.sendN0183(buf);
}



void setup() {
  Serial.begin(115200); 
  if ( !psramInit() ) {
    Serial.println("PSRAM not available.");
  } else {
    Serial.print("Total PSRAM: ");Serial.println(ESP.getPsramSize());
    Serial.print("Free PSRAM:  ");Serial.println(ESP.getFreePsram());
  }

  // Start the wifi
  wifi.begin();
  echoServer.begin();
  nmeaServer.begin();
  nmeaSender.begin();
  nmeaSender.setDestination(wifi.getBroadcastIP());


  webServer.addJsonOutputHandler(0,&listDevices);
  webServer.addCsvOutputHandler(0,&listDevices);
  webServer.begin();

  // Set Product information
  NMEA2000.SetProductInformation("00000003", // Manufacturer's Model SerialIO code
                                 100, // Manufacturer's product code
                                 "N2k bus device analyzer",  // Manufacturer's Model ID
                                 "1.0.0.10 (2017-07-29)",  // Manufacturer's Software version code
                                 "1.0.0.0 (2017-07-12)" // Manufacturer's Model version
                                );

  // Set device information
  NMEA2000.SetDeviceInformation(5, // Unique number. Use e.g. SerialIO number.
                                130, // Device function=Display. See codes on http://www.nmea.org/Assets/20120726%20nmea%202000%20class%20&%20function%20codes%20v%202.00.pdf
                                120, // Device class=Display. See codes on  http://www.nmea.org/Assets/20120726%20nmea%202000%20class%20&%20function%20codes%20v%202.00.pdf
                                2046 // Just choosen free from code list on http://www.nmea.org/Assets/20121020%20nmea%202000%20registration%20list.pdf
                               );


  messageEncoder.setSendBufferCallback(SendNMEA0183Message);

//  NMEA2000.SetN2kCANReceiveFrameBufSize(50);
  // Do not forward bus messages at all
  NMEA2000.SetForwardType(tNMEA2000::fwdt_Text);
  NMEA2000.SetForwardStream(OutputStream);
  // Set false below, if you do not want to see messages parsed to HEX withing library
  NMEA2000.EnableForward(false);
  NMEA2000.SetN2kCANReceiveFrameBufSize(150);
  NMEA2000.SetN2kCANMsgBufSize(8);
  NMEA2000.ExtendTransmitMessages(TransmitMessages);
  NMEA2000.ExtendReceiveMessages(ReceiveMessages);

  NMEA2000.SetMsgHandler(HandleNMEA2000Msg);

  NMEA2000.SetMode(tNMEA2000::N2km_ListenAndNode, 50);
//  NMEA2000.SetMode(tNMEA2000::N2km_ListenOnly, 50);
  NMEA2000.Open();

  OutputStream->print("Running...");
  showHelp();

  
}

//*****************************************************************************

void showStatus() {
  Serial.print("Total heap:  ");Serial.println(ESP.getHeapSize());
  Serial.print("Free heap:   ");Serial.println(ESP.getFreeHeap());
  // ESP32-WROOM chips which are common dont have PSRAM. 
  // ESP32-WRover do. See https://en.wikipedia.org/wiki/ESP32
  Serial.print("Has PSRAM:");Serial.println(psramFound());
  Serial.print("Total PSRAM: ");Serial.println(ESP.getPsramSize());
  Serial.print("Free PSRAM:  ");Serial.println(ESP.getFreePsram());

  wifi.printStatus();
}

//*****************************************************************************
//NMEA 2000 message handler - should  be in a class so it can be attached.

//=================================================
// Diagnosis Functions and control

//*****************************************************************************

//*****************************************************************************
void CheckCommand() {
  static bool enableForward = false;
  if (OutputStream->available()) {
    char chr = OutputStream->read();
    switch ( chr ) {
      case 'h': showHelp(); break;
      case 'u': listDevices.list(true); break;
      case 's':
        showStatus();
        break;
      case 'o': 
        n2kPrinter.showData = !n2kPrinter.showData;
        if (  n2kPrinter.showData ) {
          Serial.println("Data Output Enabled");   
        } else {
          Serial.println("Data Output Disabled");   
        }
        break;
      case 'd': 
        enableForward = !enableForward;
        if (  enableForward ) {
          Serial.println("NMEA2000 Packet Output Enabled");   
        } else {
          Serial.println("NMEA2000 Packet Output Disabled");   
        }
        NMEA2000.EnableForward(enableForward); 
        break;
      case 'S':
        lastButtonPress = lastButtonRelease =  millis()-60000;
        break;
      case 'A':
        if ( wifi.isSoftAP() ) {
          wifi.startSTA();
        } else {
          wifi.startAP();
        }
        nmeaSender.setDestination(wifi.getBroadcastIP());
        break;
    }
  }
}






unsigned long start = 0;
const char *timerMessages[5] = {
"NMEA2000.ParseMessages",
"logbook.log",
"CheckCommand",
"EchoServer",
"NmeaServerCheck"
};
int16_t totalCalls = 0;
unsigned long lastPrint = 0;
unsigned long counters[5] = {0,0,0,0,0};
uint16_t calls[5] = {0,0,0,0,0};
void startTimer() {
  start = millis();
}
void endTimer(int i) {
  unsigned long end = millis();
  calls[i]++;
  totalCalls++;
  counters[i] = counters[i]+(end-start);
  if ( end-lastPrint > (+10000) ) {
    lastPrint = end;
    Serial.print(end);
    Serial.print(" times:");
    for(int j = 0; j < 5; j++ ) {
      Serial.print(",");
      if (calls[j] == 0) {
        Serial.print("-");
      } else {
        Serial.print((float)(counters[j]/calls[j]));
      }
      counters[j] = 0;
      calls[j] = 0;
    }
    Serial.print(",");
    Serial.println(totalCalls);
    totalCalls = 0;
  } 
}

//*****************************************************************************
void loop() { 

  startTimer();
  NMEA2000.ParseMessages();
  endTimer(0);
// Only on demand as it causes startup to take time to complete
// listDevices.list();
  startTimer();
  CheckCommand();
  endTimer(2);
  startTimer();

  echoServer.handle();
  endTimer(3);
  startTimer();
  nmeaServer.checkConnections();
  endTimer(4);
}
