#include "network.h"
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h>
#include <SPIFFS.h>
#include "config.h"
#include <sys/random.h>
#include <base64.h>





void WebServer::begin(const char * configurationFile) {
      // Initialize SPIFFS
    if(!SPIFFS.begin(false)){
        outputStream->println("An Error has occurred while mounting SPIFFS");
        return;
    }

    MDNS.addService("_http","_tcp",80);

#ifdef ENABLE_WEBSOCKETS
    //server.addHandler(&n0183WS);
    //server.addHandler(&n2kWS);
    //server.addHandler(&n2kWSraw);
    //n2kWS.begin();
    //n2kWSraw.begin();
#endif

    server.on("/api/seasmart", HTTP_GET, [this](AsyncWebServerRequest *request) {
        // these will keep sending chunks as long as the client is connected.
        String pgns = "all";
        if ( request->hasParam("pgns") ) {
            AsyncWebParameter * op = request->getParam("pgns");
            pgns = op->value();
        }
        SeasmartResponseStream * response = new SeasmartResponseStream(outputStream, "text/plain", request);
        Serial.print("Registering stream "); Serial.println((int) response);
        this->addSeasmartResponse(response);
        request->onDisconnect([this, response](void){
            Serial.print("Remove stream "); Serial.println((int) response);
            this->removeSeasmartResponse(response);
        });
        this->addCORS(request, response);
        Serial.print("Send stream "); Serial.println((int) response);
        request->send(response);
        Serial.print("Done response setup "); Serial.println((int) response);
    });


    // POST a block of seasmart commands to the N2K Bus
    // protected by allow list
    server.on("/api/seasmart", HTTP_POST, [this](AsyncWebServerRequest *request) {
            String message = "{ \"ok\": false, \"msg\":\"not found\"}";
            uint16_t code = 404;
            if (request->hasParam("msg", true)) {
                if (seasmartInputHandler != NULL) {
                    String seasmart = request->getParam("msg", true)->value();
                    code = seasmartInputHandler(seasmart.c_str());
                    if (code == 200) {
                        message = "{ \"ok\": true, \"msg\":\"sent\"}";
                    } else {
                        message = "{ \"ok\": false, \"msg\":\"failed\"}";
                    }
                }
            }
            AsyncWebServerResponse * response = request->beginResponse(code, "application/json", message);
            addCORS(request, response);
            request->send(response); 
    });

    server.on("/api/nmea0183", HTTP_GET, [this](AsyncWebServerRequest *request) {
        // this will keep sending chunks as long as the client is connected.
        ChunkedResponseStream * response = new ChunkedResponseStream("text/plain", &nmea0183OutputBuffer);
        addCORS(request, response);
        request->send(response);
    });


    // store contents in NMEA2000 raw units as csv lines.
    server.on("/api/store", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if (storeOutputFn == NULL) {
            request->send(404);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("text/plain");
            addCORS(request, response);
            response->setCode(200);
            storeOutputFn(response);
            request->send(response);
        }
    });

    // text output of all devices.
    server.on("/api/devices", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if (listDeviceOutputFn == NULL) {
            request->send(404);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("text/plain");
            addCORS(request, response);
            response->setCode(200);
            listDeviceOutputFn(response);
            request->send(response);
        }
    });
    server.on("/api/login.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            AsyncWebServerResponse * response = request->beginResponse(
                200,
                "application/json","{ \"ok\": true, \"msg\":\"authorized\"}");
            addCORS(request, response);
            request->send(response);
        }
    });

    //list the filesystem
    server.on("/api/fs.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            outputStream->println("GET /api/fs.json");
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            addCORS(request, response);
            File root = SPIFFS.open("/");
            if (!root || !root.isDirectory() ) {
                response->setCode(404);
                response->println("{ \"files\":[], error:\"not mounted\" }");
                request->send(response);
            } else {
                response->setCode(200);
                response->print("{ \"files\":[");
                File file = root.openNextFile();
                bool firstTime = true;
                while (file) {
                    if (!firstTime) {
                        response->print(",");    
                    }
                    firstTime = false;
                    response->printf("{ \"path\":\"%s\",  \"size\":%d }",  file.path(), file.size() );
                    file = root.openNextFile();
                }
                size_t total = SPIFFS.totalBytes();
                size_t used = SPIFFS.usedBytes();
                size_t free = total-used;
                uint32_t freeHeap = ESP.getFreeHeap();
                uint32_t heapSize = ESP.getHeapSize();                
                uint32_t minFreeHeap = ESP.getMinFreeHeap();
                uint32_t maxAllocHeap = ESP.getMaxAllocHeap();

                response->printf("], \"disk\":{ \"size\":%d, \"used\":%d, \"free\":%d},\n", total, used, free );
                response->printf("\"heap\":{ \"size\":%d, \"free\":%d, \"minFree\":%d, \"maxAlloc\":%d}}\n", heapSize, freeHeap, minFreeHeap, maxAllocHeap );
                request->send(response);
            }
        }
    });

    server.on("/api/layouts.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        outputStream->println("GET /api/layouts.json");
        AsyncResponseStream *response = request->beginResponseStream("application/json");
        addCORS(request, response);
        File root = SPIFFS.open("/");
        if (!root || !root.isDirectory() ) {
            response->setCode(404);
            response->println("{ \"layouts\":[], error:\"not mounted\" }");
            request->send(response);
        } else {
            response->setCode(200);
            response->print("{ \"layouts\":[");
            File file = root.openNextFile();
            bool firstTime = true;
            while (file) {
                String fileName = file.path();
                if ( fileName.startsWith("/layout-") && fileName.endsWith(".json") ) {
                    if (!firstTime) {
                        response->print(",");    
                    }
                    firstTime = false;
                    response->printf("\"%s\"",  fileName.substring(8, fileName.length()-5).c_str() );
                }
                file = root.openNextFile();
            }
            response->println("]}");
            request->send(response);
        }        
    });

    server.on("/api/layout.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        outputStream->print("GET /api/layout.json");
        AsyncWebParameter * layout = request->getParam("layout", false, false);
        if ( layout == NULL) {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            addCORS(request, response);
            response->setCode(400);
            response->printf("{ \"ok\":false,\"msg\":\"layout required\"}\n");
            request->send(response);
        } else {
            String layoutFile = "/layout-";
            // checked
            layoutFile = layoutFile + layout->value() + ".json";
            outputStream->println(layoutFile);
            AsyncWebServerResponse * fileResponse = request->beginResponse(SPIFFS, layoutFile, "application/json");
            if ( fileResponse == NULL) {
                AsyncResponseStream * response = request->beginResponseStream("application/json");
                addCORS(request, response);
                response->setCode(404);
                response->printf("{ \"ok\":false,\"msg\":\"layout not found\"}\n");
                request->send(response);
            } else {
                addCORS(request, fileResponse);
                request->send(fileResponse);                
            }
        }
    });



    // perform operations on the filesystem
    server.on("/api/fs.json", HTTP_POST, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            outputStream->println("POST /api/fs.json");
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            addCORS(request, response);
            AsyncWebParameter * op = request->getParam("op", true, false);
            if ( op == NULL ) {
                // try to get it from multipart
                op = request->getParam("op", true, true);
            }
            if ( op == NULL ) {
                response->setCode(400);
                response->println("{ \"ok\":false,\"msg\":\"op required\"}");
                request->send(response);
            } else if ( op->value() == "delete" ) {
                AsyncWebParameter * path = request->getParam("path", true, false);
                if ( path == NULL ) {
                    response->setCode(400);
                    response->println("{ \"ok\":false,\"msg\":\"path to delete required\"}");
                    request->send(response);
                } else {
                    String filePath = path->value();
                    if ( SPIFFS.exists(filePath) ) {
                        SPIFFS.remove(filePath);
                        response->setCode(200);
                        response->println("{ \"ok\":true,\"msg\":\"deleted\"}");
                        request->send(response);
                    } else {
                        response->setCode(404);
                        response->println("{ \"ok\":false,\"msg\":\"not found\"}");
                        request->send(response);
                    }                    
                }
            } else if ( op->value() == "upload") {

                if ( request->_tempObject == NULL ) {
                    response->setCode(400);
                    response->println("{ \"ok\":false,\"msg\":\"path and file to upload required\"}");
                    request->send(response);
                } else {
                    // _tempObject was set when processing the first chunk of the upload.
                    uint16_t * retCode = (uint16_t *)request->_tempObject;
                    response->setCode(*retCode);
                    if ( *retCode < 400 ) {
                        response->println("{ \"ok\":true, \"msg\":\"saved\" }");
                    } else {
                        response->println("{ \"ok\":false, \"msg\":\"failed to save\" }");
                    }
                    request->send(response);
                    // free the _tempObject and set to null.
                    free(request->_tempObject);
                    request->_tempObject = NULL;
                }
            }
        }
    }, [this](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final) {

        if ( !index ) {
            // first chunk, only start to write the file if there is a path defined.
            // POSTS need to ensure that path and op are sent first before the body of 
            // the file.
            AsyncWebParameter * path = request->getParam("path", true, false);
            AsyncWebParameter * op = request->getParam("op", true, false);
            if ( path != NULL && op != NULL && op->value() == "upload" ) {
                if ( request->_tempObject != NULL ) {
                    Serial.println("Upload only supports one file at a time");
                } else {
                    if ( request->_tempFile ) {
                        // if there was a file open, close it.
                        request->_tempFile.close();
                    }

                    const char * pathValue = path->value().c_str();
                    // allocate enough space for a uint16_t and the path, including the \0 terminator
                    request->_tempObject = malloc(2+strlen(pathValue)+1);
                    // retcode starts at 0
                    uint16_t * retCode = (uint16_t *)(request->_tempObject);
                    // the stored path starts at byte 3
                    char * storedPath = (char *)(request->_tempObject);
                    storedPath = storedPath+2; 
                    // copy the stored path in.
                    strcpy(storedPath, pathValue);
                    // if the file exists set a sucessfull status code to 200 otherwise 201.
                    if ( SPIFFS.exists(storedPath)) {
                        *retCode = 200;
                    } else {
                        *retCode = 201;
                    }
                    // open the file and keep the pointer to it in _tempFile
                    request->_tempFile = SPIFFS.open(storedPath, "w");                    
                }
            } 
        }
        // only if a file has been setup to write
        if ( request->_tempObject != NULL && request->_tempFile ) {

            // only if there is come data
            if ( len ) {
                // append the chunk to the file.
                if ( request->_tempFile.write(data,len) != len ) {
                    // if not all the data was written, set the retCode to 500
                    // close the file and set to null so no more data is written.
                    uint16_t * retCode = (uint16_t *)(request->_tempObject);
                    *retCode = 500;
                    request->_tempFile.close();
                }
            }
            if ( final ) {
                // write complete, close the file and set to null so no more data is written.
                request->_tempFile.close();
            }            
        }
    });

    // management

    server.on("/api/statusDump", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if (statusOutputFn == NULL) {
            request->send(404);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("text/plain");
            addCORS(request, response);
            response->setCode(200);
            size_t total = SPIFFS.totalBytes();
            size_t used = SPIFFS.usedBytes();
            size_t free = total-used;
            response->print("Status Dump");
            response->println("disk:");
            response->print("  total:");response->println(total);
            response->print("  used:");response->println(used);
            response->print("  free:");response->println(free);
            statusOutputFn(response);
            request->send(response);
        }
    });

    server.on("/api/status.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            addCORS(request, response);
            response->setCode(200);
            size_t total = SPIFFS.totalBytes();
            size_t used = SPIFFS.usedBytes();
            size_t free = total-used;
            response->print("{ \"heap\":");response->print(ESP.getFreeHeap());
            response->print(", \"disk\": { \"total\":");response->print(total);
            response->print(", \"used\":");response->print(used);
            response->print(", \"free\":");response->print(free);
            response->println("}}");
            request->send(response);
        }
    });
    server.on("/api/reboot.json", HTTP_POST, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            addCORS(request, response);
            response->setCode(200);
            response->println("{ \"ok\":true, \"msg\":\"reboot in 1s\" }");
            request->send(response);
            outputStream->println("Rebooting in 1s, requested by Browser");
            delay(1000);
            ESP.restart();
        }
    });

    // protect the config file from serving static
    server.on("/config.txt", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(SPIFFS, "/config.txt", "text/plain");
        }
    });

    server.on("/*", HTTP_GET, [this](AsyncWebServerRequest *request) {
        String path = request->url();
        Serial.println(path);
        if ( path.endsWith("/") ) {
            path = path + "index.html";
        }
        if (SPIFFS.exists(path) || SPIFFS.exists(path+".gz") )  {
           AsyncWebServerResponse *response = request->beginResponse(SPIFFS, path);
           this->addCORS(request, response);
           request->send(response);
        }
    });




    // everything else, serve static.
    server.serveStatic("/", SPIFFS, "/" )
        .setDefaultFile("index.html")
        .setCacheControl("max-age=600");


    server.onNotFound([this](AsyncWebServerRequest *request) {
        if (request->method() == HTTP_OPTIONS) {
            AsyncWebServerResponse *response = request->beginResponse(200);
            // handle preflights
            this->addCORS(request, response);
            request->send(response);
        } else {
            AsyncWebServerResponse *response = request->beginResponse(404);
            this->addCORS(request, response);
            request->send(response);
        }
    });


    if ( !ConfigurationFile::get(configurationFile, "httpauth:", basicAuth) ) {
        byte buffer[12];
        getrandom(&buffer[0], 12, 0);
        basicAuth = "admin:";
        for(int i = 0; i < 12; i++) {
            basicAuth += (char)((48+buffer[i]%(125-48)));
        }
        httpauth = "Basic "+base64::encode(basicAuth);
        outputStream->printf("Using generated http basic auth admin password: %s\n", basicAuth.c_str());
        outputStream->printf("Use Header: Authorization: %s\n", httpauth.c_str());
    } else {
        httpauth = "Basic "+base64::encode(basicAuth);
        outputStream->print("Configured http Authorzation header to be ");
        outputStream->println(httpauth);
    }
    server.begin();
};





       


