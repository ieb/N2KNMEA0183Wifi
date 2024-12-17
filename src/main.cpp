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

#include "esp_log.h"

#define TAG "main"


// Pins   
#ifdef GPIO_NUM_22
// ESP32
#define ESP32_CAN_RX_PIN GPIO_NUM_22
#define ESP32_CAN_TX_PIN GPIO_NUM_23
#else
// ESP32-C3
#define ESP32_CAN_RX_PIN GPIO_NUM_8
#define ESP32_CAN_TX_PIN GPIO_NUM_10
#define BMS_RX_PIN GPIO_NUM_4
#define BMS_TX_PIN GPIO_NUM_2
#endif
#define MAX_NMEA2000_MESSAGE_SEASMART_SIZE 1024

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
#include "N2KFrameFilter.h"
#include "NMEA0183N2KMessages.h"
#include "network.h"
#include "logbook.h"
#include "Seasmart.h"
#include <ESPmDNS.h>
#include "jdb_bms.h"


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
TcpServer nmeaServer(OutputStream, 10110);

#ifdef NMEA0183_UDP
UdpSender nmeaSender(OutputStream, 10110);
#endif

NMEA0183N2KMessages messageEncoder;
Performance performance(&messageEncoder);
N2KHandler n2kHander(messageEncoder, performance, logbook);
N2KFrameFilter frameFilter;


JBDBmsSimulator simulator;
JdbBMS bms;
bool bmsSimulatorOn = false;







const unsigned long TransmitMessages[] PROGMEM={
        127506L, //DCStatus(N2kMsg)
        127508L, //DCBatteryStatus(N2kMsg)
        127513L, //BatteryConfigurationStatus(N2kMsg)
0};
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






#ifdef ENABLE_WEBSOCKETS
// The ESPAsyncWebServer websocket implementation tends to corrupt the heap
// so not using any more.
void sendViaWebSockets(const tN2kMsg &N2kMsg) {
    static char wsBuffer[MAX_NMEA2000_MESSAGE_SEASMART_SIZE];
    static unsigned long flushTTL = millis();
    static size_t wsOffset = 0;



    // flush the ws buffer if required.
    unsigned long now = millis();
    if ( (now - flushTTL) > 200) {
      flushTTL = now;
      if ( wsOffset > 0) {
        webServer.sendN2K((const char *)&wsBuffer[0]); 
        wsOffset = 0;               
      }
    }

    // check if any websocket client has requested this PGN
    if ( !frameFilter.isFiltered(N2kMsg.PGN, N2kMsg.Source ) && webServer.shouldSend(N2kMsg.PGN) ) {
      // todo, use real time based on GPS time.
      // buffer the messages up to reduce websocket overhead.
      size_t maxLen = MAX_NMEA2000_MESSAGE_SEASMART_SIZE-wsOffset-1;
      if ( maxLen < 50) {
        // reset the buffer
        webServer.sendN2K((const char *)&wsBuffer[0]); 
        flushTTL = now;
        wsOffset = 0;       
      } else if ( wsOffset > 0) {
        // replace the terminator with a \n
        // and to be safe add a terminator
        wsBuffer[wsOffset++] = '\n';
        wsBuffer[wsOffset] = 0;
      }
      size_t len = N2kToSeasmart(N2kMsg,millis(),&wsBuffer[wsOffset],maxLen);
      wsOffset += len;
    }
}
#else
void sendViaWebSockets(const tN2kMsg &N2kMsg) {
}
#endif



void HandleNMEA2000Msg(const tN2kMsg &N2kMsg) {
    static char seaSmartBuffer[MAX_NMEA2000_MESSAGE_SEASMART_SIZE];
    listDevices.HandleMsg(N2kMsg);
    n2kPrinter.HandleMsg(N2kMsg);
    n2kHander.handle(N2kMsg);

    bool seaSmartLoaded = false;
    if ( nmeaServer.acceptN2k(N2kMsg.PGN) ) {
      N2kToSeasmart(N2kMsg,millis(),&seaSmartBuffer[0],MAX_NMEA2000_MESSAGE_SEASMART_SIZE);
      seaSmartLoaded = true;
      nmeaServer.sendN2k(N2kMsg.PGN, (const char *) &seaSmartBuffer[0]);
    }
    if ( webServer.acceptSeaSmart(N2kMsg.PGN) ) {
      if ( !seaSmartLoaded ) {
        N2kToSeasmart(N2kMsg,millis(),&seaSmartBuffer[0],MAX_NMEA2000_MESSAGE_SEASMART_SIZE);
      }
      webServer.sendSeaSmart(N2kMsg.PGN, (const char *) &seaSmartBuffer[0]);
    }

    sendViaWebSockets(N2kMsg);
}

