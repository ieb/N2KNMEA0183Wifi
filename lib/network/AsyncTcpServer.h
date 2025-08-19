#pragma once
#include "Arduino.h"


#include <WiFi.h>
#include <AsyncTCP.h>
#include <vector>
#include <list>




#define WIFICLIENT_MODE_NMEA0183 1
#define WIFICLIENT_MODE_SEASMART 2
#define WIFICLIENT_MAX_INPUTBUFFER 80
#define WIFICLIENT_PGN_FILTERSIZE 20

class AsyncTcpClient;


class AsyncTcpServer {
public:
    AsyncTcpServer(Stream *outputStream, uint16_t _port=10110);
    ~AsyncTcpServer();
    void begin();
    void end();
    void printStatus(Print *stream);
    void sendBufToClients(const char *buf);
    bool acceptN2k(long pgn);
    void sendN2k(long pgn, const char * buf);
    void registerClient(AsyncTcpClient * client);
    void deRegisterClient(AsyncTcpClient * client);

private:
    Stream *outputStream;
    AsyncServer server;
    uint16_t port = 10110;
    std::list<std::unique_ptr<AsyncTcpClient>> clients;
};

class AsyncTcpClient {
    public: 
        AsyncTcpClient(AsyncTcpServer *server, AsyncClient *client, Stream *outputStream);
        ~AsyncTcpClient();
        void status();
        void sendBuffer(const char * buf);
        bool acceptN2k(long pgn);
        void sendN2k(long pgn, const char * buf);
        void close(bool deregister=true);
        void calcMetrics();
    private:
        AsyncTcpServer *server;
        AsyncClient *client;
        Stream *outputStream;
        uint8_t mode = WIFICLIENT_MODE_NMEA0183;
        char inputBuffer[WIFICLIENT_MAX_INPUTBUFFER];
        int bpos = 0;
        std::vector<long> pgnFilter;
        uint16_t sent = 0;
        uint16_t recieved = 0;
        uint16_t badCommands = 0;
        uint16_t errors = 0;
        uint16_t lastSent = 0;
        unsigned long lastMetrics = 0;
        unsigned long createdAt = 0;
        double bandwidthSent = 0.0;
        uint16_t bytesSent = 0;

        void readInput(char *data, size_t len);
        void parseSentence();
        bool getNextField(int &from, long &value);
        bool checkChecksum();
        void dumpPgnFilter();

};



