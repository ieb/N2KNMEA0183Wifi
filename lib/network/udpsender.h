#pragma once
#include <AsyncUDP.h>


class UdpSender  {
public: 
    UdpSender(Stream *outputStream ) : outputStream{outputStream} {};
    void begin();
    void setPort(int port);
    void sendBufToClients(const char *buf);
private:
    Stream *outputStream;
    AsyncUDP udp;
    uint16_t udpPort = 10110;
    bool started = false;
    uint16_t restarts = 0;
    uint16_t disconnects = 0;

};
