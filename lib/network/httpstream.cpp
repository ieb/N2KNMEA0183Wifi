#include "httpstream.h"


void BroadcastBuffer::writeLine(const char * buffer) {
    const char * bpos = buffer;
    uint16_t i = 0;
    while(*bpos != '\0' && i < BROADCAST_BUFFER_LEN) {
        _buffer[wpos] = *bpos;
        bpos++;
        wpos = (wpos+1) % BROADCAST_BUFFER_LEN;
        i++; // protect against an infinite loop.
    }
    // add a line seperator
    _buffer[wpos] = '\n';
    wpos = (wpos+1) % BROADCAST_BUFFER_LEN;
}
size_t BroadcastBuffer::read(size_t *start, uint8_t * buffer, size_t maxLen) {
    size_t i = 0;
    size_t spos = start[0];
    for(; spos != wpos && i < maxLen; i++) {
        buffer[i] = _buffer[spos];
        spos = (spos+1) % BROADCAST_BUFFER_LEN;
    }
    start[0] = spos;
    return i;
}
size_t BroadcastBuffer::getStart() {
    return wpos;
}


ChunkedResponseStream::ChunkedResponseStream(const String& contentType, BroadcastBuffer *buffer){
  _code = 200;
  _contentLength = 0;
  _sendContentLength = false;
  _contentType = contentType;
  _chunked = true;
  _buffer = buffer;
  _start = _buffer->getStart();
}

ChunkedResponseStream::~ChunkedResponseStream(){

}

size_t ChunkedResponseStream::_fillBuffer(uint8_t *buffer, size_t maxLen){
    size_t nread = _buffer->read(&_start, buffer, maxLen);
    if (nread == 0) {
        return RESPONSE_TRY_AGAIN;
    } 
    return nread;
}



/*
 * A Seasmart stream, create and when done call request->send
 * 
 */


SeasmartResponseStream::SeasmartResponseStream(Stream *outputStream, const String& contentType, AsyncWebServerRequest *request){
  this->outputStream = outputStream;
  remoteIP = request->client()->remoteIP();
  _code = 200;
  _contentLength = 0;
  _sendContentLength = false;
  _contentType = contentType;
  _chunked = true;
  String pgns = "all";
  if ( request->hasParam("pgns") ) {
      AsyncWebParameter * op = request->getParam("pgns");
      pgns = op->value();
  }
  _npgns = sscanf(pgns.c_str(), 
      "%ld,%ld,%ld,%ld,%ld,%ld,%ld,%ld,%ld,%ld", 
      &_pgns[0], 
      &_pgns[1], 
      &_pgns[2],
      &_pgns[3],
      &_pgns[4],
      &_pgns[5],
      &_pgns[6],
      &_pgns[7],
      &_pgns[8],
      &_pgns[9]
     );
  Serial.print("Core:");
  Serial.println(xPortGetCoreID());
  Serial.print("PGNS are :");
  Serial.print(_npgns);
  for (int i = 0; i < _npgns; i++ ) {
      Serial.print(",");
      Serial.print(_pgns[i]);
  }
  Serial.println("");
  startedAt = millis();
}

SeasmartResponseStream::~SeasmartResponseStream(){

}


bool SeasmartResponseStream::acceptPgn(unsigned long pgn) {
    if ( _npgns == 0 ) {
        return true;
    } 
    for (int i = 0; i < _npgns; i++ ) {
        if ( _pgns[i] == pgn) {
            return true;
        }
    }
    return false;
}


size_t SeasmartResponseStream::_fillBuffer(uint8_t *buffer, size_t maxLen){
    size_t i = 0;
    while(i < maxLen && start != wpos) {
        buffer[i++] = _buffer[start];
        start = (start+1) % SEASMART_BUFFER_LEN;
    }
    if (i == 0) {
        return RESPONSE_TRY_AGAIN;
    } 
    reads++;
    bytesSent = bytesSent+i;
    return i;
}

void SeasmartResponseStream::writeLine(const char * buffer) {
    const char * bpos = buffer;
    uint16_t i = 0;
    while(*bpos != '\0' && i < SEASMART_BUFFER_LEN) {
        if ( i > 0 && wpos == start) {
            overflows++;
        }
        _buffer[wpos] = *bpos;
        bpos++;
        wpos = (wpos+1) % SEASMART_BUFFER_LEN;
        i++; // protect against an infinite loop.
    }
    // add a line seperator
    _buffer[wpos] = '\n';
    wpos = (wpos+1) % SEASMART_BUFFER_LEN;

    if (start < wpos) {
        minFreespace = min(minFreespace, wpos - start);
    } else {
        minFreespace = min(minFreespace, SEASMART_BUFFER_LEN - start + wpos);
    }
    writes++;
}

void SeasmartResponseStream::printStatus(Print *stream) {
    unsigned long now = millis();
    double bandwidth = bytesSent/(1024.0*(0.001*(now - startedAt)));
    stream->print("HttpStream ->");
    stream->print(remoteIP);
    stream->print(" bandwidth:");
    stream->print(bandwidth);
    stream->print("kb/s sent:");
    stream->print(bytesSent/1024);
    stream->print("kb buffer reads:");
    stream->print(reads);
    stream->print(" buffer writes:");
    stream->print(writes);
    stream->print(" overflows:");
    stream->print(overflows);
    if ( _npgns > 0 ) {
        stream->print(" filter:");
        for(int i = 0; i < _npgns; i++ ) {
          stream->print(" ");
          stream->print(_pgns[i]);
        }        
    } else {
        stream->print(" no filter");        
    }
    stream->println("");
}

