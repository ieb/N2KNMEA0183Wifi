#include "network.h"



void EchoServer::begin() {
    server.begin(7);
}


void EchoServer::handle() {
    if (!clientConnected) {
        client = server.accept();
        if (!client) {
            return;
        }
        outputStream->println("Echo Client Connected");
        clientConnected = true;
        request = "";
    }
    if (!client.connected()) {
        outputStream->println("Echo Client disconnect");
        clientConnected = false;
        request = "";
        return;
    }
    while ( client.available() ) {
        char c = client.read();
        if (c == '\n'){
            client.println(request);
            delay(1);
            client.stop();
            clientConnected = false;
            outputStream->print("Echo Client done [");
            outputStream->print(request);
            outputStream->println("]");
            request="";
        } else {
            request += c;
        }
    }
}




    

