

#include "N2KCollector.h"
#include <TimeLib.h>



void N2KCollector::HandleMsg(const tN2kMsg &N2kMsg) {
      switch(N2kMsg.PGN) {
//        case 60928L: AddressClaim(N2kMsg); break;
//        case 126992L: SystemTime(N2kMsg); break;
        case 127245L: Rudder(N2kMsg); break;
        case 127250L: Heading(N2kMsg); break;
        case 127257L: Attitude(N2kMsg); break;
        case 127488L: EngineRapid(N2kMsg); break;
        case 127489L: EngineDynamicParameters(N2kMsg); break;
//        case 127493L: TransmissionParameters(N2kMsg); break;
//        case 127497L: TripFuelConsumption(N2kMsg); break;
//        case 127501L: BinaryStatus(N2kMsg); break;
        case 127505L: FluidLevel(N2kMsg); break;
//        case 127506L: DCStatus(N2kMsg); break;
        case 127508L: DCBatteryStatus(N2kMsg); break;
//        case 127513L: BatteryConfigurationStatus(N2kMsg); break;
        case 128259L: Speed(N2kMsg); break;
        case 128267L: WaterDepth(N2kMsg); break;
        case 129026L: COGSOG(N2kMsg); break;
        case 129029L: GNSS(N2kMsg); break;
 //       case 129033L: LocalOffset(N2kMsg); break;
 //       case 129045L: UserDatumSettings(N2kMsg); break;
 //       case 129540L: GNSSSatsInView(N2kMsg); break;
        case 130310L: OutsideEnvironmental(N2kMsg); break;
        case 130311L: EnvironmentalParameters(N2kMsg); break;
        case 130312L: Temperature(N2kMsg); break;
        case 130313L: Humidity(N2kMsg); break;
        case 130314L: Pressure(N2kMsg); break;
        case 130316L: TemperatureExt(N2kMsg); break;

        case 129283L: Xte(N2kMsg); break;
        case 127258L: MagneticVariation(N2kMsg); break;
        case 130306L: WindSpeed(N2kMsg); break;
        case 128275L: Log(N2kMsg); break;
        case 129025L: LatLon(N2kMsg); break;
        case 128000L: Leeway(N2kMsg); break;

      }
}

void N2KCollector::saveFailed(const tN2kMsg &N2kMsg, byte instance) {
    outputStream->print("Failed to save PGN: "); 
    outputStream->print(N2kMsg.PGN);
    if ( instance != 255 ) {
        outputStream->print(" instance ");
        outputStream->print(instance);
    }
    outputStream->print(" from "); 
    outputStream->println(N2kMsg.Source);
}
void N2KCollector::parseFailed(const tN2kMsg &N2kMsg) {
    outputStream->print("Failed to parse PGN: "); 
    outputStream->print(N2kMsg.PGN);
    outputStream->print(" from "); 
    outputStream->println(N2kMsg.Source);
}



