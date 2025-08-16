#include "udpsender.h"
#include <ESPmDNS.h>



void UdpSender::begin() {
  if (started) {
    started = true;
    MDNS.addService("_nmea0183-udp","_udp",udpPort);
  }

}

void UdpSender::setPort(int port) {
    udpPort = port;
}
// This works, but unfortunately not on ChromeOS which
// blocks all inbound broadcast UDP traffic at its firewall
// on a per container level, so its useless.
// Works perfectly on a Android device.
void UdpSender::sendBufToClients(const char *buf) {

    udp.broadcastTo(buf, udpPort);
}
