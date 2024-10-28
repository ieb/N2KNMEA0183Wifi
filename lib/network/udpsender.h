#pragma once
#include <WiFiUdp.h>


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
