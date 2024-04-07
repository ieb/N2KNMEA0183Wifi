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

    server.on("/", HTTP_GET, [this](AsyncWebServerRequest *request) {
        request->send(SPIFFS, "/index.html", "text/html", false, [this, request](const String& var){
            return this->handleTemplate(request, var);
        });
    });
    server.on("/admin.html", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(SPIFFS, "/admin.html", "text/html", false, [this, request](const String& var){
                return this->handleTemplate(request, var);
            });
        }
    });
    server.on("/admin.js", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(SPIFFS, "/admin.js", "application/javascript");
        }
    });
    server.on("/admin.css", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(SPIFFS, "/admin.css", "text/css");
        }
    });


    server.on("^\\/(.*)\\.html$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        String path = String("/") + request->pathArg(0) + String(".html");
        outputStream->print("GET ");outputStream->println(path);
        request->send(SPIFFS, path, "text/html", false, [this, request](const String& var){
            return this->handleTemplate(request, var);
        });
    });
    server.on("^\\/(.*)\\.js$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        String path = String("/") + request->pathArg(0) + String(".js");
        outputStream->print("GET ");outputStream->println(path);
        request->send(SPIFFS, path, "text/javascript");
    });
    server.on("^\\/(.*)\\.css$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        String path = String("/") + request->pathArg(0) + String(".css");
        outputStream->print("GET ");outputStream->println(path);
        request->send(SPIFFS, path, "text/css");
    });



    server.on("/api/logbook.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        AsyncResponseStream *response = request->beginResponseStream("application/json");
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->setCode(200);
        response->print("{ \"logbooks\": [ \"/api/logbookj.json\" ");

        outputStream->println("GET /api/logbook.json");
        File f = SPIFFS.open("/logbook");
        File lf = f.openNextFile();
        while(lf) {
            response->printf(",\n{ \"name\":\"%s\", \"size\":%d }",lf.name(),lf.size());
            lf = f.openNextFile();
        }
        response->print("\n]}");
        request->send(response);
    });

    server.on("^\\/logbook/(.*)$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        String path = String("/logbook/") + request->pathArg(0);
        outputStream->print("GET ");outputStream->println(path);
        request->send(SPIFFS, path, "text/plain");
    });

    server.on("^\\/logbook/(.*)$", HTTP_DELETE, [this](AsyncWebServerRequest *request) {
        String path = String("/logbook/") + request->pathArg(0);
        outputStream->print("DELETE ");outputStream->println(path);
        if ( SPIFFS.exists(path)) {
            SPIFFS.remove(path);
            request->send(200,"application/json","{ \"ok\":true,\"msg\":\"deleted\"}");
        } else {
            request->send(404);
        }
    });



    server.on("^\\/api\\/data\\/([0-9]*).csv$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        int id = request->pathArg(0).toInt();
        unsigned long start = millis();
        outputStream->print("http GET /api/data/");
        outputStream->print(id);
        outputStream->print(".csv");
        
        if ( id >= 0 && id < MAX_DATASETS && this->csvHandlers[id] != NULL) {
            AsyncResponseStream *response = request->beginResponseStream("text/csv");
            response->addHeader("Access-Control-Allow-Origin", "*");
            response->setCode(200);
            this->csvHandlers[id]->outputCsv(response);
            request->send(response);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("text/csv");
            response->addHeader("Access-Control-Allow-Origin", "*");
            response->setCode(404);
            request->send(response);
        }
        outputStream->print(" ");
        outputStream->println(millis() - start);
    });


    server.on("^\\/api\\/data\\/([0-9]*).json$", HTTP_GET, [this](AsyncWebServerRequest *request) {
        int id = request->pathArg(0).toInt();
        unsigned long start = millis();
        outputStream->print("http GET /api/data/");
        outputStream->print(id);
        outputStream->print(".json");
        
        if ( id >= 0 && id < MAX_DATASETS && this->jsonHandlers[id] != NULL) {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            response->addHeader("Access-Control-Allow-Origin", "*");
            response->setCode(200);
            this->jsonHandlers[id]->outputJson(response);
            request->send(response);
        } else {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            response->addHeader("Access-Control-Allow-Origin", "*");
            response->setCode(404);
            request->send(response);
        }
        outputStream->print(" ");
        outputStream->println(millis() - start);
    });
    server.on("/api/data/all.json", HTTP_GET, [this](AsyncWebServerRequest *request) {
        unsigned long start = millis();
        outputStream->print("http GET /api/data/all");
        AsyncResponseStream *response = request->beginResponseStream("application/json");
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->setCode(200);
        response->print("{");
        bool first = true;
        for (int i = 0; i < MAX_DATASETS; i++) {
            if (this->jsonHandlers[i] != NULL) {
                if (!first) {
                    response->print(",");
                }
                first = false;
                response->print("\"");response->print(i);response->print("\":");
                this->jsonHandlers[i]->outputJson(response);
            }
        }
        response->print("}");
        request->send(response);
        outputStream->print(" ");
        outputStream->println(millis() - start);
    });




    // management
    server.on("/admin/status", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            AsyncResponseStream *response = request->beginResponseStream("application/json");
            response->addHeader("Access-Control-Allow-Origin", "*");
            response->setCode(200);
            size_t total = SPIFFS.totalBytes();
            size_t used = SPIFFS.usedBytes();
            size_t free = total-used;
            response->print("{ \"heap\":");response->print(ESP.getFreeHeap());
            response->print(", \"disk\": { \"tota\":");response->print(total);
            response->print(", \"used\":");response->print(used);
            response->print(", \"free\":");response->print(free);
            response->println("}}");
            request->send(response);
        }
    });
    server.on("/admin/reboot", HTTP_POST, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(200, "application/json", "{ \"ok\":true, \"msg\":\"reboot in 1s\" }");
            outputStream->println("Rebooting in 1s, requested by Browser");
            delay(1000);
            ESP.restart();
        }
    });
    server.on("/admin/config.txt", HTTP_GET, [this](AsyncWebServerRequest *request) {
        if ( this->authorized(request) ) {
            request->send(SPIFFS, "/config.txt", "text/plain");
        }
    });
    server.onFileUpload([this](AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
         //Handle upload
        this->handleAllFileUploads(request, filename, index, data, len, final);
    });

    server.onNotFound([](AsyncWebServerRequest *request) {
        if (request->method() == HTTP_OPTIONS) {
            AsyncWebServerResponse *response = request->beginResponse(200);
            response->addHeader("Access-Control-Allow-Origin", "*");
            request->send(response);
        } else {
            AsyncWebServerResponse *response = request->beginResponse(404);
            response->addHeader("Access-Control-Allow-Origin", "*");
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

String WebServer::handleTemplate(AsyncWebServerRequest * request, const String &var) {
    if (var == "WEB_SERVER_URL") {
        String url = "http://";
        url += WiFi.localIP().toString();
        return url;
    }
    return String();
}


void WebServer::handleAllFileUploads(AsyncWebServerRequest *request, String filename, size_t index, uint8_t *data, size_t len, bool final){
    if ( authorized(request) ) {
        if ( request->url().equals("/admin/config.txt")) {
            File file = SPIFFS.open("/config.txt", FILE_WRITE);
            if ( file ) {
                if ( file.write(data,len) == len ) {
                    file.close();
                    request->send(200, "application/json", "{ \"ok\":true, \"msg\":\"saved\" }");
                } else {
                    file.close();
                    request->send(500, "application/json", "{ \"ok\":false, \"msg\":\"upload incomplete\" }");
                }
            } else {
                    request->send(500, "application/json", "{ \"ok\":false, \"msg\":\"Unable to update config file\" }");
            }
        } else {
            request->send(500, "application/json", "{ \"ok\":false, \"msg\":\"multi part posts not supported\" }");
        }
    }
}

bool WebServer::authorized(AsyncWebServerRequest *request) {
    AsyncWebHeader *authorization = request->getHeader("Authorization");
    if ( authorization == NULL || !httpauth.equals(authorization->value()) ) {
        AsyncWebServerResponse * response = request->beginResponse(401,"application/json","{ \"ok\": false, \"msg\":\"not authorized\"}");
        response->addHeader("WWW-Authenticate","Basic realm=\"BoatSystems Admin\", charset=\"UTF-8\"");
        request->send(response);
        return false;
    } else {
        return true;
    }
}


void WebServer::sendN0183(const char *buffer) {
    n0183WS.textAll(buffer);
}
void WebServer::sendN2K(const char *buffer) {
    n2kWS.textAll(buffer);
}



void JsonOutput::append(const char *key, const char *value) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":\"");
    outputStream->print(value);
    outputStream->print("\"");
};
void JsonOutput::append(const char *value) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(value);
    outputStream->print("\"");
}
void JsonOutput::append(int value) {
    appendCommaIfRequired();
    outputStream->print(value);
}
void JsonOutput::append(unsigned long value) {
    appendCommaIfRequired();
    outputStream->print(value);
}

