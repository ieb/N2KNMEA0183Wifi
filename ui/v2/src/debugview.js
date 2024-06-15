import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { LogViewer } from './logviewer.js';
import { DataTypes } from './datatypes.js';
import { CANMessage } from './n2k/messages_decoder.js';
import { StoreView } from './storeview.js';
import { NMEA2000MessageDecoder } from './n2k/messages_decoder.js';
import { register as registerIsoMessages } from './n2k/messages_iso.js';
import { register as registerEngineMessages } from './n2k/messages_engine.js';
import { register as registerNavMessages } from './n2k/messages_nav.js';

const html = htm.bind(h);


class DebugCanFrame {

  static toJson(upateString) {
    if (upateString && upateString.trim().length > 0 ) {
      try {
        return JSON.parse(upateString);
      } catch (e) {
        console.log('Failed to parse ', upateString, e);
      }
    }
    return {};

  }
  static parse(canFrameJson) {
    try {
      const canFrame = JSON.parse(canFrameJson);
      canFrame.timetamp = Date.now();
      canFrame.data = new DataView(DebugCanFrame.toBuffer(canFrame.msg));
      return canFrame;
    } catch (e) {
      console.log('Failed to process ', canFrameJson, e);
    }
    return undefined;
  }

  static stringify(canFrame) {
    return JSON.stringify({
      pgn: canFrame.pgn,
      src: canFrame.source,
      msg: CANMessage.dumpMessage(canFrame),
    });
  }

  static toBuffer(asHex) {
    const b = new Uint8Array(asHex.length / 2);
    for (let i = 0; i < b.length; i++) {
      b[i] = parseInt(asHex.substring(i * 2, i * 2 + 2), 16);
    }
    return b.buffer;
  }
}

