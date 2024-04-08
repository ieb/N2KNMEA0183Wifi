#include "N2KMessageEncoder.h"


void N2KMessageEncoder::send127258( unsigned char SID, uint8_t _source, uint16_t _daysSince1970, double &_variation) {
}
void N2KMessageEncoder::send127250( unsigned char SID, uint8_t _source, double &_deviation, double &_variation, uint8_t ref) {
}
void N2KMessageEncoder::send127257( unsigned char SID, double &_yaw, double &_pitch, double &_roll) {
}
void N2KMessageEncoder::send128259( unsigned char SID, double &_waterSpeed, double &_groundSpeed, uint8_t  SWRT) {
}
void N2KMessageEncoder::send128267( unsigned char SID, double &_depthBelowTransducer, double &_offset, double &_range) {
}
void N2KMessageEncoder::send128275( unsigned char SID, uint16_t _daysSince1970, double &_secondsSinceMidnight, uint32_t &_log, uint32_t &_tripLog ) {
}
void N2KMessageEncoder::send129029( unsigned char SID, uint16_t _daysSince1970, double &_secondsSinceMidnight, 
                               double &_latitude, double &_longitude, double &_altitude,
                         double &_GNSStype, double &_GNSSmethod,
                        uint8_t _nSatellites, double &_HDOP, double &_PDOP, double &_geoidalSeparation,
                     uint8_t _nReferenceStations, uint8_t _referenceStationType, uint16_t _referenceSationID,
                     double _ageOfCorrection, uint8_t _integrety) {

}
void N2KMessageEncoder::send129026( unsigned char SID, uint8_t _ref, double &_cog, double &_sog) {
}
void N2KMessageEncoder::send129283( unsigned char SID, uint8_t _XTEMode, uint8_t _navigationTerminated, double &_xte) {
}
void N2KMessageEncoder::send130306( unsigned char SID, double &_windSpeed, double &_windAngle, uint8_t _windReference) {
}
void N2KMessageEncoder::send130312( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double &_actualTemperature, double &_setTemperature) {
}
void N2KMessageEncoder::send130316( unsigned char SID, uint8_t _tempInstance, uint8_t _tempSource,
                  double &_actualTemperature, double &_setTemperature) {
}
void N2KMessageEncoder::send130314( unsigned char SID, uint8_t _pressureInstance,
                  uint8_t _pressureSource, double &_pressure) {
}
void N2KMessageEncoder::send127488( uint8_t _engineInstance, uint16_t _engineSpeed,
                  double &_engineBoostPressure, double &_engineTiltTrim) {
}
void N2KMessageEncoder::send127489( double &_engineInstance, double &_engineOilPress,
                  double &_engineOilTemp, double &_engineCoolantTemp, double &_altenatorVoltage,
                  double &_fuelRate, double &_engineHours, double &_engineCoolantPress, double &_engineFuelPress,
                  double &_engineLoad, double &_engineTorque,
                  uint8_t _status1, uint8_t _status2) {
}
void N2KMessageEncoder::send127505( uint8_t &_instance, uint8_t _fluidType, double &_level, double &_capacity) {
}
void N2KMessageEncoder::send127508(unsigned char SID, uint8_t _batteryInstance, double &_batteryVoltage, double &_batteryCurrent,
                  double &batteryTemperature) {
}
void N2KMessageEncoder::send128000( unsigned char SID, double &_leeway) {
}
void N2KMessageEncoder::send129025( double &_latitude, double &_longitude) {
}
void N2KMessageEncoder::send130310( unsigned char SID, double &_waterTemperature,
                   double &_outsideAmbientAirTemperature, double &_atmosphericPressure) {
}
void N2KMessageEncoder::send130311( unsigned char SID, uint8_t _tempSource, double &_temperature,
                     double &_humiditySource, double &_humidity, double &_atmosphericPressure) {
}
void N2KMessageEncoder::send130313( unsigned char SID, uint8_t _humidityInstance,
                       uint8_t _humiditySource, double &_actualHumidity, double &_setHumidity) {
}