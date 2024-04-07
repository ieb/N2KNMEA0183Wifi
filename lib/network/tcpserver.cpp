#include "network.h"



void TcpServer::begin() {
    port = port;
    server.begin(port);
    for (int i = 0; i < nclients; i++) {
        wifiClients[i] = WiFiClient();
    }
}


void TcpServer::checkConnections() {

   if (nclients < MAX_CLIENTS) {

    for (int i = 0; i < MAX_CLIENTS; i++) {
        if ( !wifiClients[i] ) {
            WiFiClient client  = server.accept();   // listen for incoming clients
            if ( client ) {
               wifiClients[i] = client;
               outputStream->print("Client Connected on ");
               outputStream->println(port);
              nclients++;
            }
            break;
        }
    }
  }

 
  for (int i = 0; i < nclients; i++) {
    if ( wifiClients[i] ) {
      if ( !wifiClients[i].connected() ) {
        wifiClients[i].stop();
        wifiClients[i] = WiFiClient();
        nclients--;
        outputStream->print("Client Disconnected on ");
        outputStream->println(port);
      } else {
        if ( wifiClients[i].available() ) {
          char c = wifiClients[i].read();
          if ( c==0x03 ) {
            outputStream->print("Client Disconnected ^C on ");
            outputStream->println(port);
            wifiClients[i].stop();
            wifiClients[i] = WiFiClient();
            nclients--;
          }
        }
      } 
    }
  }
}


void TcpServer::sendBufToClients(const char *buf) {
  for (int i = 0; i < nclients; i++) {
  if ( wifiClients[i] ) {
      if (wifiClients[i].connected() ) {
        wifiClients[i].println(buf);
      } else {
        wifiClients[i].stop();
        wifiClients[i] = WiFiClient();
        nclients--;
        outputStream->print("Client Disconnected on ");
        outputStream->println(port);
      }
    }
  }
}

    

