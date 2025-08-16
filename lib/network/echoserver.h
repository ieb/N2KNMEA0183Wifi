#pragma once
#include "Arduino.h"
#include <AsyncTCP.h>


class EchoServer  {
public: 
    EchoServer();
    ~EchoServer();
    void begin();
    void end();
private:
    AsyncServer server;
};
