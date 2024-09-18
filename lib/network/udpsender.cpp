#include "network.h"
#include <ESPmDNS.h>



void UdpSender::begin() {
    udp.begin(udpPort);
    started = true;
    MDNS.addService("_nmea0183-udp","_udp",udpPort);

}
void UdpSender::sendBufToClients(const char *buf) {
    if ( WiFi.status() == WL_CONNECTED ) {
        if ( !started ) {
            begin();
        }
        udp.beginPacket(destination,udpPort);
        udp.print(buf);
        if (udp.endPacket() == 0) {
            restarts++;
            if ( restarts%20 == 1) {
                Serial.printf("UDP restarts:%d disconnects:%d \n", restarts, disconnects);
            }
            begin();
        }        
    } else {
        if ( started ) {
            disconnects++;
        }
        started = false;
    }
}