void N2KCollector::Attitude(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    double Yaw;
    double Pitch;
    double Roll;
    
    if (ParseN2kAttitude(N2kMsg,SID,Yaw,Pitch,Roll) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_ATTITUDE_SOURCES; i++) {
                if ( attitude[i].use(N2kMsg.Source, i, reuse) ) {
                    attitude[i].yaw = Yaw;
                    attitude[i].pitch = Pitch;
                    attitude[i].roll = Roll;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::FluidLevel(const tN2kMsg &N2kMsg) {
    unsigned char Instance;
    tN2kFluidType FluidType;
    double Level=0;
    double Capacity=0;

    if (ParseN2kFluidLevel(N2kMsg,Instance,FluidType,Level,Capacity) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_FLUID_LEVEL_SOURCES; i++) {
                if ( fluidLevel[i].use(N2kMsg.Source, Instance, reuse) ) {
                    fluidLevel[i].fluidType = FluidType;
                    fluidLevel[i].level = Level;
                    fluidLevel[i].capacity = Capacity;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}



void N2KCollector::EngineRapid(const tN2kMsg &N2kMsg) {
    unsigned char EngineInstance;
    double EngineSpeed;
    double EngineBoostPressure;
    int8_t EngineTiltTrim;
    
    if (ParseN2kEngineParamRapid(N2kMsg,EngineInstance,EngineSpeed,EngineBoostPressure,EngineTiltTrim) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_ENGINE_SOURCES; i++) {
                if ( engine[i].use(N2kMsg.Source, EngineInstance, reuse) ) {
                    engine[i].speed = EngineSpeed;
                    engine[i].boostPressure = EngineBoostPressure;
                    engine[i].tiltTrim = EngineTiltTrim;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}
void N2KCollector::EngineDynamicParameters(const tN2kMsg &N2kMsg) {
    unsigned char EngineInstance;
    double EngineOilPress;
    double EngineOilTemp;
    double EngineCoolantTemp;
    double AltenatorVoltage;
    double FuelRate;
    double EngineHours;
    double EngineCoolantPress;
    double EngineFuelPress; 
    int8_t EngineLoad;
    int8_t EngineTorque;
    tN2kEngineDiscreteStatus1 Status1;
    tN2kEngineDiscreteStatus2 Status2;
    
    if (ParseN2kEngineDynamicParam(N2kMsg,EngineInstance,EngineOilPress,EngineOilTemp,EngineCoolantTemp,
                                 AltenatorVoltage,FuelRate,EngineHours,
                                 EngineCoolantPress,EngineFuelPress,
                                 EngineLoad,EngineTorque,Status1,Status2) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_ENGINE_SOURCES; i++ ) {
                if ( engine[i].use(N2kMsg.Source, EngineInstance, reuse)) {
                    engine[i].OilPress = EngineOilPress;
                    engine[i].OilTemp = EngineOilTemp;
                    engine[i].CoolantTemp = EngineCoolantTemp;
                    engine[i].AltenatorVoltage = AltenatorVoltage;
                    engine[i].FuelRate = FuelRate;
                    engine[i].Hours = EngineHours;
                    engine[i].CoolantPress = EngineCoolantPress;
                    engine[i].FuelPress = EngineFuelPress; 
                    engine[i].Load = EngineLoad;
                    engine[i].Torque = EngineTorque;
                    engine[i].Status1 = Status1.Status;
                    engine[i].Status2 = Status2.Status;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::Heading(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    tN2kHeadingReference HeadingReference;
    double Heading;
    double Deviation;
    double Variation;
    
    if (ParseN2kHeading(N2kMsg,SID,Heading,Deviation,Variation,HeadingReference) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i< MAX_HEADDING_SOURCES; i++) {
                if ( heading[i].use(N2kMsg.Source, i, reuse)) {
                    heading[i].heading = Heading;
                    heading[i].deviation = Deviation;
                    heading[i].variation = Variation;
                    heading[i].reference = HeadingReference;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::COGSOG(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    tN2kHeadingReference HeadingReference;
    double COG;
    double SOG;
    
    if (ParseN2kCOGSOGRapid(N2kMsg,SID,HeadingReference,COG,SOG) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_COGSOG_SOURCES; i++) {
                if ( cogSog[i].use(N2kMsg.Source, i, reuse)) {
                    cogSog[i].cog = COG;
                    cogSog[i].sog = SOG;
                    cogSog[i].reference = HeadingReference;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::GNSS(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    uint16_t DaysSince1970;
    double SecondsSinceMidnight; 
    double Latitude;
    double Longitude;
    double Altitude; 
    tN2kGNSStype GNSStype;
    tN2kGNSSmethod GNSSmethod;
    unsigned char nSatellites;
    double HDOP;
    double PDOP;
    double GeoidalSeparation;
    unsigned char nReferenceStations;
    tN2kGNSStype ReferenceStationType;
    uint16_t ReferenceSationID;
    double AgeOfCorrection;

    if (ParseN2kGNSS(N2kMsg,SID,DaysSince1970,SecondsSinceMidnight,
                  Latitude,Longitude,Altitude,
                  GNSStype,GNSSmethod,
                  nSatellites,HDOP,PDOP,GeoidalSeparation,
                  nReferenceStations,ReferenceStationType,ReferenceSationID,
                  AgeOfCorrection) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_GNSS_SOURCES; i++) {
                if ( gnss[i].use(N2kMsg.Source, i, reuse)) {
                    gnss[i].daysSince1970 = DaysSince1970;
                    gnss[i].secondsSinceMidnight = SecondsSinceMidnight;
                    gnss[i].latitude = Latitude;
                    gnss[i].longitude = Longitude;
                    gnss[i].altitude = Altitude;
                    gnss[i].type = GNSStype;
                    gnss[i].method = GNSSmethod;
                    gnss[i].nSatellites = nSatellites;
                    gnss[i].HDOP = HDOP;
                    gnss[i].PDOP = PDOP;
                    gnss[i].geoidalSeparation = GeoidalSeparation;
                    gnss[i].nReferenceStations = nReferenceStations;
                    gnss[i].referenceStationType = ReferenceStationType;
                    gnss[i].referenceStationID = ReferenceSationID;
                    gnss[i].ageOfCorrection = AgeOfCorrection;
                    return;
                }
            }

            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::EnvironmentalParameters(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    double Temperature;
    double Humidity;
    double AtmosphericPressure;
    tN2kTempSource TempSource;
    tN2kHumiditySource HumiditySource;
    

    if ( ParseN2kEnvironmentalParameters(N2kMsg, SID, TempSource,Temperature,
                    HumiditySource, Humidity, AtmosphericPressure) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_ENVIRONMENTAL_PARAMS_SOURCES; i++) {
                if ( environmentalParams[i].use(N2kMsg.Source, i, reuse) ) {
                    environmentalParams[i].temperatureSource = TempSource;
                    environmentalParams[i].humiditySource = HumiditySource;
                    environmentalParams[i].temperature = Temperature;
                    environmentalParams[i].humidity = Humidity;
                    environmentalParams[i].atmosphericPressure = AtmosphericPressure;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
    

}

void N2KCollector::OutsideEnvironmental(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    double WaterTemperature;
    double OutsideAmbientAirTemperature;
    double AtmosphericPressure;
    
    if (ParseN2kOutsideEnvironmentalParameters(N2kMsg,SID,WaterTemperature,OutsideAmbientAirTemperature,AtmosphericPressure) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_OUTSIDE_ENVIRONMENTAL_SOURCES; i++) {
                if ( outsideEnvironmental[i].use(N2kMsg.Source, i, reuse) ) {
                    outsideEnvironmental[i].waterTemperature = WaterTemperature;
                    outsideEnvironmental[i].outsideAmbientAirTemperature = OutsideAmbientAirTemperature;
                    outsideEnvironmental[i].atmosphericPressure = AtmosphericPressure;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::Temperature(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    unsigned char TempInstance;
    tN2kTempSource TempSource;
    double ActualTemperature;
    double SetTemperature;
    
    if (ParseN2kTemperature(N2kMsg,SID,TempInstance,TempSource,ActualTemperature,SetTemperature) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_TEMPERATURE_SOURCES; i++ ) {
                if ( temperature[i].use(N2kMsg.Source, TempInstance, reuse)) {
                    temperature[i].sourceSensor = TempSource;
                    temperature[i].actual = ActualTemperature;
                    temperature[i].set = SetTemperature;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::Humidity(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    unsigned char Instance;
    tN2kHumiditySource HumiditySource;
    double ActualHumidity,SetHumidity;
    
    if ( ParseN2kHumidity(N2kMsg,SID,Instance,HumiditySource,ActualHumidity,SetHumidity) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_HUMIDITY_SOURCES; i++ ) {
                if ( humidity[i].use(N2kMsg.Source, Instance, reuse)) {
                    humidity[i].sourceSensor = HumiditySource;
                    humidity[i].actual = ActualHumidity;
                    humidity[i].set = SetHumidity;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::Pressure(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    unsigned char Instance;
    tN2kPressureSource PressureSource;
    double ActualPressure;
    
    if ( ParseN2kPressure(N2kMsg,SID,Instance,PressureSource,ActualPressure) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_PRESSURE_SOURCES; i++) {
                if (pressure[i].use(N2kMsg.Source, Instance, reuse)) {
                    pressure[i].sourceSensor = PressureSource;
                    pressure[i].actual = ActualPressure;
                    // store as mbar in history.
                    pressure[i].storeHistory(ActualPressure*0.01);
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::TemperatureExt(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    unsigned char TempInstance;
    tN2kTempSource TempSource;
    double ActualTemperature;
    double SetTemperature;
    
    if (ParseN2kTemperatureExt(N2kMsg,SID,TempInstance,TempSource,ActualTemperature,SetTemperature) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_TEMPERATURE_SOURCES; i++) {
                if ( temperatureExt[i].use(N2kMsg.Source, TempInstance, reuse)) {
                    temperatureExt[i].sourceSensor = TempSource;
                    temperatureExt[i].actual = ActualTemperature;
                    temperatureExt[i].set = SetTemperature;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::DCBatteryStatus(const tN2kMsg &N2kMsg) {
    byte BatteryInstance;
    double BatteryVoltage;
    double BatteryCurrent;
    double BatteryTemperature;
    unsigned char SID;

    if (ParseN2kDCBatStatus(N2kMsg, BatteryInstance,BatteryVoltage,BatteryCurrent,BatteryTemperature,SID)) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_BATTERY_SOURCES; i++) {
                if ( dcBattery[i].use(N2kMsg.Source, BatteryInstance, reuse)) {
                    dcBattery[i].voltage = BatteryVoltage;
                    dcBattery[i].current = BatteryCurrent;
                    dcBattery[i].temperature = BatteryTemperature;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}


//*****************************************************************************
void N2KCollector::Speed(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    double STW;
    double SOG;
    tN2kSpeedWaterReferenceType SWRT;

    if (ParseN2kBoatSpeed(N2kMsg,SID,STW,SOG,SWRT) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_SPEED_SOURCES; i++) {
                if ( speed[i].use(N2kMsg.Source, i, reuse)) {
                    speed[i].stw = STW;
                    speed[i].sog = SOG;
                    speed[i].swrt = SWRT;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

//*****************************************************************************
void N2KCollector::WaterDepth(const tN2kMsg &N2kMsg) {
    unsigned char SID;
    double DepthBelowTransducer;
    double Offset;

    if (ParseN2kWaterDepth(N2kMsg,SID,DepthBelowTransducer,Offset) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_WATER_DEPTH_SOURCES; i++) {
                if ( waterDepth[i].use(N2kMsg.Source, i, reuse)) {
                    if ( N2kIsNA(Offset) ) {
                        waterDepth[i].offset = 0;
                    } else {
                        waterDepth[i].offset = Offset;
                    }
                    waterDepth[i].depthBelowTransducer = DepthBelowTransducer;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::Rudder(const tN2kMsg &N2kMsg) {
    unsigned char Instance;
    tN2kRudderDirectionOrder RudderDirectionOrder;
    double RudderPosition;
    double AngleOrder;
    
    if (ParseN2kRudder(N2kMsg,RudderPosition,Instance,RudderDirectionOrder,AngleOrder) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_RUDDER_SOURCES; i++) {
                if ( rudder[i].use(N2kMsg.Source, Instance, reuse)) {
                    rudder[i].position = RudderPosition;
                    rudder[i].directionOrder = RudderDirectionOrder;
                    rudder[i].angleOrder = AngleOrder;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::Xte(const tN2kMsg &N2kMsg) {
    // 129283L
    unsigned char Instance;
    tN2kXTEMode xteMode;
    bool navTerminated;
    double xte;

    
    if (ParseN2kXTE(N2kMsg,Instance, xteMode, navTerminated, xte) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_XTE_SOURCES; i++) {
                if ( this->xte[i].use(N2kMsg.Source, Instance, reuse)) {
                    this->xte[i].xte = xte;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::MagneticVariation(const tN2kMsg &N2kMsg) {
    // 127258L
    unsigned char Instance;
    tN2kMagneticVariation source;
    uint16_t daysSince1970;
    double variation;
    // captured data
    // 228787 : Pri:6 PGN:127258 Source:3 Dest:255 Len:8 Data:FF,FF,FF,FF,FF,7F,FF,FF
    // SID FF
    // Source 0F
    // days FF,FF
    // variaton FF,7F
    // ignore instance.
    

    if (ParseN2kMagneticVariation(N2kMsg,Instance,source,daysSince1970, variation) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_VARIATION_SOURCES; i++) {
                if (this->variation[i].use(N2kMsg.Source, i, reuse)) {
                    this->variation[i].daysSince1970 = daysSince1970;
                    this->variation[i].variation = variation;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}


void N2KCollector::WindSpeed(const tN2kMsg &N2kMsg) {
    // 130306L
    unsigned char Instance;
    double windSpeed;
    double windAngle;
    tN2kWindReference windReference;
    // captured data shows an iTC5 outputs only apparent wind, nothing else on the bus
    // 239097 : Pri:2 PGN:130306 Source:105 Dest:255 Len:8 Data:0,9A,0,20,DA,FA,FF,FF
    // SID = 0
    // windspeed 9A00
    // wind Andle 20DA
    // windReference FA  == 0b11111010 == 2 aparent

    if (ParseN2kWindSpeed(N2kMsg,Instance,windSpeed, windAngle, windReference) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_WIND_SOURCES; i++) {
                if ( wind[i].use(N2kMsg.Source,Instance,reuse)) {
                    wind[i].windSpeed = windSpeed;
                    wind[i].windAngle = (windAngle>PI)?windAngle-2*PI:windAngle;
                    wind[i].windReference = windReference;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::Log(const tN2kMsg &N2kMsg) {
    // 128275L
    uint16_t daysSince1970;
    double secondsSinceMidnight;
    uint32_t log;
    uint32_t tripLog;

// 236928 : Pri:6 PGN:128275 Source:105 Dest:255 Len:14 Data:FF,FF,FF,FF,FF,FF,FC,85,9,0,FC,85,9,0

    if (ParseN2kDistanceLog(N2kMsg,daysSince1970,secondsSinceMidnight,log,tripLog) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for ( int i = 0; i < MAX_LOG_SOURCES; i++) {
                if ( this->log[i].use(N2kMsg.Source, i, reuse)) {
                    this->log[i].daysSince1970 = daysSince1970;
                    this->log[i].secondsSinceMidnight = secondsSinceMidnight;
                    this->log[i].log = log;
                    this->log[i].tripLog = tripLog;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

void N2KCollector::LatLon(const tN2kMsg &N2kMsg) {
    // 129025L
    double latitude;
    double longitude;
    
 
    if (ParseN2kPositionRapid(N2kMsg,latitude, longitude) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_POSSITION_SOURCES; i++) {
                if ( possition[i].use(N2kMsg.Source, i, reuse)) {
                    possition[i].latitude = latitude;
                    possition[i].longitude = longitude;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}

bool N2KCollector::getPressure( double &_pressure, int16_t &age) {
    unsigned long now = millis();
    if (pressure[0].source == 255) {
        return false;
    } else {
        _pressure = pressure[0].actual;
        age = (now - pressure[0].lastModified)/1000;
        return true;
    }
}



bool N2KCollector::getLatLong(double &latitude, double &longitude, int16_t &age) {
    PossitionData *possition = getPossition();
    GnssData *gnss = getGnss();
    unsigned long now = millis();

    if ( possition != NULL && gnss != NULL ) {
        if ( (now-possition->lastModified) < (now-gnss->lastModified) ) {
            latitude = possition->latitude;
            longitude = possition->longitude;
            age = (now - possition->lastModified)/1000;
            return true;
        } else {
            latitude = gnss->latitude;
            longitude = gnss->longitude;
            age = (now - gnss->lastModified)/1000;
            return true;
        }
    } else if (  possition != NULL ) {
        latitude = possition->latitude;
        longitude = possition->longitude;
        age = (now - possition->lastModified)/1000;
        return true;
    } else if ( gnss != NULL ) {
        latitude = gnss->latitude;
        longitude = gnss->longitude;
        age = (now - gnss->lastModified)/1000;
        return true;
    }
    return false;
}





void N2KCollector::Leeway(const tN2kMsg &N2kMsg) {
    // 128000L
    unsigned char Instance;
    double leeway;


    if (ParseN2kLeeway(N2kMsg, Instance, leeway) ) {
        bool reuse = false;
        for (int u = 0; u < 2; u++) {
            for (int i = 0; i < MAX_LEEWAY_SOURCES; i++) {
                if ( this->leeway[i].use(N2kMsg.Source, Instance, reuse)) {
                    this->leeway[i].leeway = leeway;
                    return;
                }
            }
            reuse = true;
        }
        saveFailed(N2kMsg);
    } else {
        parseFailed(N2kMsg);
    }
}


LogData * N2KCollector::getLog() {
    unsigned long lm = 0;
    LogData *selected = NULL;
    for (int i = 0; i < MAX_LOG_SOURCES; i++) {
        if (log[i].source != 255 && log[i].lastModified > lm ) {
            lm = log[i].lastModified;
            selected = &log[i];
        }
    }
    return selected;
};

WindData * N2KCollector::getWindInstance(byte instance, tN2kWindReference reference) {
    unsigned long lm = 0;
    WindData *selected = NULL;
    for (int i = -0; i < MAX_WIND_SOURCES; i++) {
        if ( wind[i].source != 255 && wind[i].instance == instance && wind[i].windReference == reference && wind[i].lastModified > lm ) {
            lm = wind[i].lastModified;
            selected = &wind[i];
            return &wind[i];
        }
    }
    return selected;
};


EngineData * N2KCollector::getEngineInstance(byte instance) {
    unsigned long lm = 0;
    EngineData *selected = NULL;
    for (int i = 0; i < MAX_ENGINE_SOURCES; i++) {
        if ( engine[i].source != 255 && engine[i].instance == instance && engine[i].lastModified > lm ) {
            lm = engine[i].lastModified;
            selected = &engine[i];
        }
    }
    return selected;
};
FluidLevelData * N2KCollector::getFluidLevelInstance(byte instance) {
    unsigned long lm = 0;
    FluidLevelData *selected = NULL;
    for (int i = -0; i < MAX_FLUID_LEVEL_SOURCES; i++) {
        if ( fluidLevel[i].source != 255 && fluidLevel[i].instance == instance &&  fluidLevel[i].lastModified > lm) {
            lm = fluidLevel[i].lastModified;
            selected = &fluidLevel[i];
        }
    }
    return selected;
};

PossitionData * N2KCollector::getPossition() {
    unsigned long lm = 0;
    PossitionData *selected = NULL;
    for (int i = 0; i < MAX_POSSITION_SOURCES; i++) {
        if (possition[i].source != 255  && possition[i].lastModified > lm ) {
            lm = possition[i].lastModified;
            selected = &possition[i];
        }
    }
    return selected;
};

GnssData * N2KCollector::getGnss() {
    unsigned long lm = 0;
    GnssData *selected = NULL;
    for (int i = 0; i < MAX_GNSS_SOURCES; i++) {
        if (gnss[i].source != 255 && gnss[i].lastModified > lm ) {
            lm = gnss[i].lastModified;
            selected = &gnss[i];
        }
    }
    return selected;
};

CogSogData * N2KCollector::getCogSog() {
    unsigned long lm = 0;
    CogSogData *selected = NULL;
    for (int i = 0; i < MAX_COGSOG_SOURCES; i++) {
        if (cogSog[i].source != 255 && cogSog[i].lastModified > lm ) {
            lm = cogSog[i].lastModified;
            selected = &cogSog[i];
        }
    }
    return selected;
};



PressureData * N2KCollector::getAtmosphericPressure() {
    if ( pressure[0].source != 255 && pressure[0].lastModified > 0 ) {
        return &pressure[0];
    } else {
        return NULL;
    }
}
SpeedData * N2KCollector::getSpeed() {
    unsigned long lm = 0;
    SpeedData *selected = NULL;
    for (int i = 0; i < MAX_SPEED_SOURCES; i++) {
        if (speed[i].source != 255 && speed[i].lastModified > lm ) {
            lm = speed[i].lastModified;
            selected = &speed[i];
        }
    }
    return selected;
};

HeadingData * N2KCollector::getHeading() {
    unsigned long lm = 0;
    HeadingData *selected = NULL;
    for (int i = 0; i < MAX_HEADDING_SOURCES; i++) {
        if (heading[i].source != 255 && heading[i].lastModified > lm ) {
            lm = heading[i].lastModified;
            selected = &heading[i];
        }
    }
    return selected;
};

VariationData * N2KCollector::getVariation() {
    unsigned long lm = 0;
    VariationData *selected = NULL;
    for (int i = 0; i < MAX_VARIATION_SOURCES; i++) {
        if (variation[i].source != 255 && variation[i].lastModified > lm ) {
            lm = variation[i].lastModified;
            selected = &variation[i];
        }
    }
    return selected;
};

AttitudeData * N2KCollector::getAttitude() {
    unsigned long lm = 0;
    AttitudeData *selected = NULL;
    for (int i = 0; i < MAX_ATTITUDE_SOURCES; i++) {
        if (attitude[i].source != 255 && attitude[i].lastModified > lm ) {
            lm = attitude[i].lastModified;
            selected = &attitude[i];
        }
    }
    return selected;
};


WaterDepthData * N2KCollector::getWaterDepth() {
    unsigned long lm = 0;
    WaterDepthData *selected = NULL;
    for (int i = 0; i < MAX_WATER_DEPTH_SOURCES; i++) {
        if (waterDepth[i].source != 255 && waterDepth[i].lastModified > lm ) {
            lm = waterDepth[i].lastModified;
            selected = &waterDepth[i];
        }
    }
    return selected;
};

WindData * N2KCollector::getAparentWind() {
    unsigned long lm = 0;
    WindData *selected = NULL;
    for (int i = -0; i < MAX_WIND_SOURCES; i++) {
        if ( wind[i].source != 255 && wind[i].windReference == N2kWind_Apparent && wind[i].lastModified > lm ) {
            lm = wind[i].lastModified;
            selected = &wind[i];
            return &wind[i];
        }
    }
    return selected;
};

FluidLevelData * N2KCollector::getFuelLevel() {
    unsigned long lm = 0;
    FluidLevelData *selected = NULL;
    for (int i = -0; i < MAX_FLUID_LEVEL_SOURCES; i++) {
        if ( fluidLevel[i].source != 255 && fluidLevel[i].fluidType == N2kft_Fuel &&  fluidLevel[i].lastModified > lm) {
            lm = fluidLevel[i].lastModified;
            selected = &fluidLevel[i];
        }
    }
    return selected;
};

DcBatteryData * N2KCollector::getBatteryInstance(byte instance) {
    unsigned long lm = 0;
    DcBatteryData *selected = NULL;
    for (int i = -0; i < MAX_BATTERY_SOURCES; i++) {
        if ( dcBattery[i].source != 255 && dcBattery[i].instance == instance &&  dcBattery[i].lastModified > lm) {
            lm = dcBattery[i].lastModified;
            selected = &dcBattery[i];
        }
    }
    return selected;
};