void JsonOutput::appendCommaIfRequired() {
    if (levels[level]) {
        levels[level] = false;
    } else {
        outputStream->print(",");
    }
};

void JsonOutput::append(const char *key, int value) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":");
    outputStream->print(value);
};
void JsonOutput::append(const char *key, double value, int precision) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":");
    outputStream->print(value,precision);
};
void JsonOutput::append(const char *key, unsigned int value) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":");
    outputStream->print(value);
};

void JsonOutput::append(const char *key, unsigned long value) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":");
    outputStream->print(value);
};
void JsonOutput::startObject() {
    appendCommaIfRequired();
    outputStream->print("{");
    level++;
    levels[level] = true;
};
void JsonOutput::startObject(const char *key) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":{");
    level++;
    levels[level] = true;
};
void JsonOutput::endObject() {
    outputStream->print("}");
    level--;
};
void JsonOutput::startArray(const char *key) {
    appendCommaIfRequired();
    outputStream->print("\"");
    outputStream->print(key);
    outputStream->print("\":[");
    level++;
    levels[level] = true;
};
void JsonOutput::endArray() {
    outputStream->print("]");
    level--;
};
void JsonOutput::startJson(AsyncResponseStream *outputStream) {
    this->outputStream = outputStream;
    outputStream->print("{");
    level=0;
    levels[level] = true;
};
void JsonOutput::endJson() {
    outputStream->print("}");
    outputStream = NULL;
};



void CsvOutput::startBlock(AsyncResponseStream *outputStream) {
        this->outputStream = outputStream;
        startRecord("t");
        appendField(millis());
        endRecord();
};

void CsvOutput::endBlock() {
        this->outputStream = NULL;
};

void CsvOutput::startRecord(const char *name) {
    outputStream->print(name);
};

void CsvOutput::endRecord() {
    outputStream->print("\n");
};


void CsvOutput::appendField(const char *value) {
    outputStream->print(",");
    outputStream->print(value);
}
void CsvOutput::appendField(int value) {
    outputStream->print(",");
    outputStream->print(value);
}
void CsvOutput::appendField(double value, int precision) {
    outputStream->print(",");
    outputStream->print(value, precision);
}
void CsvOutput::appendField(unsigned long value) {
    outputStream->print(",");
    outputStream->print(value);
}
void CsvOutput::appendField(uint32_t value) {
    outputStream->print(",");
    outputStream->print(value);
}





    