void WebServer::handleAllFileUploads(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
    if ( authorized(request) ) {
        AsyncWebParameter * op = request->getParam("path", true, false);
        AsyncWebParameter * path = request->getParam("path", true, false);
        if ( request->url() == "/api/fs.json" && op != NULL && path != NULL && op->value() == "upload" ) {
            Serial.print("Handing a file upload to ");
            Serial.println(path->value());
            int status = 201;
            if ( SPIFFS.exists(path->value()) ) {
                status = 200;
            }
            File file = SPIFFS.open(path->value());
            if ( file.write(data,len) == len ) {
                file.close();
                request->send(status, "application/json", "{ \"ok\":true, \"msg\":\"saved\" }");
            } else {
                file.close();
                request->send(500, "application/json", "{ \"ok\":false, \"msg\":\"upload incomplete\" }");
            }
        }
    }
}

bool WebServer::authorized(AsyncWebServerRequest *request) {
    AsyncWebHeader *authorization = request->getHeader("Authorization");
    if ( authorization == NULL || !httpauth.equals(authorization->value()) ) {
        AsyncWebServerResponse * response = request->beginResponse(401,"application/json","{ \"ok\": false, \"msg\":\"not authorized\"}");
        addCORS(request, response);
        response->addHeader("WWW-Authenticate","Basic realm=\"BoatSystems Admin\", charset=\"UTF-8\"");
        request->send(response);
        return false;
    } else {
        return true;
    }
}

