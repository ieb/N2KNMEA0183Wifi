#include <ESPmDNS.h>
#include "AsyncTcpServer.h"
#include "esp_log.h"

#define TAG "tcp"

AsyncTcpServer::AsyncTcpServer(Stream *outputStream, uint16_t port) : server(port) {
  this->outputStream = outputStream;
  server.onClient(
    [outputStream](void *s, AsyncClient *c) {
      ESP_LOGI(TAG, "Client Connected");
      if (c == NULL) {
        return;
      }
      AsyncTcpServer *thisServer =  (AsyncTcpServer *)s;
      AsyncTcpClient *tcpC = new AsyncTcpClient(thisServer, c, outputStream);
      if (tcpC == NULL) {
        ESP_LOGE(TAG, "Client Create failed");
        c->close(true);
        c->free();
        delete c;
      }
    },
    this
  );
}

AsyncTcpServer::~AsyncTcpServer() {
  end();
}



void AsyncTcpServer::begin() {

  server.setNoDelay(true);
  server.begin();

  MDNS.addService("_can-tcp","_tcp",port);
  MDNS.addService("_nmea0183-tcp","_tcp",port);

  ESP_LOGE(TAG, "Async TcpServer started");

}



void AsyncTcpServer::end() {
  server.onClient(NULL, NULL);
  for (auto i = clients.begin(); i != clients.end(); ++i) {
     AsyncTcpClient *client = i->get();
     client->close(false);
  }
  clients.clear();
  server.end();
}



void AsyncTcpServer::registerClient(AsyncTcpClient * client) {
  for (auto i = clients.begin(); i != clients.end(); ++i) {
    if (i->get() == client) {
          ESP_LOGE(TAG, "Already added %d", (int) client);
          return;
    }
  }
  ESP_LOGI(TAG, "Adding client %d", (int) client);
  clients.emplace_back(client);
}
void AsyncTcpServer::deRegisterClient(AsyncTcpClient * client) {
  for (auto i = clients.begin(); i != clients.end(); ++i) {
    if (i->get() == client) {
          ESP_LOGI(TAG, "Remove client %d", (int) client);
          clients.erase(i);
    }
  }
}


void AsyncTcpServer::printStatus(Print *stream) {
  stream->println("TCPClients");
  for (auto i = clients.begin(); i != clients.end(); ++i) {
     AsyncTcpClient *client = i->get();
     client->status();
  }
}

bool AsyncTcpServer::acceptN2k(long pgn) {
    for (auto i = clients.begin(); i != clients.end(); ++i) {
     AsyncTcpClient *client = i->get();
     if ( client->acceptN2k(pgn)) {
      return true;
     }
  }
  return false;
}
void AsyncTcpServer::sendN2k(long pgn, const char * buf) {
  for (auto i = clients.begin(); i != clients.end(); ++i) {
     AsyncTcpClient *client = i->get();
     client->sendN2k(pgn,buf);
  }  
}


/**
 * Send the buffer to all clients subject to filtering applied to the connection.
 */ 
void AsyncTcpServer::sendBufToClients(const char *buf) {
  for (auto i = clients.begin(); i != clients.end(); ++i) {
     AsyncTcpClient *client = i->get();
     client->sendBuffer(buf);
  }
}





int16_t nclients = 0;

