#include "network.h"
#include <ESPAsyncWebServer.h>



void PgnWebSocket::begin() {
    onEvent([this](AsyncWebSocket * server, 
        AsyncWebSocketClient * client, 
        AwsEventType type, 
        void * arg, 
        uint8_t *data, 
        size_t len) {
        this->handleWSEvent(server, client, type, arg, data, len);
    });    
}




void PgnWebSocket::handleWSEvent(AsyncWebSocket * server, 
        AsyncWebSocketClient * client, 
        AwsEventType type, 
        void * arg, 
        uint8_t *data, 
        size_t len) {
 if(type == WS_EVT_CONNECT){
    //client connected
    Serial.printf("ws[%s][%u] connect\n", server->url(), client->id());
    client->printf("Hello Client %u :)", client->id());
    client->ping();
    addClient(client);
  } else if(type == WS_EVT_DISCONNECT){
    //client disconnected
    Serial.printf("ws[%s][%u] disconnect\n", server->url(), client->id());
    removeClient(client);
  } else if(type == WS_EVT_ERROR){
    //error was received from the other end
    Serial.printf("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t*)arg), (char*)data);
  } else if(type == WS_EVT_PONG){
    //pong message was received (in response to a ping request maybe)
    Serial.printf("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len)?(char*)data:"");
  } else if(type == WS_EVT_DATA){
    //data packet
    AwsFrameInfo * info = (AwsFrameInfo*)arg;
    processCommandMessage(client, data, len, info);
  }
}
/*
    if(info->final && info->index == 0 && info->len == len){
      //the whole message is in a single frame and we got all of it's data
      Serial.printf("ws[%s][%u] %s-message[%llu]: ", server->url(), client->id(), (info->opcode == WS_TEXT)?"text":"binary", info->len);
      processMessage(client, data, len);
      if(info->opcode == WS_TEXT){
        data[len] = 0;
        Serial.printf("%s\n", (char*)data);
      } else {
        for(size_t i=0; i < info->len; i++){
          Serial.printf("%02x ", data[i]);
        }
        Serial.printf("\n");
      }
      if(info->opcode == WS_TEXT)
        client->text("I got your text message");
      else
        client->binary("I got your binary message");
    } else {
      //message is comprised of multiple frames or the frame is split into multiple packets
      if(info->index == 0){
        if(info->num == 0)
          Serial.printf("ws[%s][%u] %s-message start\n", server->url(), client->id(), (info->message_opcode == WS_TEXT)?"text":"binary");
        Serial.printf("ws[%s][%u] frame[%u] start[%llu]\n", server->url(), client->id(), info->num, info->len);
      }

      Serial.printf("ws[%s][%u] frame[%u] %s[%llu - %llu]: ", server->url(), client->id(), info->num, (info->message_opcode == WS_TEXT)?"text":"binary", info->index, info->index + len);
      if(info->message_opcode == WS_TEXT){
        data[len] = 0;
        Serial.printf("%s\n", (char*)data);
      } else {
        for(size_t i=0; i < len; i++){
          Serial.printf("%02x ", data[i]);
        }
        Serial.printf("\n");
      }
      processMessage(client, data, len);

      if((info->index + len) == info->len){
        Serial.printf("ws[%s][%u] frame[%u] end[%llu]\n", server->url(), client->id(), info->num, info->len);
        if(info->final){
          Serial.printf("ws[%s][%u] %s-message end\n", server->url(), client->id(), (info->message_opcode == WS_TEXT)?"text":"binary");
          if(info->message_opcode == WS_TEXT)
            client->text("I got your text message");
          else
            client->binary("I got your binary message");
        }
      }
    }
  }
}
*/

/**
 * Add a client to the list of clients/
 * If none are available dont add
 */ 
bool PgnWebSocket::addClient(AsyncWebSocketClient * client) {
    for (int i = 0; i < MAX_CLIENTS; ++i) {
        if ( !clients[i].used ) {
            clients[i].used = true;
            clients[i].all = true;
            clients[i].client = client;
            return true;
        }
    }
    return false;
}

/**
 * Remove the client and free the slot.
 */ 
bool PgnWebSocket::removeClient(AsyncWebSocketClient * client) {
    for (int i = 0; i < MAX_CLIENTS; ++i) {
        if ( clients[i].client->id() == client->id() ) {
            clients[i].client = NULL;
            clients[i].used = false;
            return true;
        }
    }
    return false;
}

/**
 * Process command messages, return true on sucess, false on fail.
 */ 
bool PgnWebSocket::processCommandMessage(AsyncWebSocketClient * client, 
            uint8_t *data, size_t len, AwsFrameInfo *info) {
    for (int i = 0; i < MAX_CLIENTS; ++i) {
        if ( clients[i].used && clients[i].client->id() == client->id() ) {
            if(info->message_opcode == WS_TEXT){
                unsigned long pgn;
                if ( sscanf((const char *)data, "allpgns:%lu", &pgn) == 1 ) {
                    if (pgn == 1) {
                        clients[i].all = true;
                    } else {
                        clients[i].all = true;
                    }
                }
                if ( sscanf((const char *)data, "addpgn:%lu", &pgn) == 1) {
                    // add a pgn
                    for (int j = 0; j < MAX_PGNS; ++i) {
                        if ( clients[i].pgns[j] == 0) {

                            clients[i].pgns[j] = pgn;
                            return true;
                        }
                    }
                }
                if ( sscanf((const char *)data, "rmpgn:%lu", &pgn) == 1) {
                    // remove a pgn
                    for (int j = 0; j < MAX_PGNS; ++i) {
                        if ( clients[i].pgns[j] == pgn) {
                            clients[i].pgns[j] = 0;
                            return true;
                        }
                    }
                }
            }
            return false;
        }
    }
    return false;
}


/**
 * check to see of the pgn is in a list of pgns sent less than 500ms ago ?
 * return true if it is
 */ 
bool PgnWebSocket::sendDebounced(unsigned long pgn) {
    for(int i = 0; i < npgns_sent; i++ ) {
        unsigned long now = millis();
        if ( (now - pgnsent[i].at) > 500 ) {
            npgns_sent = i;
            ndrop++;
            break;
        } else if ( pgnsent[i].pgn == pgn ) {
            nbounce++;
            return false;
        }
    }
    nsend++;
    record(pgn);
    return true;
}
/**
 * add the pgn to the start of a list removing any pgns older than 500ms.
 */ 
void PgnWebSocket::record(unsigned long pgn) {
    unsigned long now = millis();
    // remove any previous records matching this pgn, and any expired records.
    // this avoids filling the set with the most frequent pgn.
    int d = 0;
    for (int i = 0; i < npgns_sent; ++i) {
        if ( (now - pgnsent[i].at ) > 500 ) {
            // dont bother with any that have expired already.
            npgns_sent = i;
            break;
        } else if ( pgnsent[i].at == pgn ) {
            // skip.
        } else if ( d < i ) {
            // copy to fill gaps
            pgnsent[d].at = pgnsent[i].at; 
            pgnsent[d].pgn = pgnsent[i].pgn;
            d++;            
        } else {
            d++;            
        }
    }


    if ( npgns_sent == MAX_PGNTRACKING ) {
        npgns_sent = MAX_PGNTRACKING-1;
    }
    // shift down to make space for pgnsent[0] evicting pgnsent[max-1]
    for(int i = npgns_sent; i > 0; i-- ) {
        pgnsent[i].at = pgnsent[i-1].at; 
        pgnsent[i].pgn = pgnsent[i-1].pgn;
    }
    npgns_sent++;
    // save the latest in idx=0
    pgnsent[0].at = now;
    pgnsent[0].pgn = pgn;
    Serial.print("Add :");
    Serial.print(pgn);
    Serial.print(" l:");
    Serial.print(npgns_sent);
    Serial.print(" d:");
    Serial.print(ndrop);
    Serial.print(" b:");
    Serial.print(nbounce);
    Serial.print(" s:");
    Serial.println(nsend);
}

/**
 * return true if one or more clients have requested the pgn.
 */ 
bool PgnWebSocket::shouldSend(unsigned long pgn) {
    for (int i = 0; i < MAX_CLIENTS; ++i) {
        if ( clients[i].used ) {
            if ( clients[i].all ) {
                return sendDebounced(pgn);
            }
            for (int j = 0; j < MAX_PGNS; ++i) {
                if ( clients[i].pgns[j] == pgn) {
                    return sendDebounced(pgn);
                }
            }
        }
    }
    return false;
}

/**
 * send the pgn to all clients that have requested it.
 */
void PgnWebSocket::send(const char * msg) {
    for (int i = 0; i < MAX_CLIENTS; ++i) {
        if ( clients[i].used ) {
            clients[i].client->text(msg);
        }
    }
}





    

