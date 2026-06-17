#pragma once


#include <Arduino.h>

class FlowMeter {
public:
	void update(const uint8_t* payload, size_t len);
	double getFlowRate() { return flowRate;}
	double getFlowTemp() { return upstreamTemp; }
	uint8_t getStatus() { return status; }
private:
	uint8_t status;
	double flowRate;
	double upstreamTemp;
	double downstreamTemp;
	double voltage;
	double power;

	void readU16(const uint8_t* buf, uint8_t &pos, double &val, double scale);



};