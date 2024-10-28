#include "tcpserver.h"
#include <ESPmDNS.h>



void TcpServer::begin() {
    port = port;
    server.begin(port);

    MDNS.addService("_can-tcp","_tcp",port);
    MDNS.addService("_nmea0183-tcp","_tcp",port);

    Serial.println("TcpServer started");

}

/**
 * Check all client connections to see if there are any connections pending.
 */
void TcpServer::handle() {
  for(int i = 0; i < MAX_TCP_CLIENTS; i++) {
    if ( tcpClients[i].checkIsFree() ) {
      tcpClients[i].accept(&server);
    } else {
      tcpClients[i].processMessage();
    }
  }
}




void TcpServer::printStatus() {
  outputStream->println("TCPClients");
  for(int i = 0; i < MAX_TCP_CLIENTS; i++) {
    tcpClients[i].status();
  }
}

bool TcpServer::acceptN2k(long pgn) {
  for(int i = 0; i < MAX_TCP_CLIENTS; i++) {
    if ( tcpClients[i].acceptN2k(pgn) ) {
      return true;
    }
  }
  return false;
}
void TcpServer::sendN2k(long pgn, const char * buf) {
  for(int i = 0; i < MAX_TCP_CLIENTS; i++) {
    tcpClients[i].sendN2k(pgn, buf);
  }
}


/**
 * Send the buffer to all clients subject to filtering applied to the connection.
 */ 
void TcpServer::sendBufToClients(const char *buf) {
  for (int i = 0; i < MAX_TCP_CLIENTS; i++) {
    tcpClients[i].sendBuffer(buf);
  }
}


void TcpClient::status() {
  if ( mode == WIFICLIENT_MODE_DISCONNECTED) {
    outputStream->println("Free Slot");
  } else if ( mode == WIFICLIENT_MODE_NMEA0183 ) {
    outputStream->print("NMEA0183 -> ");
    outputStream->print(remoteIP);
    outputStream->print(" send:");
    outputStream->print(bandwidthSent);
    outputStream->print("kb/s sentences:");
    outputStream->println(sent);
  } else {
    outputStream->print("SeaSmart -> ");
    outputStream->print(remoteIP);
    outputStream->print(" send:");
    outputStream->print(bandwidthSent);
    outputStream->print("kb/s sentences:");
    outputStream->print(sent);
    outputStream->print(" received:");
    outputStream->print(recieved);
    outputStream->print(" badCmds:");
    outputStream->print(badCommands);
    outputStream->print(" errors:");
    outputStream->print(errors);
    outputStream->print(" filter:");
    for(int i = 0; i < WIFICLIENT_PGN_FILTERSIZE && pgnFilter[i] != -1; i++ ) {
      outputStream->print(" ");
      outputStream->print(pgnFilter[i]);
    }
    outputStream->println("");
  }
}


/**
 * Check for waiting client connections, accept one at a time.
 */ 
void TcpClient::accept(WiFiServer *server) {
  WiFiClient client  = server->accept();   // listen for incoming clients
  if (client) {
    wifiClient = client;
    remoteIP = wifiClient.remoteIP();
    outputStream->print("Client Connected on tcp from:");
    outputStream->println(remoteIP);
    mode = WIFICLIENT_MODE_NMEA0183; 
    sent = 0;
    recieved = 0;
    badCommands = 0;
    errors = 0;
    // reset the buffer.
    bpos = 0;
    inputBuffer[bpos] = '\0';

  }
}




/**
 * Send a buffer containing 1 complete Sentence.
 */
void TcpClient::sendBuffer(const char *buf) {
  if (checkIsFree()) {
    return;
  }
  if (mode == WIFICLIENT_MODE_NMEA0183 ) {
    wifiClient.println(buf);
    sent++;   
    bytesSent += strlen(buf) + 1; 
  }
}

void TcpClient::sendN2k(long pgn, const char *buf) {
  if (checkIsFree()) {
    return;
  }
  if (mode == WIFICLIENT_MODE_SEASMART && acceptN2k(pgn)) {
    wifiClient.println(buf);
    sent++;
    bytesSent += strlen(buf) + 1; 
  }
}


bool TcpClient::acceptN2k(long pgn) {
  if ( mode == WIFICLIENT_MODE_SEASMART) {
    for(int i = 0; i < WIFICLIENT_PGN_FILTERSIZE && pgnFilter[i] != -1; i++ ) {
      if (pgnFilter[i] == pgn) {
        return true;
      }
    }    
  }
  return false;
}



/**
 * check the client and return if its free to be used.
 * Calling this will also close any clients that have disconnected.
 */ 
