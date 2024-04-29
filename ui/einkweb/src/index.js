/*jshint node:false */
"use strict";


(function() {

/*

*/



                    // handler state

    /*
             
             From feed.
                    state.headingTrue = getDouble(props[1]);
                    state.headingMagnetic = getDouble(props[2]);
                    state.faaValid = (props[3]==='V');
                    state.sog = getDouble(props[4]);
                    state.cogt = getDouble(props[5]);
                    state.cogm = getDouble(props[6]);
                    state.variation = getDouble(props[7]);
                    state.fixSecondsSinceMidnight = getDouble(props[8]);
                    state.latitude = getDouble(props[9]);
                    state.longitude = getDouble(props[10]);
                    state.aparentWindAngle = getDouble(props[11]);
                    state.aparentWindSpeed = getDouble(props[12]);
                    state.waterSpeed = getDouble(props[13]);
                    state.roll = getDouble(props[14]);
                    state.daysSince1970 = getDouble(props[15]);
                    state.log = getDouble(props[16]);
                    state.tripLog = getDouble(props[17]);
                    state.pressure = getDouble(props[18]);
                    state.engineSpeed = getDouble(props[19]);
                    state.engineCoolantTemp = getDouble(props[20]);
                } else if (props[0] == 'P') {
                    state.tws = getDouble(props[1]);
                    state.twa = getDouble(props[2]);
                    state.leeway = getDouble(props[3]);
                    state.polarSpeed = getDouble(props[4]);
                    state.polarSpeedRatio = getDouble(props[5]);
                    state.polarVmg = getDouble(props[6]);
                    state.vmg = getDouble(props[7]);
                    state.targetTwa = getDouble(props[8]);
                    state.targetVmg = getDouble(props[9]);
                    state.targetStw = getDouble(props[10]);
                    state.polarVmgRatio = getDouble(props[11]);
                    state.windDirectionTrue = getDouble(props[12]);
                    state.windDirectionMagnetic = getDouble(props[13]);
                    state.oppositeTrackHeadingTrue = getDouble(props[14]);
                    state.oppositeTrackHeadingMagnetic = getDouble(props[15]);
                    state.oppositeTrackTrue = getDouble(props[16]);
                    state.oppositeTrackMagnetic = getDouble(props[17]);

    */


    var layout = new FlowLayout(3,2);
    layout.setPageTitle("Engine");
    layout.append(EInkTextBox.number("engineSpeed","engine","rpm",0));
    layout.append(EInkTextBox.number("altenatorVoltage","alternator","V"));
    layout.append(EInkTextBox.number("engineHours","hours","h", 2, 1/3600));
    layout.append(EInkTextBox.number("engineCoolantTemp","coolant","C", 1, 1,  -273.15));
    layout.append(new EInkEngineStatus("engineStatus"));
    layout.append(EInkTextBox.number("fuelLevel","fuel","%",0)); // should be fuel
    // No need to call new page as its full already.
    //layout.newPage();
    layout.setPageTitle("Batteries");
    layout.append(EInkTextBox.number("engineBatteryVoltage","engine","V"));
    layout.append(EInkTextBox.number("serviceBatteryVoltage","service","V"));
    layout.append(EInkTextBox.number("altenatorVoltage","alternator","V"));
    layout.append(EInkTextBox.number("systemVoltage","engine controls","V"));
    layout.newPage();
    layout.setPageTitle("Environment");
    layout.append(EInkTextBox.number("pressure","n2k","mbar", 1, 0.01, 0));
    layout.append(EInkTextBox.number("cabinTemperature","n2k","C", 1, 1, -273.15));
    layout.append(EInkTextBox.number("humidity","n2k","%RH",1));


    layout.newPage();
    layout.setPageTitle("Temperature");
    layout.append(EInkTextBox.number("engineRoomTemperature","Engine Room","C", 2));
    layout.append(EInkTextBox.number("exhaustTemperature","Exhaust","C", 2));
    layout.append(EInkTextBox.number("alternatorTemperature","Alternator","C", 2));
    layout.append(EInkTextBox.number("a2bTemperature","Charger","C", 2));


    layout.newPage();
    layout.setPageTitle("Performance");
    layout.append(EInkTextBox.number("polarSpeed", 'polar stw',"Kn"));
    layout.append(EInkTextBox.number("vmg", 'polar vmg', "Kn"));
    layout.append(EInkTextBox.number("polarVmg","best polar vmg","Kn"));
    layout.append(EInkTextBox.number("targetStw","target stw","Kn"));




// 0 =  devices not this page 
// done 1 == can engine
// 2 == can nav data
// 3 == can boat data from 
// 4 == can env data
// 5 == can temperature data
// // 6 == temperature 1 wire sensors
// done 7 == pressure bpm280
// done 8 == voltages



/*
                new EInkRelativeAngle('environment.wind.angleApparent','awa', c(),r()),
                new EInkSpeed('environment.wind.speedApparent', 'aws',        c(),r()),
                new EInkSpeed('navigation.speedThroughWater', 'stw',          c(),r()),
                new EInkDistance('environment.depth.belowTransducer', 'dbt',  c(),r()),

                new EInkRelativeAngle('environment.wind.angleTrueWater','twa',c(),r()),
                new EInkSpeed('environment.wind.speedTrue', 'tws',            c(),r()),
                new EInkRelativeAngle('performance.leeway','leeway',c(),r(), undefined, 1),
                new EInkAttitude(c(),r()),

                new EInkSpeed('navigation.speedOverGround', 'sog',            c(),r()),
                new EInkBearing('navigation.courseOverGroundMagnetic', 'cogm',c(),r()),
                new EInkPossition(c(),r()),
                new EInkLog(c(),r()),

                new EInkCurrent(c(),r()),
                new EInkPilot(c(),r()),
                new EInkFix(c(),r()),
                new EInkTemperature('environment.water.temperature','water',c(),r()),

                new EInkBearing('environment.wind.windDirectionMagnetic', 'windM',c(),r()),
                new EInkSpeed('performance.velocityMadeGood', 'vmg',          c(),r()),
                new EInkSys(c(),r()),
                new EInkBearing('navigation.headingMagnetic','hdm',c(),r()),

                new EInkSpeed('performance.polarSpeed', 'polar stw',        c(),r()),
                new EInkSpeed('performance.vmg', 'polar vmg',        c(),r()),
                new EInkSpeed('performance.polarVmg', 'best polar vmg',        c(),r()),
                new EInkSpeed('performance.targetStw', 'target stw',        c(),r()),

                new EInkSpeed('performance.targetVmg', 'target vmg',        c(),r()),
                new EInkBearing('performance.oppositeTrackMagnetic', 'op tack m',c(),r()),
                new EInkBearing('performance.oppositeHeadingMagnetic', 'op head m',c(),r()),
                new EInkRelativeAngle('performance.targetTwa','target twa',c(),r()),

                new EInkRatio('performance.polarSpeedRatio',"polar stw perf", c(), r()),
                new EInkRatio('performance.polarVmgRatio',"polar vmg perf", c(), r())
*/

        var themes = {
            "day": {
                foreground: "black",
                background: "white"
            },
            "night" : {
                foreground: "white",
                background: "black"

            },
            "nightred" : {
                foreground: "red",
                background: "black"
            },
            "nightvision" : {
                foreground: "green",
                background: "black"
            }
        };
        var isPortrait = !(Object.create === undefined);
        var drawingOptions = {
            canvas: document.getElementById("canvas"),
            body: document.getElementsByTagName("body")[0],            
            themes: themes,
            portrait: !isKindle, 
            theme: "night",
            layout: layout
        };
        var drawingContext = new EInkDrawingContext(drawingOptions);
//        console.log("Using DataServer", window.DataServerAddress);

        var updater =  new EInkUpdater({
            url: `${window.DataServerAddress}/api/store`,
            context: drawingContext,
            period: 5000
        });
        updater.update();

        var uiController = new EInkUIController({
            context: drawingContext,
            rotateControl: document.getElementById("rotate"),
            pageControl: document.getElementById("page"),
            themeControl: document.getElementById("theme"),
            rotations: [ "portrate", "landscape"],
            themes: ["day","night","nightred","nightvision"]
        });


        document.getElementById("body").addEventListener("keydown", function(e) {
            debug("got keydown");
        });
        document.getElementById("body").addEventListener("auxclick", function(e) {
            debug("got auxclick");
        });
        document.getElementById("body").addEventListener("keypress", function(e) {
            debug("got keypress");
        });
        document.getElementById("body").addEventListener("scroll", function(e) {
            debug("got scroll");
        });

        drawingContext.render();

})();

