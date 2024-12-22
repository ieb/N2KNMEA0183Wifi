#pragma once

#include <WiFi.h>
#include <WiFiUdp.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include "local_secrets.h"

#include "tcpserver.h"
#include "udpsender.h"
#include "httpstream.h"
#ifdef ENABLE_WEBSOCKETS
#include "pgnwebsocket.h"
#endif

#ifndef WIFI_SSID
#error "WIFI_SSID not defined, add in local_secrets.h file"
#endif
#ifndef WIFI_PASS
#error "WIFI_PASS not defined, add in local_secrets.h file"
#endif


// the EspAsyncWebServer web socket implementation has a tenancy to crash the
// ESP32 even wit no websocket connected due to the implementation of the send buffer.
// Multiple git reports, no fix as yet. Enable if you want, but expect the ESP32 to crash 
// and reboot. The preferred approach is to use a streaming get with chunked encoding.
// #define ENABLE_WEBSOCKETS


class Wifi {
public:
    Wifi(Stream *outputStream, const char * _configurationFile = "/config.txt") : 
        outputStream{outputStream} {
            configurationFile = _configurationFile;
    };
    void begin();
    String getSSID() { return ssid; };
    String getPassword() { return password; };
    void startSTA(String wifi_ssid = WIFI_SSID, String wifi_pass = WIFI_PASS);
    void startAP();
    void printStatus(Print *stream);
    bool isSoftAP() {
        return softAP;
    };
    IPAddress getBroadcastIP();

private:    
    Stream *outputStream;
    const char *configurationFile;
    String ssid;
    String password;
    bool softAP = false;
    wifi_power_t maxWifiPower = WIFI_POWER_11dBm;
    void loadIPConfig(String key);
    void loadWifiPower(String key);

};


class EchoServer  {
public: 
    EchoServer(Stream *outputStream) : outputStream{outputStream} {};
    void begin();
    void handle();
private:
    WiFiServer server;
    Stream *outputStream;
    bool clientConnected = false;
    WiFiClient client; 
    String request;
};


class WebServer {
    public:
        WebServer(Stream *outputStream ) : outputStream{outputStream} {};
        void begin(const char * configurationFile = "/config.txt");
        void printStatus(Print *);
        String getBasicAuth() { return basicAuth; };
        void sendN0183(const char *buffer);

#ifdef ENABLE_WEBSOCKETS
        void sendN2K(const char *buffer);
        bool shouldSend(unsigned long pgn) {
            return n2kWS.shouldSend(pgn);
        }
#endif
        bool acceptSeaSmart(unsigned long pgn);
        void sendSeaSmart(unsigned long pgn, const char *buffer);

        typedef std::function<void(Print *stream)> FnResponseOutputHandler;

        void setStoreCallback(FnResponseOutputHandler h) {
            storeOutputFn = h;
        }
        void setDeviceListCallback(FnResponseOutputHandler h) {
            listDeviceOutputFn = h;
        }
        void setStatusCallback(FnResponseOutputHandler h) {
            statusOutputFn = h;
        }


    private:  
        Stream *outputStream;
        AsyncWebServer server = AsyncWebServer(80);
#ifdef ENABLE_WEBSOCKETS
        AsyncWebSocket n0183WS = AsyncWebSocket("/ws/183"); 
        PgnWebSocket n2kWSraw = PgnWebSocket("/ws/candump3");  // supports filtering of messages.
        PgnWebSocket n2kWS = PgnWebSocket("/ws/seasmart");  // supports filtering of messages.
#endif
        String httpauth;
        String basicAuth;

        BroadcastBuffer nmea0183OutputBuffer;
        // holds the head of a linked list of seasmartStreams.
        SeasmartResponseStream * seasmartStreamsHead = NULL;

        FnResponseOutputHandler storeOutputFn = NULL;
        FnResponseOutputHandler listDeviceOutputFn = NULL;
        FnResponseOutputHandler statusOutputFn = NULL;
        String handleTemplate(AsyncWebServerRequest * request, const String &var);
        void handleAllFileUploads(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
        bool authorized(AsyncWebServerRequest *request);
        void addCORS(AsyncWebServerRequest *request, AsyncWebServerResponse * response );
        void addSeasmartResponse(SeasmartResponseStream * response);
        void removeSeasmartResponse(SeasmartResponseStream * response);


};