void WebServer::addCORS(AsyncWebServerRequest *request, AsyncWebServerResponse * response ) {
    AsyncWebHeader *orgin = request->getHeader("Origin");
    if ( orgin != NULL) {
        String originValue = orgin->value();
        if ( originValue != NULL ) {
            response->addHeader("Access-Control-Max-Age", "600");
            response->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, DELETE");
            response->addHeader("Access-Control-Allow-Headers", "Authorization");
            // Origin from a browser is protected.
            response->addHeader("Access-Control-Allow-Origin", originValue);
            response->addHeader("Access-Control-Allow-Credentials", "true");            
        }
    
    }
}


void WebServer::sendN0183(const char *buffer) {
#ifdef ENABLE_WEBSOCKETS
    n0183WS.textAll(buffer);
#endif
    nmea0183OutputBuffer.writeLine(buffer);

}

#ifdef ENABLE_WEBSOCKETS
void WebServer::sendN2K(const char *buffer) {
    n2kWS.send(buffer);
}
#endif


void WebServer::printStatus(Print *stream) {
    SeasmartResponseStream *headStream = seasmartStreamsHead;
    while(headStream != NULL ) {
        headStream->printStatus(stream);
        headStream = headStream->nextStream;
    }
}


// Handling for a linked list of active seasmart response streams.

