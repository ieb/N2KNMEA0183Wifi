
#pragma once

#include <ESPAsyncWebServer.h>

#define BROADCAST_BUFFER_LEN 2048
#define SEASMART_BUFFER_LEN 4096

/**
 * Maintains a ring buffer that allows a writer to update the content
 * and multiple readers to read from the buffer.
 * There is no overflow protection, readers must keep up.
 * Readers should call getStart() to determine where they should start 
 * on creation.
 * There is no warning or detection of an overflow.
 */ 
class BroadcastBuffer {
public:
    BroadcastBuffer() {};
    /**
     * Write contents a null terminated string into the buffer.
     * the buffer will overflow and content will be lost, BORADCAST_BUFFER_LEN=1024
     * @param buffer, the buffer to write.
     * @param line, the length to write.
     */ 
    void writeLine(const char * buffer);
    /**
     * Read from the buffer into the supplied buffer a maximum of maxLen
     * chars, stopping when the position reaches the current write position 
     * or maxLen is reached, on return the value in start is udpated.
     * @param start, pointer to the start position updated on return.
     * @param buffer, the buffer to be filled
     * @param maxLen, the size of the buffer to be filled.
     */
    size_t read(size_t * start, uint8_t * buffer, size_t maxLen);
    /**
     * return the position to start reading from.
     */
    size_t getStart();
private:
    uint8_t _buffer[BROADCAST_BUFFER_LEN];
    size_t wpos = 0;
};

/**
 * Sends a chunked response stream using a Broadcast buffer as a source.
 * This will send for as long as the client is connected in chunks.
 * Unfortunately the ESPAsyncWebServer WebSocket support is unreliable and causes SEGV's when running 
 * with concurrent clients. This addresses that by being a lot simpler focusing on sending a stream,
 * The output appears of chunks of data that can be consumed in Javascript using the fetch async API.
 * The code is simple, with no malloc other than creating this object eg
 *   ChunkedResponseStream * stream = new ChunkedResponseStream("text/plain", broadcastBuffer);
 *   request->send(stream);
 */ 
class ChunkedResponseStream: public AsyncAbstractResponse {
  public:
    ChunkedResponseStream(const String& contentType, BroadcastBuffer *buffer);
    ~ChunkedResponseStream();
    bool _sourceValid() const { return (_state < RESPONSE_END); }
    virtual size_t _fillBuffer(uint8_t *buf, size_t maxLen) override;
  private:
    size_t _start = 0;
    BroadcastBuffer * _buffer;
};




class SeasmartResponseStream: public AsyncAbstractResponse {
  public:
    SeasmartResponseStream(Stream *outputStream, const String& contentType, AsyncWebServerRequest *request);
    ~SeasmartResponseStream();
    void writeLine(const char * buffer);
    bool acceptPgn(unsigned long pgn);
    bool _sourceValid() const { return (_state < RESPONSE_END); }
    virtual size_t _fillBuffer(uint8_t *buf, size_t maxLen) override;
    void printStatus(Print *stream);

    SeasmartResponseStream * nextStream = NULL;

  private:
    Stream *outputStream;
    uint8_t _buffer[SEASMART_BUFFER_LEN];
    unsigned long _pgns[10];
    size_t _npgns = 0;
    size_t wpos = 0;
    size_t start = 0;

    uint16_t overflows = 0;
    uint16_t writes = 0;
    uint16_t reads = 0;
    size_t minFreespace =  SEASMART_BUFFER_LEN;

    unsigned long bytesSent = 0;
    unsigned long startedAt = 0;
    IPAddress remoteIP;


};




