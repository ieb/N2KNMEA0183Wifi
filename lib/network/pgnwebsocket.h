#pragma once
// Avoid, this causes crashes.
#include <ESPAsyncWebServer.h>


#define MAX_WS_CLIENTS 8
#define MAX_PGNTRACKING 30
#define MAX_PGNS 20
class PgnWebSocket: public AsyncWebSocket {
public:
    PgnWebSocket(const String &url) : AsyncWebSocket{url} {
        for (int i = 0; i < MAX_WS_CLIENTS; ++i){
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

    tActiveClient clients[MAX_WS_CLIENTS];
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

