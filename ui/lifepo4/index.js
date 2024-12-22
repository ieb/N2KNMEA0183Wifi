//import { JDBBMSReader } from './bmsblereader.js';
import { JDBBMSReaderSeasmart } from './bmsseasmartreader.js';
import {
  TemperatureGraph,
  CellVoltagesGraph,
  ChargeRemainingGraph,
  StateOfChargeGraph,
  VoltagesGraph,
  CurrentGraph,
  TimeSeriesManager,
} from './history.js';



if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/lifepo4/worker.js', { scope: '/lifepo4/', type: 'module' });
  navigator.serviceWorker.ready.then((registration) => {
    const cacheEnabled = !window.location.hash.includes('disableCache');
    registration.active.postMessage({ cacheEnabled });
  });
}



window.addEventListener('load', () => {
  const bmsReader = new JDBBMSReaderSeasmart();
  const fakeData = window.location.hash.includes('fakeData');
  const timeSeriesManager = new TimeSeriesManager(fakeData);

  const voltagesGraph = new VoltagesGraph();
  const cellVoltageGraph = new CellVoltagesGraph();
  const currentGraph = new CurrentGraph();
  const temperatureGraph = new TemperatureGraph();
  const stateOfChargeGraph = new StateOfChargeGraph();
  const chargeRemainingGraph = new ChargeRemainingGraph();

  const setClass = (id, value, classOn, classOff) => {
    const el = document.getElementById(id);
    if (el) {
      const classes = el.getAttribute('class') || '';
      const classList = classes.split(' ')
        .filter((className) => (className !== classOn && className !== classOff));
      classList.push(value ? classOn : classOff);
      el.setAttribute('class', classList.join(' '));
    } else {
      console.log('ID Not found ', id);
    }
  };

  const connectWithUrl = async () => {
    const apiHost = document.getElementById('url').value;
    const url = `http://${apiHost}/api/seasmart?pgn=130829,127508`;
    await bmsReader.connectBMS(url);
  };

  document.getElementById('connect').addEventListener('click', connectWithUrl);

  document.getElementById('disconnect').addEventListener('click', async () => {
    await bmsReader.disconnectBMS();
  });


  const setInnerHtmlById = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = value;
    } else {
      console.log('ID Not found ', id);
    }
  };

  bmsReader.on('metrics', (metrics) => {
    setInnerHtmlById('streamCount', `streams:${metrics.streams}`);
    setInnerHtmlById('connectionCount', `connections:${metrics.connections}`);
    setInnerHtmlById('timeoutCount', `timeouts:${metrics.timeouts}`);
    setInnerHtmlById('receivedCount', `received:${metrics.messagesRecieved}`);
    setInnerHtmlById('decodedCount', `used:${metrics.messagedDecoded}`);
  });


  bmsReader.on('connected', (connected) => {
    if (connected) {
      timeSeriesManager.start();
    } else {
      document.getElementById('connectionError').setAttribute('class', 'greyDot');
      timeSeriesManager.stop();
    }
    setClass('connect', connected, 'hidden', '');
    setClass('disconnect', connected, '', 'hidden');
  });
  bmsReader.on('statusCode', (code) => {
    if (code === 200) {
      setInnerHtmlById('connectionError', 'OK');
      document.getElementById('connectionError').setAttribute('class', 'greenDot');
    } else if (code === 504) {
      setTimeout(async () => {
        // service worker or fetch is reporting offline so try other ports.
        await bmsReader.disconnectBMS();
        const apiHost = document.getElementById('url').value;
        const parts = apiHost.split(':');
        if (parts.length === 1) {
          parts.push('8080');
        } else if (parts[1] === '8080') {
          parts[1] = '8081';
        } else if (parts[1] === '8081') {
          parts.pop();
        }
        document.getElementById('url').value = parts.join(':');
        setInnerHtmlById('connectionError', 'Searching');
        document.getElementById('connectionError').setAttribute('class', 'greyDot');
        await connectWithUrl();
      }, 1);
    } else {
      setInnerHtmlById('connectionError', 'Error');
      document.getElementById('connectionError').setAttribute('class', 'redDot');
    }
  });

  const formatDouble = (v, p) => {
    if (v === undefined || v === -1e9) {
      return '--';
    }
    return v.toFixed(p);
  };
  const formatInt = (v) => {
    if (v === undefined || v === 0xffff) {
      return '--';
    }
    return v;
  };


  const updateGuage = (statusUpdate) => {
    setInnerHtmlById('guageVoltageText', `${formatDouble(statusUpdate.voltage, 2)}V`);
    setInnerHtmlById('guageCurrentText', `${formatDouble(statusUpdate.current, 1)}A`);
    if (statusUpdate.current) {
      const currentGuage = document.getElementById('currentGuage');

      const currentGuageLength = (Math.abs(statusUpdate.current) / 100) * 353;
      currentGuage.setAttribute('stroke-dasharray', `${currentGuageLength} 471`);
      if (statusUpdate.current > 0) {
        currentGuage.setAttribute('stroke', 'url(#currentGradCharge)');
      } else {
        currentGuage.setAttribute('stroke', 'url(#currentGradDischarge)');
      }
      setClass('currentWidget', (statusUpdate.current > 0), 'charging', 'discharging');
    }


    if (statusUpdate.capacity) {
      const stateOfChargeAh = (statusUpdate.capacity.stateOfCharge / 100)
        * statusUpdate.capacity.fullCapacity;
      setInnerHtmlById('guageStateOfChargeText', `${stateOfChargeAh.toFixed(0)}Ah`);
      const stateOfChargeGauge = document.getElementById('chargeGuage');
      const stateOfChargeBase = document.getElementById('stateOfChargeBase');

      const stateOfChageLength = 120 - (statusUpdate.capacity.stateOfCharge / 100) * 120;
      stateOfChargeGauge.setAttribute('stroke-dasharray', `${stateOfChageLength} 471`);

      const socp = Math.min(100, 10 * Math.floor((statusUpdate.capacity.stateOfCharge + 5) / 10));
      stateOfChargeBase.setAttribute('class', `guageSubBase_${socp}`);
    }
  };


  const handleStatusUpdate = (statusUpdate) => {
    timeSeriesManager.handleStatusUpdate(statusUpdate);
    updateGuage(statusUpdate);

    setInnerHtmlById('status.voltage', formatDouble(statusUpdate.voltage, 2));
    setInnerHtmlById('status.current', formatDouble(statusUpdate.current, 1));
    setInnerHtmlById('status.capacity.stateOfCharge', formatDouble(statusUpdate.capacity.stateOfCharge, 0));
    setInnerHtmlById('status.packBalCap', formatDouble(statusUpdate.packBalCap, 0));
    setInnerHtmlById('status.capacity.fullCapacity', formatDouble(statusUpdate.capacity.fullCapacity, 0));
    setClass('status.charging', statusUpdate.FETStatus.charging === 1, 'enabled', 'disabled');
    setClass('status.discharging', statusUpdate.FETStatus.discharging === 1, 'enabled', 'disabled');
    setInnerHtmlById('status.chargeCycles', formatInt(statusUpdate.chargeCycles));
    setInnerHtmlById('status.productionDate', statusUpdate.productionDate ? statusUpdate.productionDate.toDateString() : '--');
    setInnerHtmlById('status.bmsSWVersion', formatInt(statusUpdate.bmsSWVersion));
    setInnerHtmlById('status.numberOfCells', formatDouble(statusUpdate.numberOfCells, 0));
    setInnerHtmlById('status.tempSensorCount', formatDouble(statusUpdate.tempSensorCount, 0));
    setInnerHtmlById('status.chemistry', statusUpdate.chemistry);
    for (let i = 0; i < statusUpdate.balanceActive.length; i++) {
      setClass(`status.balanceActive${i}`, statusUpdate.balanceActive[i] === 1, 'enabled', 'disabled');
    }
    for (let i = 0; i < statusUpdate.tempSensorValues.length; i++) {
      setInnerHtmlById(`status.tempSensorValues${i}`, formatDouble(statusUpdate.tempSensorValues[i], 1));
    }
    for (const k of Object.keys(statusUpdate.currentErrors)) {
      setClass(`status.errors.${k}`, statusUpdate.currentErrors[k] === 1, 'enabled', 'disabled');
    }
    setInnerHtmlById('status.lastUpdate', (new Date()).toString());
  };
  const handleCellUpdate = (cellUpdate) => {
    timeSeriesManager.handleCellUpdate(cellUpdate);
    let cellMax;
    let cellMin;
    for (let i = 0; i < cellUpdate.cellMv.length; i++) {
      if (cellUpdate.cellMv[i] && cellUpdate.cellMv[i] !== -1e9) {
        setInnerHtmlById(`cell.voltage${i}`, (0.001 * cellUpdate.cellMv[i]).toFixed(3));
        if (cellMax !== undefined) {
          cellMax = Math.max(cellMax, cellUpdate.cellMv[i]);
        } else {
          cellMax = cellUpdate.cellMv[i];
        }
        if (cellMin !== undefined) {
          cellMin = Math.min(cellMin, cellUpdate.cellMv[i]);
        } else {
          cellMin = cellUpdate.cellMv[i];
        }
      } else {
        setInnerHtmlById(`cell.voltage${i}`, '--');
      }
    }
    if (cellMax !== undefined && cellMin !== undefined) {
      const range = cellMax - cellMin;
      setInnerHtmlById('cell.range', `${(0.001 * cellMin).toFixed(3)} - ${(0.001 * cellMax).toFixed(3)}`);
      setInnerHtmlById('cell.diff', (0.001 * range).toFixed(3));
    } else {
      setInnerHtmlById('cell.range', '--');
      setInnerHtmlById('cell.diff', '--');
    }
    setInnerHtmlById('status.lastUpdate', (new Date()).toString());
  };
  const handleRapidUpdate = (rapidUpdate) => {
    updateGuage({
      voltage: rapidUpdate.batteryVoltage,
      current: rapidUpdate.batteryCurrent,
    });
    setInnerHtmlById('status.voltage', formatDouble(rapidUpdate.batteryVoltage, 2));
    setInnerHtmlById('status.current', formatDouble(rapidUpdate.batteryCurrent, 2));
    setInnerHtmlById('status.lastUpdate', (new Date()).toString());
  };

  bmsReader.on('n2kdecoded', (decodedMessage) => {
    // console.debug('Decoded Message', decodedMessage);
    if (decodedMessage.register === 0x03) {
      handleStatusUpdate(decodedMessage);
    } else if (decodedMessage.register === 0x04) {
      handleCellUpdate(decodedMessage);
    } else if (decodedMessage.pgn === 127508 && decodedMessage.instance === 1) {
      handleRapidUpdate(decodedMessage);
    }
  });



  let timeWindow = 3600000;
  let endOfWindow = 1.0;
  const updateGraphs = (history) => {
    const now = Date.now();
    const endTs = now + endOfWindow;
    const startTs = endTs - timeWindow;
    console.debug(`Start ${new Date(startTs)} End ${new Date(endTs)}`);
    voltagesGraph.update(history, startTs, endTs);
    cellVoltageGraph.update(history, startTs, endTs);
    currentGraph.update(history, startTs, endTs);
    temperatureGraph.update(history, startTs, endTs);
    stateOfChargeGraph.update(history, startTs, endTs);
    chargeRemainingGraph.update(history, startTs, endTs);
  };

  timeSeriesManager.timeSeries.on('update', (history) => {
    console.debug('Update Graphs');
    updateGraphs(history);
  });

  document.getElementById('timewindow').addEventListener('change', (event) => {
    timeWindow = parseInt(event.target.value, 10);
    updateGraphs(timeSeriesManager.timeSeries.history);
  });

  document.getElementById('endOfWindow').addEventListener('input', (event) => {
    endOfWindow = parseInt(event.target.value, 10);
    console.debug('endOfWindow', event.target.value, endOfWindow);
    updateGraphs(timeSeriesManager.timeSeries.history);
  });

  updateGraphs(timeSeriesManager.timeSeries.history);

  setTimeout(() => {
    connectWithUrl();
  }, 100);
});



