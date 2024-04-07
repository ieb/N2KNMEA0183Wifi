#include "network.h"



void UdpSender::begin() {
    udp.begin(udpPort);
}
void UdpSender::sendBufToClients(const char *buf) {
    udp.beginPacket(destination,udpPort);
    udp.print(buf);
    udp.endPacket();
}
