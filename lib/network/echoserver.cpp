#include "echoserver.h"
#include "esp_log.h"

#define TAG "echo"


EchoServer::EchoServer() : server(7) {
  server.onClient(
    [](void *, AsyncClient *client) {
      if (client == NULL) {
        return;
      }
      client->setRxTimeout(3);
      client->onData(
        [](void *, AsyncClient *client, void *buf, size_t len) {
            char *data = (char *)buf;
            for(size_t i = 0; i < len; i++) {
                client->add(&data[i], 1);
                if ( data[i] == '\n') {
                    client->send();
                    client->close();
                }
            }
        }, 
        client);
    },
    this
  );
}

EchoServer::~EchoServer() {
    server.end();
}

void EchoServer::begin() {
  server.setNoDelay(true);
  server.begin();
  ESP_LOGE(TAG, "Echo Server started");
}



/*
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
*/



    

