#include "NMEA0183Encoder.h"


bool NMEA0183Encoder::doSend(unsigned long &lastSend, unsigned long minPeriod) {
  unsigned long now = millis();
  if ( now-lastSend > minPeriod ) {
    lastSend=now;
    return true;
  }
  return false;
}



void NMEA0183Encoder::checkBuffer(const char * message) {
  if ( strlen(inbuffer) > INBUF_LEN-1 ) {
    Serial.print("Warning: buffer ");
    Serial.print(message);
    Serial.print(" overflow:");
    Serial.print(INBUF_LEN-1);
    Serial.print(" [");
    Serial.print(inbuffer);
    Serial.println("]");
  }
}




void NMEA0183Encoder::append(uint8_t field) {
  if ( field == 0xff ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}

void NMEA0183Encoder::append(int8_t field) {
  if ( field == 0x7f ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}

void NMEA0183Encoder::append(uint16_t field) {
  if ( field == 0xff ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}

void NMEA0183Encoder::append(int16_t field) {
  if ( field == 0x7f ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}
void NMEA0183Encoder::append(uint32_t field) {
  if ( field == 0xff ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}

void NMEA0183Encoder::append(int32_t field) {
  if ( field == 0x7f ) {
    append("");
  } else {
    String v = String(field, 0);
    append(v.c_str());
  }
}

void NMEA0183Encoder::append(double value, double factor, int fixed) {
  // 0.0 to 360.0
  if ( value == -1e9 ) {
    append("");
  } else {
    value = value * factor;
    String v = String(value, fixed);
    append(v.c_str());
  }
}

void NMEA0183Encoder::appendBearing(double bearing, int fixed) {
  // 0.0 to 360.0
  if ( bearing == -1e9 ) {
    append("");
  } else {
    bearing = bearing * 57.2957795131; // rad -> deg 180.0/PI;
    if (bearing < 0 ) bearing = bearing + 360.0;
    else if (bearing > 360 ) bearing = bearing - 360;
    String v = String(bearing, fixed);
    append(v.c_str());
  }
}
void NMEA0183Encoder::appendRelativeAngle(double angle, const char * pos, const char * neg, int fixed) {
  if ( angle == -1e9 ) {
    append("");
    append("");
  } else {
    angle = angle * 57.2957795131; // rad -> deg 180.0/PI;
    if (angle > 180) {
      angle = -(360-angle);
    }
    if ( angle >= 0 ) {
      String v = String(angle, fixed);
      append(v.c_str());
      append(pos);
    } else {
      String v = String(-angle, fixed);
      append(v.c_str());
      append(pos);
    }          
  }
}

void NMEA0183Encoder::appendRelativeSignedAngle(double angle, int fixed) {
  if ( angle == -1e9 ) {
      append("");
  } else {
    angle = angle * 57.2957795131; // rad -> deg 180.0/PI; 
    if (angle > 180) {
      angle = -(360-angle);
    }
    String v = String(angle, fixed);
    append(v.c_str());
  }
}

void NMEA0183Encoder::appendTimeUTC(double secondsSinceMidnight) {
  int hh = (int)(secondsSinceMidnight/3600.0);
  int mm = (int)((secondsSinceMidnight-(hh*3600.0))/60.0);
  double ss = secondsSinceMidnight-(hh*3600.0)-(mm*60.0);
  sprintf(inbuffer, "%02d%02d%05.2f", hh, mm, ss);
  checkBuffer("utc");
  append(inbuffer);
}

void NMEA0183Encoder::appendLatitude(double latitude) {
  //ddmm.mmmmm
  const char * ns = "N";
  if ( latitude < 0 ) {
    ns = "S";
    latitude = -latitude;
  }
  int dd = (int)latitude;
  double mm = (latitude - dd)*60.0;
  sprintf(inbuffer, "%02d%08.5f", dd, mm);
  checkBuffer("latitude");
  append(inbuffer);
  append(ns);
}
void NMEA0183Encoder::appendLongitude(double longitude) {
  // dddmm.mmmmm
  const char * ew = "E";
  if ( longitude < 0 ) {
    ew = "W";
    longitude = -longitude;
  }
  int dd = (int)longitude;
  double mm = (longitude - dd)*60.0;
  sprintf(inbuffer, "%03d%08.5f", dd, mm);
  checkBuffer("latitude");
  append(inbuffer);
  append(ew);
}

void NMEA0183Encoder::appendDMY(uint16_t daysSince1970) {
  time_t d = ((uint32_t)(daysSince1970)*3600UL*24UL);
  struct tm * tmd = gmtime(&d);
  sprintf(inbuffer, "%02d,%02d,%04d",tmd->tm_mday, tmd->tm_mon+1, tmd->tm_year+1900);
  checkBuffer("dmy");
  append(inbuffer);
}
void NMEA0183Encoder::appendDate(uint16_t daysSince1970) {
  time_t d = ((uint32_t)(daysSince1970)*3600UL*24UL);
  struct tm * tmd = gmtime(&d);
  sprintf(inbuffer, "%02d%02d%02d",tmd->tm_mday,tmd->tm_mon+1,tmd->tm_year%100);
  append(inbuffer);
}


void NMEA0183Encoder::start(const char * key) {
  p = 0;

  while(key[p] != '\0' && p < (OUTBUF_LEN-5)) {
    buffer[p] = key[p];
    p++;
  }
  buffer[p] = '\0';
}
void NMEA0183Encoder::append(const char *field) {
  buffer[p++] = ',';
  int n = 0;
  while(field[n] != '\0' && p < (OUTBUF_LEN-5)) {
    buffer[p++] = field[n++]; 
  }
  buffer[p] = '\0';
}

void NMEA0183Encoder::appendBinary(const unsigned char *data, int len) {
  append((uint16_t)len);
  buffer[p++] = ',';  
  int i = 0;
  while (i < len && p < (OUTBUF_LEN-6) ){
      buffer[p++] = NMEA0183Encoder::asHex[(data[i]>>4)&0x0f];
      buffer[p++] = NMEA0183Encoder::asHex[(data[i])&0x0f];
      i++;
  }
  if ( p >= (OUTBUF_LEN-6) ) {
    Serial.println("Field Truncated");
  }
  buffer[p] = '\0';
}




const char * NMEA0183Encoder::end() {
  uint8_t checkSum = 0;
  // protect against overflow of the buffer.
  if (p > (OUTBUF_LEN-4)) {
    p = OUTBUF_LEN-4;
  }
  int i = 1;
  for (; i < p && buffer[i] != '\0'; i++) {
    checkSum^=buffer[i];
  }
  buffer[i++] = '*';
  buffer[i++] = NMEA0183Encoder::asHex[(checkSum>>4)&0x0f];
  buffer[i++] = NMEA0183Encoder::asHex[(checkSum)&0x0f];
  buffer[i] = '\0';
  return &buffer[0];
}

