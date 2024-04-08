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



class JsonOutput {
    public:
        JsonOutput() {};
        virtual void outputJson(AsyncResponseStream* outputStream) {};
        void append(const char *key, const char *value);
        void append(const char *value);
        void append(int value);
        void append(double value);
        void append(unsigned long value);
        void appendCommaIfRequired();
        void append(const char *key, int value);
        void append(const char *key, double value, int precision=2);
        void append(const char *key, unsigned int value);
        void append(const char *key, unsigned long value);
        void startObject();
        void startObject(const char *key);
        void endObject();
        void startArray(const char *key);
        void endArray();
        void startJson(AsyncResponseStream *outputStream);
        void endJson();
    protected:
        bool levels[10];
        int level = 0;
        AsyncResponseStream *outputStream;

};

class CsvOutput {
    public:
        CsvOutput() {};
        virtual void outputCsv(AsyncResponseStream *outputStream) {};
        void startBlock(AsyncResponseStream *outputStream);
        void endBlock();
        void startRecord(const char *);
        void endRecord();
        void appendField(const char *value);
        void appendField(int value);
        void appendField(double value, int precision = 2);
        void appendField(unsigned long value);
        void appendField(uint32_t value);
    protected:
        AsyncResponseStream *outputStream;
};

#define MAX_DATASETS 14

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
    bool softAP;
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
};


typedef struct tActiveClients {
    bool used;
    bool all;
    AsyncWebSocketClient * client;
    unsigned long pgns[MAX_PGNS];
} tActiveClients;


class PgnWebSocket: public AsyncWebSocket {
public:
    PgnWebSocket(const String &url) : AsyncWebSocket{url} {};
    void begin();
    void send(unsigned long pgn, const char * msg);
    bool shouldSend(unsigned long pgn);

    void handleWSEvent(AsyncWebSocket * server, 
        AsyncWebSocketClient * client, 
        AwsEventType type, 
        void * arg, 
        uint8_t *data, 
        size_t len);

private:
    tActiveClients clients[MAX_CLIENTS];

    bool processCommandMessage(AsyncWebSocketClient * client, 
            uint8_t *data, size_t len, AwsFrameInfo *info);
    bool removeClient(AsyncWebSocketClient * client);
    bool addClient(AsyncWebSocketClient * client);

};


class WebServer {
    public:
        WebServer(Stream *outputStream) : outputStream{outputStream} {};
        void begin(const char * configurationFile = "/config.txt");
        void addJsonOutputHandler(int id, JsonOutput *handler) {
            if ( id >= 0 && id < MAX_DATASETS ) {
                jsonHandlers[id] = handler;
            }
        };
        void addCsvOutputHandler(int id, CsvOutput *handler) {
            if ( id >= 0 && id < MAX_DATASETS ) {
                csvHandlers[id] = handler;
            }
        };
        String getBasicAuth() { return basicAuth; };
        void sendN0183(const char *buffer);
        void sendN2K(unsigned long pgn, const char *buffer);
        bool shouldSend(unsigned long pgn) {
            return n2kWS.shouldSend(pgn);
        }

    private:  
        Stream *outputStream;
        AsyncWebServer server = AsyncWebServer(80);
        AsyncWebSocket n0183WS = AsyncWebSocket("/ws/183"); 
        PgnWebSocket n2kWSraw = PgnWebSocket("/ws/2kraw");  // supports filtering of messages.
        PgnWebSocket n2kWS = PgnWebSocket("/ws/2kparsed");  // supports filtering of messages.
        JsonOutput *jsonHandlers[MAX_DATASETS]={ NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL };
        CsvOutput *csvHandlers[MAX_DATASETS]={ NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL };
        String httpauth;
        String basicAuth;

        String handleTemplate(AsyncWebServerRequest * request, const String &var);
        void handleAllFileUploads(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final);
        bool authorized(AsyncWebServerRequest *request);

};