void showHelp() {
  OutputStream->println("N2KWifi Bridge.");
  OutputStream->println("  - Send 'h' to show this message");
  OutputStream->println("  - Send 's' to show status");
  OutputStream->println("  - Send 'u' to print latest list of devices");
  OutputStream->println("  - Send 'o' to toggle output, can be high volume");
  OutputStream->println("  - Send 'd' to toggle packet dump, can be high volume");
  OutputStream->println("  - Send 'b' to toggle bms debug, can be high volume");
  OutputStream->println("  - Send 'S' to toggle BMS simulator");
  OutputStream->println("  - Send 'A' to toggle Wifi AP");
  OutputStream->println("  - Send 'R' to restart");
}


void SendNMEA0183Message(const char * buf) {
  nmeaServer.sendBufToClients(buf); // TCP
#ifdef NMEA0183_UDP
nmeaSender.sendBufToClients(buf); // UDP
#endif
  webServer.sendN0183(buf); // websocket
}



void setup() {
  Serial.begin(115200); 
  if ( !psramInit() ) {

    ESP_LOGE(TAG, "PSRAM not available.");
  } else {
    ESP_LOGI(TAG, "Total PSRAM: %d", ESP.getPsramSize());
    ESP_LOGI(TAG, "Free PSRAM:  %d", ESP.getFreePsram());
  }
  ESP_LOGI(TAG, "Starting Wifi");
  // Start the wifi
  wifi.begin();

  // start MDNS  so others can register.
  ESP_LOGI(TAG, "Starting MDNS");
  MDNS.begin("boatsystems");

  ESP_LOGE(TAG, "Starting TCP Servers");
  echoServer.begin();
  nmeaServer.begin();
#ifdef NMEA0183_UDP
  nmeaSender.begin();
  nmeaSender.setDestination(wifi.getBroadcastIP());
#endif

  ESP_LOGI(TAG, "Starting Http Server");
  webServer.setStoreCallback([](Print *stream) {
    n2kHander.output(stream); // H,...
    performance.output(stream); // P,...
  });

  webServer.setDeviceListCallback([](Print *stream) {
    listDevices.output(stream);
  });

  webServer.begin();

  frameFilter.begin();

  ESP_LOGI(TAG, "Starting Nmea20000 Stack");
  // Set Product information
  NMEA2000.SetProductInformation("00000003", // Manufacturer's Model SerialIO code
                                 100, // Manufacturer's product code
                                 "N2k Wifi bridge",  // Manufacturer's Model ID
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


  ESP_LOGI(TAG, "Starting BMS Stack");
  Serial1.begin(9600,SERIAL_8N1, BMS_RX_PIN, BMS_TX_PIN);
  bms.setSerial(&Serial1);
  bms.begin();


  ESP_LOGI(TAG, "Running.....");
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
  nmeaServer.printStatus();
  webServer.printStatus();
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
          ESP_LOGI(TAG, "Data Output Enabled");   
        } else {
          ESP_LOGI(TAG, "Data Output Disabled");   
        }
        break;
      case 'R':
        esp_restart();
        break;
      case 'b':
        bms.toggleDebug();
        break; 
      case 'd': 
        enableForward = !enableForward;
        if (  enableForward ) {
          ESP_LOGI(TAG, "NMEA2000 Packet Output Enabled");   
        } else {
          ESP_LOGI(TAG, "NMEA2000 Packet Output Disabled");   
        }
        NMEA2000.EnableForward(enableForward); 
        break;
      case 'S':
        if ( bmsSimulatorOn) {
          ESP_LOGI(TAG, "Disable BMS Simulator");   
          bmsSimulatorOn = false;
          bms.setSerial(&Serial1);
        } else {
          ESP_LOGI(TAG, "Enable BMS Simulator");   
          bmsSimulatorOn = true;
          bms.setSerial(&simulator);
        }
        break;
      case 'A':
        if ( wifi.isSoftAP() ) {
          wifi.startSTA();
        } else {
          wifi.startAP();
        }
#ifdef NMEA0183_UDP
        nmeaSender.setDestination(wifi.getBroadcastIP());
#endif
        break;
    }
  }
}

/**
 * Emit messages from sensors connected to the ESP. 
 * Don't send proprietary messages to the bus.
 */ 
void EmitMessages() {
    tN2kMsg N2kMsg;
    if ( bms.setN2KMsg(N2kMsg) )  {
        HandleNMEA2000Msg(N2kMsg);
    }
    if (!NMEA2000.IsProprietaryMessage(N2kMsg.PGN) ) {
      NMEA2000.SendMsg(N2kMsg);
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
  static unsigned long lastHB = millis();
  NMEA2000.ParseMessages();
  nmeaServer.handle();
  CheckCommand();
  echoServer.handle();
  bms.update();
  EmitMessages();


  unsigned long now = millis();
  if ( (now - lastHB) > 5000) {
        lastHB = now;
        ESP_LOGD(TAG, "Loop");
    }

}