bool WebServer::acceptSeaSmart(unsigned long pgn) {
    SeasmartResponseStream *headStream = seasmartStreamsHead;
    while(headStream != NULL ) {
        if ( headStream->acceptPgn(pgn) ) {
            return true;
        }
        headStream = headStream->nextStream;
    }
    return false;    
}

void WebServer::sendSeaSmart(unsigned long pgn, const char *buffer) {
    SeasmartResponseStream *headStream = seasmartStreamsHead;
    while(headStream != NULL ) {
        if ( headStream->acceptPgn(pgn) ) {
            headStream->writeLine(buffer);
        }
        headStream = headStream->nextStream;
    }
}




void WebServer::addSeasmartResponse(SeasmartResponseStream * response) {
    // no list, start a new one.
    /*Serial.print("Cheking pointer "); Serial.println((int) response);
    if ( response->acceptPgn(12343) ) {
        Serial.println("Checked true, ok");
    } else {
        Serial.println("Checked false, ok");
    } */
    if ( seasmartStreamsHead == NULL ) {
        Serial.print("Core:");
        Serial.print(xPortGetCoreID());
        Serial.print("Add "); Serial.println((int) response);
        seasmartStreamsHead = response;
        return;
    }
    // add the response to the end of the linked list of responses.
    SeasmartResponseStream *headStream = seasmartStreamsHead;
    while(headStream->nextStream != NULL ) {
        headStream = headStream->nextStream;
    }
        Serial.print("Core:");
        Serial.print(xPortGetCoreID());
    Serial.print("Add "); Serial.println((int) response);
    headStream->nextStream = response;
}

/** 
 * remove the response from the linked list of seasmartStreams.
 */ 
void WebServer::removeSeasmartResponse(SeasmartResponseStream * response) {
    if ( seasmartStreamsHead != NULL ) {
        // first entry in the list, remove it and make the next 
        // entry the first, which could be NULL.
        if (seasmartStreamsHead == response) {
            seasmartStreamsHead = seasmartStreamsHead->nextStream;
            return;
        }
        SeasmartResponseStream *headStream = seasmartStreamsHead;
        while(headStream->nextStream != NULL) {
            if ( headStream->nextStream == response) {
                headStream->nextStream = response->nextStream;
                return;
            }
            headStream = headStream->nextStream;
        }
    }
}





    

