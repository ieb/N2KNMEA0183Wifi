#pragma once
#include <WiFi.h>



#define WIFICLIENT_MODE_DISCONNECTED 0
#define WIFICLIENT_MODE_NMEA0183 1
#define WIFICLIENT_MODE_SEASMART 2
#define WIFICLIENT_MAX_INPUTBUFFER 80
#define WIFICLIENT_PGN_FILTERSIZE 20
class TcpClient {
    public: 
        TcpClient() {};
        void init(Stream *outputStream)  {
            this->outputStream = outputStream;
        }
        void accept(WiFiServer * wifiServer);
        void status();
        bool checkIsFree();
        void sendBuffer(const char * buf);
        void processMessage();
        bool acceptN2k(long pgn);
        void sendN2k(long pgn, const char * buf);
    private:
        Stream *outputStream;
        WiFiClient wifiClient;
        uint8_t mode = WIFICLIENT_MODE_DISCONNECTED;
        char inputBuffer[WIFICLIENT_MAX_INPUTBUFFER];
        int bpos;
        long pgnFilter[WIFICLIENT_PGN_FILTERSIZE];
        uint16_t sent;
        uint16_t recieved;
        uint16_t badCommands;
        uint16_t errors;
        double bandwidthSent = 0.0;
        uint16_t bytesSent = 0;
        unsigned long lastMetrics = 0;
        IPAddress remoteIP;
        void parseSentence(const char * input );
        int extractFields(const char *input, unsigned long *fields, int maxFields);
        bool checkChecksum(const char *input);
        void updatePgnFilter(unsigned long *pgns, int npgns);
        void dumpPgnFilter();
};


#define MAX_TCP_CLIENTS 8 // 10*170 = 1700 bytes about
class TcpServer  {
public: 
    TcpServer(Stream *outputStream, uint16_t _port=10110) : 
            outputStream{outputStream}, 
            server{_port, MAX_TCP_CLIENTS} {
                port = _port;
                for (int i = 0; i < MAX_TCP_CLIENTS; i++) {
                    tcpClients[i].init(outputStream);
                }
            };
    void begin();
    void handle();
    void printStatus(Print *stream);
    void sendBufToClients(const char *buf);
    bool acceptN2k(long pgn);
    void sendN2k(long pgn, const char * buf);
private:

    Stream *outputStream;
    WiFiServer server;
    TcpClient tcpClients[MAX_TCP_CLIENTS];
    uint16_t port = 10110;


};