class DebugView extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.title = 'DebugView';
    this.storeAPI = props.storeAPI;
    this.canFrames = [];
    this.messages = {};
    this.frames = {};
    this.combined = {};
    this.state = {
      pauseButton: 'Updates Paused',
      playbackButton: 'Start Playback',
      storeViewButton: 'Showing Store',
      framesTxt: '{"n": 3, "pgn": 127250, "src": 205, "msg": "ffc3a8ff7fff7ffd"}\n'
        + '{"n": 1, "pgn": 127245, "src": 182, "msg": "fcf8ff7febfaffff"}\n'
        + '{"n": 2, "pgn": 130306, "src": 199, "msg": "0031038417faffff"}\n'
        + '{"n": 3, "pgn": 127250, "src": 205, "msg": "ffc3a8ff7fff7ffd"}\n'
        + '{"n": 1, "pgn": 127245, "src": 182, "msg": "fcf8ff7febfaffff"}\n'
        + '{"n": 10, "pgn": 128275, "src": 199, "msg": "ffffffffffff004d3f00004d3f00"}\n',
    };
    this.pauseUpdates = this.pauseUpdates.bind(this);
    this.startPlayback = this.startPlayback.bind(this);
    this.frameCount = 0;
    this.recieveFrame = this.recieveFrame.bind(this);
    this.inputFramesChange = this.inputFramesChange.bind(this);
    this.parseText = this.parseText.bind(this);
    this.viewButton = this.viewButton.bind(this);

    this.decoder = new NMEA2000MessageDecoder();
    registerIsoMessages(this.decoder.messages);
    registerIsoMessages(this.decoder.messages);
    registerEngineMessages(this.decoder.messages);
    registerNavMessages(this.decoder.messages);
  }

  componentDidMount() {
    this.storeAPI.addListener('n2kraw', this.recieveFrame);
  }

  componentWillUnmount() {
    this.storeAPI.removeListener('n2kraw', this.recieveFrame);
  }

  recieveFrame(canFrame) {
    // shallow copy to create a new
    if (this.state.pauseButton === 'Pause Updates') {
      this.canFrames = this.canFrames.slice(-1000);
      this.frameCount++;
      this.canFrames.push(DebugCanFrame.stringify(canFrame));
      this.setState({ framesTxt: this.canFrames.join('/n') });
    }
  }


  pauseUpdates() {
    if (this.state.playbackButton === 'Start Playback') {
      if (this.state.pauseButton === 'Pause Updates') {
        this.setState({ pauseButton: 'Updates Paused' });
      } else {
        this.setState({ pauseButton: 'Pause Updates' });
      }
    }
  }

  startPlayback() {
    if (this.state.playbackButton === 'Start Playback') {
      this.setState({
        playbackButton: 'Stop Playback',
        pauseButton: 'Updates Paused',
      });
    } else {
      this.setState({
        playbackButton: 'Start Playback',
        pauseButton: 'Updates Paused',
      });
    }
  }

  // eslint-disable-next-line class-methods-use-this
  inputFramesChange(event) {
    this.setState({
      framesTxt: event.target.value,
    });
  }

  parseText() {
    const feedback = [];
    const newstate = (newStateData) => {
      feedback.push({ state: 'store update', msg: JSON.stringify(newStateData) });
    };
    const change = (changeSet) => {
      feedback.push({ state: 'store change', msg: JSON.stringify(changeSet) });
    };
    this.storeAPI.addListener('newstate', newstate);
    this.storeAPI.addListener('change', change);
    const lines = this.state.framesTxt.split('\n');
    lines.forEach((l) => {
      const asJson = DebugCanFrame.toJson(l);
      if (asJson.update) {
        this.parseSequence(asJson.update);
      } else {
        const canFrame = DebugCanFrame.parse(asJson);
        if (canFrame) {
          const decoded = this.decoder.decode(canFrame);
          if (decoded) {
            feedback.push({ state: 'decoded', msg: JSON.stringify(decoded) });
            try {
              this.storeAPI.store.updateFromNMEA2000Stream(decoded);
            } catch (e) {
              console.log('failed to store frame ', decoded);
              console.log('Error was ', e);
            }
          } else {
            console.log('No decode for ', canFrame);
            feedback.push({ state: 'frameonly', msg: JSON.stringify(canFrame) });
          }
        } else {
          feedback.push({ state: 'skipped', msg: l });
        }
      }
    });

    this.storeAPI.removeListener('newstate', newstate);
    this.storeAPI.removeListener('change', change);
    this.setState({
      feedback,
    });
  }

  /*
    { "update": { "stw": "6.0kn", "awa": "34deg", "aws": "22kn" }}
  */
  parseSequence(input) {
    const degToRad = (d) => d * (Math.PI / 180.0);
    const knToMs = (s) => s / 1.94384;
    const cToK = (t) => t + 273.15;
    const update = {
      hdm: degToRad(45),
      variation: degToRad(1),
      deviation: degToRad(-2.1),
      stw: knToMs(8.7),
      dbt: 2.32,
      depthOffset: 0.1,
      log: 500002,
      tripLog: 2321,
      latitude: 51.9589473,
      longitude: 1.2762917999999999,
      cogt: degToRad(43),
      sog: knToMs(6.3),
      aws: knToMs(22),
      awa: degToRad(35),
      setT: degToRad(234),
      drift: knToMs(1.5),
      voltage_0: 12.8,
      current_0: -5.4,
      temperature_0: cToK(22.3),
      seaTemperature: cToK(14.3),
      engineRoomTemperature: cToK(45.3),
      mainCabinTemperature: cToK(21.3),
      exhaustTemperature: cToK(42.3),
      alternatorTemperature: cToK(52.3),
      fuelLevel_0: 62.3,
      fuelCapacity_0: 60,
      engineCoolantTemperature_0: cToK(64.6),
      alternatorVoltage_0: 13.9,
      alternatorTemperature_0: cToK(45.3),
      engineSpeed_0: 2320,
      atmosphericPressure_0: 100323,
      rudderPosition: degToRad(-1.3),
    };

    Object.keys(input).forEach((k) => {
      let v = input[k];
      if (v.endsWith('deg')) {
        v = degToRad(parseFloat(v));
      } else if (v.endsWith('C')) {
        v = cToK(parseFloat(v));
      } else if (v.endsWith('kn')) {
        v = knToMs(parseFloat(v));
      }
      update[k] = v;
    });
    this.storeAPI.store.updateState(update);
  }

  outputFeedback() {
    if (this.state.storeViewButton !== 'Showing Store') {
      if (this.state.feedback) {
        const feedback = this.state.feedback.map((f) => html`<div className="line"><div className="store"><div>${f.state}</div><div>${f.msg}</div></div></div>`);
        return html`<div className="logviewer">${feedback}</div>`;
      }
    }
    return '';
  }

  showStoreView() {
    if (this.state.storeViewButton === 'Showing Store') {
      return html`<${StoreView} 
                key=${this.state.menuKey}
                storeAPI=${this.storeAPI}  />`;
    }
    return '';
  }

  viewButton() {
    if (this.state.storeViewButton === 'Showing Store') {
      this.setState({
        storeViewButton: 'Showing Feedback',
      });
    } else {
      this.setState({
        storeViewButton: 'Showing Store',
      });
    }
  }

  render() {
    return html`
            <div className="frameviewer" >
              <div>${this.title}
                  <button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button>
                  <button onClick=${this.startPlayback} >${this.state.playbackButton}</button>
                  <button onClick=${this.parseText} >Parse</button>
                  <button onClick=${this.viewButton} >${this.state.storeViewButton}</button>
              </div>
              <textarea name="debugview-frames" cols="130" rows="10" onChange="${this.inputFramesChange}">
                  ${this.state.framesTxt}
              </textarea>
              ${this.outputFeedback()}
              ${this.showStoreView()}
            </div> 

            `;
  }
}
export { DebugView };