AsyncTcpClient::AsyncTcpClient(AsyncTcpServer * server, AsyncClient *client, Stream *outputStream) : server(server), client(client) {
  this->outputStream = outputStream;
  nclients++;
  ESP_LOGE(TAG,"NClients %d, new %d", nclients, (int)this);
  createdAt = millis();
  // this is not actually Ack, it is a Tx timeout between send and sent event on the 
  // lower layers and indicates how much data is in the send buffer that has not 
  // been recieved a sent message for some reason. This is an indication that the far end
  // is not recieving, in whch case the tcp connecton should be closed rather than be allowed
  // to fill up the heap. If the client is written correctly it will recover.
  // 12s typically is 30Kb of heap. The 2c typically runs with 130Kb of heap free. That is
  // assuming the lower layer doesnt drop the messages. If it does, no problem as NMEA0183 is 
  // line oriented and will recover.
  client->setAckTimeout(30000);
  client->onError(
    [](void *r, AsyncClient *c, int8_t error) {
      // this may be called with a pointer that has already
      // been deleted.
      ESP_LOGE(TAG,"Client error %d", error);
      AsyncTcpClient *tcpC = (AsyncTcpClient *)r;
      tcpC->close();
    },
    this
  );
  client->onDisconnect(
    [client](void *r, AsyncClient *c) {
      ESP_LOGE(TAG,"Client disconnect %d", (int) r);
      AsyncTcpClient *tcpC = (AsyncTcpClient *)r;
      tcpC->close();
    },
    this
  );
  client->onTimeout(
    [client](void *r, AsyncClient* c, uint32_t time) {
      ESP_LOGE(TAG,"Client Tx Timeout %d", (int) r);
      AsyncTcpClient *tcpC = (AsyncTcpClient *)r;
      tcpC->close();
    },
    this
  );
  client->onData(
    [](void *r, AsyncClient *c, void *buf, size_t len) {
      ESP_LOGI(TAG,"Client data %d", (int) r);
      AsyncTcpClient *tcpC = (AsyncTcpClient *)r;
      // read the line and set any filters.
      tcpC->readInput((char *)buf, len);
    },
    this
  );
  server->registerClient(this);
}

AsyncTcpClient::~AsyncTcpClient() {
  ESP_LOGI(TAG, "destructor %d", (int) this);
  // make sure close has been called.
  this->close();
  unsigned long lifetime = (millis() - createdAt)/1000;
  ESP_LOGE(TAG, "Destroy Client %d lifetime %d s ", (int) this, lifetime );
  nclients--;
}

void AsyncTcpClient::close(bool deregister) {
  if (deregister && server != nullptr ) {
    server->deRegisterClient(this);
    // once the client is deregistered disconnect null the pointer to the server to ensure this does not happen 2x
    server = nullptr;
  }    
  if (client->connected()) {
    ESP_LOGE(TAG, "Close Client %d ",(int) this);
    // zero all callbacks to stop them from being used as the socket is closed.
    client->onError(NULL,NULL);
    client->onDisconnect(NULL,NULL);
    client->onData(NULL,NULL);
    client->onTimeout(NULL,NULL);
    client->close();
  }
}

// task to update the bandwidth calculation every 10s
void AsyncTcpClient::calcMetrics() {
  unsigned long now = millis();
  if ( (now - lastMetrics) > 10000) {
    bandwidthSent = ((double)(bytesSent - lastSent))/(1.024*(now-lastMetrics)); 
    lastSent = bytesSent;
    lastMetrics = now;
  }
}

void AsyncTcpClient::status() {
  if ( mode == WIFICLIENT_MODE_NMEA0183 ) {
    outputStream->print("NMEA0183 -> ");
    outputStream->print(client->remoteIP());
    outputStream->print(" up:");
    outputStream->print((millis() - createdAt)/1000.0);
    outputStream->print("s send:");
    outputStream->print(bandwidthSent);
    outputStream->print("kb/s sentences:");
    outputStream->println(sent);
  } else {
    outputStream->print("SeaSmart -> ");
    outputStream->print(client->remoteIP());
    outputStream->print(" up:");
    outputStream->print((millis() - createdAt)/1000.0);
    outputStream->print("s send:");
    outputStream->print(bandwidthSent);
    outputStream->println("s");
    outputStream->print("kb/s sentences:");
    outputStream->print(sent);
    outputStream->print(" received:");
    outputStream->print(recieved);
    outputStream->print(" badCmds:");
    outputStream->print(badCommands);
    outputStream->print(" errors:");
    outputStream->print(errors);
    outputStream->print(" filter:");
    for(long pgn: pgnFilter ) {
      outputStream->print(" ");
      outputStream->print(pgn);
    }
    outputStream->println("");
  }
}




/**
 * Send a buffer containing 1 complete Sentence.
 */
void AsyncTcpClient::sendBuffer(const char *buf) {
  if (mode == WIFICLIENT_MODE_NMEA0183 ) {
    client->write(buf);
    client->write("\n");
    sent++;   
    bytesSent += strlen(buf) + 1; 
    calcMetrics();
  }
}

