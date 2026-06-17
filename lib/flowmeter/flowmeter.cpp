#include "flowmeter.h"

#define TAG "flowmeter"

void FlowMeter::readU16(const uint8_t* buf, uint8_t &pos, double &val, double scale) {
	uint16_t raw = buf[pos] | ((uint16_t)buf[pos + 1] << 8);
	pos += 2;
	if (raw == 0xFFFF) {
		val = -1e9;
	} else {
		val = scale*raw;
	}
}

void FlowMeter::update(const uint8_t* payload, size_t len) {
	if (len == 11) {
		uint8_t pos = 0;
		status = payload[pos++];
		readU16(payload, pos, flowRate, 0.01);
		readU16(payload, pos, upstreamTemp, 0.01);
		readU16(payload, pos, downstreamTemp, 0.01);
		readU16(payload, pos, voltage, 0.01);
		readU16(payload, pos, power, 0.01);		
	} else {
		ESP_LOGW(TAG, "Flowmeter update size wrong: %d, expected 11", len);
	}
}
