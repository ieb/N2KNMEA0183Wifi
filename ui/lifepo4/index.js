
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/lifepo4/bmsbleworker.js', { scope: '/lifepo4/', type: 'module' });
}



window.addEventListener("load", () => {
    const bleReader = new JDBBMSReader();
    const timeSeriesManager = new TimeSeriesManager(bleReader);

    const voltagesGraph = new VoltagesGraph();
    const cellVoltageGraph =  new CellVoltagesGraph();
    const currentGraph =  new CurrentGraph();
    const temperatureGraph =  new TemperatureGraph();
    const stateOfChargeGraph =  new StateOfChargeGraph();
    const chargeRemainingGraph =  new ChargeRemainingGraph();


    document.getElementById('connect').addEventListener("click", bleReader.connectBMS);
    document.getElementById('disconnect').addEventListener("click", bleReader.disconnectBMS);


    const setInnerHtmlById = (id, value) => {
        const el = document.getElementById(id);
        if ( el ) {
            el.innerHTML = value;
        } else {
            console.log("ID Not found ",id)
        }
    };
    const setClass = (id, value, classOn, classOff) => {
        const el = document.getElementById(id);
        if ( el ) {
            const classes = el.getAttribute("class") || "";
            const classList  = classes.split(" ")
                .filter((className) => { return (className !== classOn && className != classOff); });
            classList.push(value?classOn:classOff);
            el.setAttribute("class",classList.join(" "));
        } else {
            console.log("ID Not found ",id)
        }
    };

    bleReader.on('connected', (connected) => {
        if ( connected ) {
            timeSeriesManager.start();
        } else {
            timeSeriesManager.stop();
        }
        setClass('connect',connected,'hidden','');
        setClass('disconnect',connected,'','hidden');
    });

    bleReader.on("statusUpdate", (statusUpdate) => {
        setInnerHtmlById("status.voltage", statusUpdate.voltage.toFixed(2));
        setInnerHtmlById("status.current", statusUpdate.current.toFixed(1));
        setInnerHtmlById("status.capacity.stateOfCharge", statusUpdate.capacity.stateOfCharge.toFixed(0));
        setInnerHtmlById("status.packBalCap", statusUpdate.packBalCap.toFixed(0));
        setInnerHtmlById("status.capacity.fullCapacity", statusUpdate.capacity.fullCapacity.toFixed(0));
        setClass("status.charging", statusUpdate.FETStatus.charging==1, "enabled", "disabled");
        setClass("status.discharging", statusUpdate.FETStatus.discharging==1, "enabled", "disabled");
        setInnerHtmlById("status.chargeCycles", statusUpdate.chargeCycles);
        setInnerHtmlById("status.productionDate", statusUpdate.productionDate.toDateString());
        setInnerHtmlById("status.bmsSWVersion", statusUpdate.bmsSWVersion);
        setInnerHtmlById("status.numberOfCells", statusUpdate.numberOfCells.toFixed(0));
        setInnerHtmlById("status.tempSensorCount", statusUpdate.tempSensorCount.toFixed(0));
        setInnerHtmlById("status.chemistry", statusUpdate.chemistry);
        for (var i = 0; i < statusUpdate.balanceActive.length; i++) {
            setClass('status.balanceActive'+i,statusUpdate.balanceActive[i]==1, "enabled", "disabled");
        }
        for (var i = 0; i < statusUpdate.tempSensorValues.length; i++) {
            setInnerHtmlById('status.tempSensorValues'+i,statusUpdate.tempSensorValues[i].toFixed(1));
        }
        for( var k in statusUpdate.currentErrors) {
            setClass('status.errors.'+k, statusUpdate.currentErrors[k]==1, "enabled", "disabled");
        }
        setInnerHtmlById("status.lastUpdate", (new Date()).toString());

    });
    bleReader.on("cellUpdate", (cellUpdate) => {
        var cellMax = cellUpdate.cellMv[0];
        var cellMin = cellUpdate.cellMv[0];
        for (var i = 0; i < cellUpdate.cellMv.length; i++) {
            setInnerHtmlById('cell.voltage'+i,(0.001*cellUpdate.cellMv[i]).toFixed(3));
            cellMax = Math.max(cellMax, cellUpdate.cellMv[i]);
            cellMin = Math.min(cellMin, cellUpdate.cellMv[i]);
        }
        const range = cellMax - cellMin;
        setInnerHtmlById('cell.range', `${(0.001*cellMin).toFixed(3)} - ${(0.001*cellMax).toFixed(3)}`);
        setInnerHtmlById('cell.diff', (0.001*range).toFixed(3));
        setInnerHtmlById("status.lastUpdate", (new Date()).toString());
    });

    timeSeriesManager.timeSeries.on("update", (history) => {
        console.log("Update Graphs");
        voltagesGraph.update(history);
        cellVoltageGraph.update(history);
        currentGraph.update(history);
        temperatureGraph.update(history);
        stateOfChargeGraph.update(history);
        chargeRemainingGraph.update(history);
    });

        voltagesGraph.update(timeSeriesManager.timeSeries.history);
        cellVoltageGraph.update(timeSeriesManager.timeSeries.history);
        currentGraph.update(timeSeriesManager.timeSeries.history);
        temperatureGraph.update(timeSeriesManager.timeSeries.history);
        stateOfChargeGraph.update(timeSeriesManager.timeSeries.history);
        chargeRemainingGraph.update(timeSeriesManager.timeSeries.history);


});