void AsyncTcpClient::sendN2k(long pgn, const char *buf) {
  if (mode == WIFICLIENT_MODE_SEASMART && acceptN2k(pgn)) {
    client->write(buf);
    client->write("\n");
    sent++;   
    bytesSent += strlen(buf) + 1; 
    calcMetrics();
  }
}



bool AsyncTcpClient::acceptN2k(long pgn) {
  if ( mode == WIFICLIENT_MODE_SEASMART) {
    for(long pgnF: pgnFilter) {
      if (pgnF == pgn) {
        return true;
      }
    }    
  }
  return false;
}



void AsyncTcpClient::readInput(char *data, size_t len) {
  for (size_t i = 0; i < len; ++i){
    char c = (char)data[i];
      if (c == '\n') {
        parseSentence();
        bpos = 0;
        inputBuffer[bpos] = '\0';
      } else if ( c >= 32 && c <= 126 && bpos < WIFICLIENT_MAX_INPUTBUFFER-2 ) {
        inputBuffer[bpos++] = c;
        inputBuffer[bpos] = '\0';
      } else {
        // ignore control chars and
        // overflow, drop until we start a new line.
      }
    /* code */
  }
}

/**
 * parse and process a sentence after checking the checksum.
 */ 
void AsyncTcpClient::parseSentence() {
  outputStream->print("Sentence recieved as [");
  outputStream->print(inputBuffer);
  outputStream->println("]");
  
  if ( checkChecksum()) {
    recieved++;
    if ( strncmp("$PCDCM,", inputBuffer, 7) == 0 ) {
      if (mode != WIFICLIENT_MODE_SEASMART) {
        mode = WIFICLIENT_MODE_SEASMART;
        outputStream->print("Enabled SeaSmart client at ");
        outputStream->println(client->remoteIP());
      }
      int from = 0;
      long value = 0;
      if ( getNextField(from, value)) {
        if (value == 1) {
          pgnFilter.clear();
          while(getNextField(from, value)) {
            pgnFilter.push_back(value);
          }
        } else {
          badCommands++;
          outputStream->print("Command from ");
          outputStream->print(client->remoteIP());
          outputStream->print(" not recognized :");
          outputStream->println(inputBuffer);            
        }
      }
    } else {
      badCommands++;
      outputStream->print("Sentence from ");
      outputStream->print(client->remoteIP());
      outputStream->print(" not recognized :");
      outputStream->println(inputBuffer);
    }        
  } else {
    errors++;
    outputStream->print("Checksum from ");
    outputStream->print(client->remoteIP());
    outputStream->print(" Bad :");
    outputStream->println(inputBuffer);
  }
}

/**
 * Extract the fields as unsigned longs.
 */
bool AsyncTcpClient::getNextField( int &from, long &value) {
  for(; from < WIFICLIENT_MAX_INPUTBUFFER 
    && inputBuffer[from] != '\0' 
    && inputBuffer[from] != '$'; from++) {
    if ( inputBuffer[from] == ',' ) {
      value = atol(&inputBuffer[from+1]);
      return true;
    }
  }
  return false;
}


/**
 * Verify the checksum true == ok.
 */
bool AsyncTcpClient::checkChecksum() {
  uint8_t checkSum = 0;
  int i = 1;
  for (; 
    i < WIFICLIENT_MAX_INPUTBUFFER 
      && inputBuffer[i] != '*' 
      && inputBuffer[i] != '\0' 
      && inputBuffer[i] != '$'; 
      ++i) {
    checkSum^=inputBuffer[i];
  }
  const char * asHex = "0123456789ABCDEF";

  outputStream->print("Checksum Calculated as ");
  outputStream->println(checkSum, HEX);

  if ( i < (WIFICLIENT_MAX_INPUTBUFFER-3) && inputBuffer[i] == '*' 
    && inputBuffer[i+1] == asHex[(checkSum>>4)&0x0f] 
    && inputBuffer[i+2] == asHex[(checkSum)&0x0f]
    && inputBuffer[i+3] == '\0' ) {
    return true;
  }
  return false;
}


/**
 * Dump the pgn filter list to stdout
 */
void AsyncTcpClient::dumpPgnFilter() {
  outputStream->print("PgnFilter ");
  for( long pgn : pgnFilter) {
    outputStream->print(",");
    outputStream->print(pgn);
  }
  outputStream->println("");
}