bool TcpClient::checkIsFree() {
  if (mode == WIFICLIENT_MODE_DISCONNECTED) {
    return true;
  }
  if ( !wifiClient.connected()) {
    outputStream->print("Client Disconnected: ");
    outputStream->println(remoteIP);
    wifiClient.stop();
    wifiClient = WiFiClient();
    mode = WIFICLIENT_MODE_DISCONNECTED;
    return true;
  }
  return false;
}

/**
 * process any pending messages.
 * Will loop until no more chars are available.
 */
void TcpClient::processMessage() {
  if ( !checkIsFree() ) {
    while ( wifiClient.available() ) {
      char c = wifiClient.read();
      if (c == '\n') {
        parseSentence(inputBuffer);
        bpos = 0;
        inputBuffer[bpos] = '\0';
      } else if ( c >= 32 && c <= 126 && bpos < WIFICLIENT_MAX_INPUTBUFFER-2 ) {
        inputBuffer[bpos++] = c;
        inputBuffer[bpos] = '\0';
      } else {
        // ignore control chars and
        // overflow, drop until we start a new line.
      }
    }
    unsigned long now = millis();
    if ( (now - lastMetrics) > 30000) {
      bandwidthSent = bytesSent/(1024.0*(0.001*(now - lastMetrics)));
      bytesSent = 0;
      lastMetrics = now;
    }
  }
}

/**
 * parse and process a sentence after checking the checksum.
 */ 
void TcpClient::parseSentence(const char * input ) {
  outputStream->print("Sentence recieved as [");
  outputStream->print(input);
  outputStream->println("]");
  
  if ( checkChecksum(input)) {
    recieved++;
    if ( strncmp("$PCDCM,", input, 7) == 0 ) {
       if (mode != WIFICLIENT_MODE_SEASMART) {
          mode = WIFICLIENT_MODE_SEASMART;
          outputStream->print("Enabled SeaSmart client at ");
          outputStream->println(remoteIP);
       }
        unsigned long command[10];
        int nFields = extractFields(input, &command[0], 10);
        if ( nFields > 0 ) {
          switch(command[0]) {
          case 1:
            updatePgnFilter(&command[1], nFields-1);
            break;
          default:
            badCommands++;
            outputStream->print("Command from ");
            outputStream->print(remoteIP);
            outputStream->print(" not recognized :");
            outputStream->println(input);
          }
        }
    } else {
      badCommands++;
        outputStream->print("Sentence from ");
        outputStream->print(remoteIP);
        outputStream->print(" not recognized :");
        outputStream->println(input);
    }        
  } else {
    errors++;
    outputStream->print("Checksum from ");
    outputStream->print(remoteIP);
    outputStream->print(" Bad :");
    outputStream->println(input);
  }
}

/**
 * Extract the fields as unsigned longs.
 */
int TcpClient::extractFields(const char *input, unsigned long *fields, int maxFields) {
  int nFields = 0;
  for(int i = 1; i < WIFICLIENT_MAX_INPUTBUFFER 
    && nFields < maxFields
    && input[i] != '\0' 
    && input[i] != '$'; i++) {
    if ( input[i] == ',' ) {
      fields[nFields++] = atol(&input[i+1]);
    }
  }
  return nFields;
}


/**
 * Verify the checksum true == ok.
 */
bool TcpClient::checkChecksum(const char *input) {
  uint8_t checkSum = 0;
  int i = 1;
  for (; 
    i < WIFICLIENT_MAX_INPUTBUFFER 
      && input[i] != '*' 
      && input[i] != '\0' 
      && input[i] != '$'; 
      ++i) {
    checkSum^=input[i];
  }
  const char * asHex = "0123456789ABCDEF";

  outputStream->print("Checksum Calculated as ");
  outputStream->println(checkSum, HEX);

  if ( i < (WIFICLIENT_MAX_INPUTBUFFER-3) && input[i] == '*' 
    && input[i+1] == asHex[(checkSum>>4)&0x0f] 
    && input[i+2] == asHex[(checkSum)&0x0f]
    && input[i+3] == '\0' ) {
    return true;
  }
  return false;
}

/**
 *  Update the pgn filter list with a new version.
 */
void TcpClient::updatePgnFilter(unsigned long *pgns, int npgns) {
  for(int i = 0; i < WIFICLIENT_PGN_FILTERSIZE; i++ ) {
    if ( i < npgns) {
      this->pgnFilter[i] = pgns[i];
    } else {
      this->pgnFilter[i] = -1;
    }
  }
  dumpPgnFilter();
}

/**
 * Dump the pgn filter list to stdout
 */
void TcpClient::dumpPgnFilter() {
  outputStream->print("PgnFilter ");
  for (int i = 0; i < WIFICLIENT_PGN_FILTERSIZE; ++i){
    outputStream->print(",");
    outputStream->print(pgnFilter[i]);
  }
  outputStream->println("");
}






    

