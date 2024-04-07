#include "network.h"
#include <WiFi.h>
#include <SPIFFS.h>
#include "config.h"


void Wifi::begin() {
    if(!SPIFFS.begin(false)){
        outputStream->println("An Error has occurred while mounting SPIFFS");
        return;
    }
    startSTA();
    if ( WiFi.status() != WL_CONNECTED ) {
        outputStream->print("Wifi Failed to connect ");
        startAP();
    } else {
        // Print local IP address and start web server
        outputStream->println("");
        outputStream->println("WiFi connected.");
        outputStream->print("IP Address: ");outputStream->println(WiFi.localIP());
        outputStream->print("Subnet Mask: ");outputStream->println(WiFi.subnetMask());
        outputStream->print("Gateway IP: ");outputStream->println(WiFi.gatewayIP());
        outputStream->print("DNS Server: ");outputStream->println(WiFi.dnsIP());
        softAP = false;

    }
}

IPAddress Wifi::getBroadcastIP() {
    if ( softAP ) {
        return WiFi.softAPBroadcastIP();
    } else {
        return WiFi.broadcastIP();
    }
}

void Wifi::startSTA(String wifi_ssid, String wifi_pass) {
    ssid = wifi_ssid;
    password = wifi_pass;
    ConfigurationFile::get(configurationFile, "wifi.ssid:", ssid);
    loadWifiPower(ssid);
    outputStream->print("Wifi ssid ");outputStream->println(ssid);

    if ( !ConfigurationFile::get(configurationFile, ssid+".password:", password) ) {
        outputStream->println("Warning: no password configured, using default");
    }
    loadIPConfig(ssid);
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid.c_str(), password.c_str());
    for  (int i = 0; i < 30; i++) {
        if ( WiFi.status() == WL_CONNECTED ) {
            // reduce power as all clients are going to be within 5m
            WiFi.setTxPower(maxWifiPower);
            break;
        }
        delay(500);
        outputStream->print(".");
    }    
}

void Wifi::startAP() {
        WiFi.disconnect(true, true);
        WiFi.mode(WIFI_AP);
        password = "nopassword";
        ssid = "boatsys";

        ConfigurationFile::get(configurationFile, "softap.ssid:", ssid);
        ConfigurationFile::get(configurationFile, "softap.password:", password);
        loadWifiPower("softap");
        outputStream->print("Start SoftAP on SSID boatsys PW ");
        outputStream->print(ssid);
        outputStream->print(" PW ");
        outputStream->println(password);
        WiFi.softAP(ssid.c_str(), password.c_str());
        // reduce power as all clients are going to be within 5m
        WiFi.setTxPower(maxWifiPower);

        outputStream->print("IP address: ");
        outputStream->println(WiFi.softAPIP());
        outputStream->println("SoftAP runing.");
        outputStream->print("IP Address: ");outputStream->println(WiFi.softAPIP());
        outputStream->print("Broadcast IP: ");outputStream->println(WiFi.softAPBroadcastIP());
        outputStream->print("Network IP: ");outputStream->println(WiFi.softAPNetworkID());
        outputStream->print("Tx Power: ");outputStream->println(0.25*WiFi.getTxPower());
        softAP = true;
}

// generally 2dbm is plenty for an access point in a few meters.
void Wifi::loadWifiPower(String key) {
    String v;
    if ( ConfigurationFile::get(configurationFile, key+".power:", v) ) {
        if ( v.equals("high") ) {
            maxWifiPower = WIFI_POWER_19_5dBm;
        } else if ( v.equals("med") ) {
            maxWifiPower = WIFI_POWER_11dBm;
        } else if ( v.equals("low") ) {
            maxWifiPower = WIFI_POWER_2dBm;
        }
    } else {
        maxWifiPower = WIFI_POWER_5dBm;
    }
}

void Wifi::loadIPConfig(String key) {
    String v;
    if ( ConfigurationFile::get(configurationFile, key+".ip", v)) {
        IPAddress local_ip;
        local_ip.fromString(v);
        IPAddress subnet(255,255,255,0), 
            gateway(local_ip[0],local_ip[1],local_ip[2],1), 
            dns1(local_ip[0],local_ip[1],local_ip[2],1), 
            dns2;
        dns2 = IPADDR_NONE;
        if (ConfigurationFile::get(configurationFile, key+".netmask", v) ) {
            subnet.fromString(v);
        }
        if (ConfigurationFile::get(configurationFile, key+".gateway", v) ) {
            gateway.fromString(v);
        }
        if (ConfigurationFile::get(configurationFile, key+".dns1", v) ) {
            dns1.fromString(v);
        }
        if (ConfigurationFile::get(configurationFile, key+".dns2", v) ) {
            dns2.fromString(v);
        }
        WiFi.config(local_ip, gateway, subnet, dns1, dns2);
        outputStream->print("Network config loaded for ");
    } else {
#ifdef IP_METHOD
        WiFi.config(WIFI_IP, WIFI_GATEWAY, WIFI_SUBNET, WIFI_DNS1);
        outputStream->println("Using network config defaults.");
#else
        outputStream->print("Using DHCP");
#endif
    }

}

void Wifi::printStatus() {
    if ( softAP ) {
        outputStream->println("Wifi Access Point enabled");
        outputStream->print("SSID:");outputStream->println(ssid);
        outputStream->print("Password:");outputStream->println(password);
        outputStream->print("IP Address:");outputStream->println(WiFi.softAPIP());
        outputStream->print("Broadcast IP: ");outputStream->println(WiFi.softAPBroadcastIP());
        outputStream->print("Network IP: ");outputStream->println(WiFi.softAPNetworkID());
        outputStream->print("Tx Power: ");outputStream->println(0.25*WiFi.getTxPower());
    } else {
        outputStream->println("");
        outputStream->println("WiFi connected.");
        outputStream->print("IP Address: ");outputStream->println(WiFi.localIP());
        outputStream->print("Subnet Mask: ");outputStream->println(WiFi.subnetMask());
        outputStream->print("Gateway IP: ");outputStream->println(WiFi.gatewayIP());
        outputStream->print("DNS Server: ");outputStream->println(WiFi.dnsIP());
        outputStream->print("Broadcast: ");outputStream->println(WiFi.broadcastIP());
        outputStream->print("Tx Power: ");outputStream->println(0.25*WiFi.getTxPower());
    }

}






    

