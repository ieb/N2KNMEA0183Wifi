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

    MDNS.begin("boatsystems");
    MDNS.addService("_http","_tcp",80);

    server.addHandler(&n0183WS);
    server.addHandler(&n2kWS);
    server.addHandler(&n2kWSraw);
    n2kWS.begin();
    n2kWSraw.begin();


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
        if (storeOutputFn == NULL) {
            request->send(404);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("text/plain");
            addCORS(request, response);
            response->setCode(200);
            listDeviceOutputFn(response);
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
                    response->printf("{ \"path\":\"%s\",  \"size\":%d }",  file.name(), file.size() );
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

    // everything else, serve static.
    server.serveStatic("/", SPIFFS, "/" )
        .setDefaultFile("default.html")
        .setCacheControl("max-age=600");


    server.onNotFound([this](AsyncWebServerRequest *request) {
        if (request->method() == HTTP_OPTIONS) {
            AsyncWebServerResponse *response = request->beginResponse(200);
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
            response->addHeader("Access-Control-Allow-Origin", originValue);
            response->addHeader("Access-Control-Allow-Credentials", "true");            
        }
    
    }
}


void WebServer::sendN0183(const char *buffer) {
    n0183WS.textAll(buffer);
}
void WebServer::sendN2K(const char *buffer) {
    n2kWS.send(buffer);
}






    

