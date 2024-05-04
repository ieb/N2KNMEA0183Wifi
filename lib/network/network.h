#pragma once

#include <WiFi.h>
#include <WiFiUdp.h>
#include <ESPAsyncWebServer.h>
#include <FS.h>
#include "local_secrets.h"

#ifndef WIFI_SSID
#error "WIFI_SSID not defined, add in local_secrets.h file"
#endif
#ifndef WIFI_PASS
#error "WIFI_PASS not defined, add in local_secrets.h file"
#endif




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
    void printStatus();
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
    wifi_power_t maxWifiPower = WIFI_POWER_5dBm;
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


#define MAX_CLIENTS 10
#define MAX_PGNS 20
class TcpServer  {
public: 
    TcpServer(Stream *outputStream, uint16_t _port=10110, size_t maxClients=MAX_CLIENTS ) : 
            outputStream{outputStream}, 
            server{_port, MAX_CLIENTS} {
                port = _port;
            };
    void begin();
    void checkConnections();
    void sendBufToClients(const char *buf);
private:
    Stream *outputStream;
    WiFiServer server;
    WiFiClient wifiClients[MAX_CLIENTS];
    uint8_t nclients = 0;
    uint16_t port = 10110;
};

class UdpSender  {
public: 
    UdpSender(Stream *outputStream, uint16_t port=10110 ) : 
            outputStream{outputStream} {
                udpPort = port;
                destination.fromString("192.168.1.255");
            };
    void begin();
    void setDestination(IPAddress address ) {
        destination = address;
    }
    void sendBufToClients(const char *buf);
private:
    Stream *outputStream;
    WiFiUDP udp;
    uint16_t udpPort = 10110;
    IPAddress destination;
    bool started = false;
    uint16_t restarts = 0;
    uint16_t disconnects = 0;
};



#define MAX_PGNTRACKING 30

class PgnWebSocket: public AsyncWebSocket {
public:
    PgnWebSocket(const String &url) : AsyncWebSocket{url} {
        for (int i = 0; i < MAX_CLIENTS; ++i){
            clients[i].used = false;
            clients[i].all = false;
            clients[i].client = NULL;
            for (int j = 0; j < MAX_PGNS; ++j) {
                clients[i].pgns[j] = 0;
            }
        }
    };
    void begin();
    void send(const char * msg);
    bool shouldSend(unsigned long pgn);

    void handleWSEvent(AsyncWebSocket * server, 
        AsyncWebSocketClient * client, 
        AwsEventType type, 
        void * arg, 
        uint8_t *data, 
        size_t len);

private:

    typedef struct tActiveClients {
        bool used;
        bool all;
        AsyncWebSocketClient * client;
        unsigned long pgns[MAX_PGNS];
    } tActiveClient;
    typedef struct pgnrecord {
        unsigned long pgn;
        unsigned long at;
    } tPgnRecord;

    tActiveClient clients[MAX_CLIENTS];
    tPgnRecord pgnsent[MAX_PGNTRACKING];
    uint8_t npgns_sent;
    uint16_t ndrop = 0, nbounce = 0, nsend = 0;


    bool processCommandMessage(AsyncWebSocketClient * client, 
            uint8_t *data, size_t len, AwsFrameInfo *info);
    bool removeClient(AsyncWebSocketClient * client);
    bool addClient(AsyncWebSocketClient * client);
    bool sendDebounced(unsigned long pgn);
    void record(unsigned long pgn);

};


class WebServer {
    public:
        WebServer(Stream *outputStream ) : outputStream{outputStream} {};
        void begin(const char * configurationFile = "/config.txt");
        String getBasicAuth() { return basicAuth; };
        void sendN0183(const char *buffer);
        void sendN2K(const char *buffer);
        bool shouldSend(unsigned long pgn) {
            return n2kWS.shouldSend(pgn);
        }
        typedef std::function<void(Print *stream)> FnResponseOutputHandler;

        void setStoreCallback(FnResponseOutputHandler h) {
            storeOutputFn = h;
        }
        void setDeviceListCallback(FnResponseOutputHandler h) {
            listDeviceOutputFn = h;
        }


    private:  
        Stream *outputStream;
        AsyncWebServer server = AsyncWebServer(80);
        AsyncWebSocket n0183WS = AsyncWebSocket("/ws/183"); 
        PgnWebSocket n2kWSraw = PgnWebSocket("/ws/candump3");  // supports filtering of messages.
        PgnWebSocket n2kWS = PgnWebSocket("/ws/seasmart");  // supports filtering of messages.
        String httpauth;
        String basicAuth;

        FnResponseOutputHandler storeOutputFn = NULL;
        FnResponseOutputHandler listDeviceOutputFn = NULL;
        String handleTemplate(AsyncWebServerRequest * request, const String &var);
        void handleAllFileUploads(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
        bool authorized(AsyncWebServerRequest *request);
        void addCORS(AsyncWebServerRequest *request, AsyncWebServerResponse * response );


};




