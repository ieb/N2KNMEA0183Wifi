import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { LogViewer } from './logviewer.js';
import { DataTypes } from './datatypes.js';
import { CANMessage } from './n2k/messages_decoder.js';
import { NMEA2000MessageDecoder } from './n2k/messages_decoder.js';
import { register as registerIsoMessages } from './n2k/messages_iso.js';
import { register as registerEngineMessages } from './n2k/messages_engine.js';
import { register as registerNavMessages } from './n2k/messages_nav.js';

const html = htm.bind(h);


class DebugCanFrame {
  static parse(canFrameAsString) {
    if (canFrameAsString && canFrameAsString.trim().length > 0 ) {
      try {
        const canFrame = JSON.parse(canFrameAsString);
        canFrame.timetamp = Date.now();
        canFrame.data = new DataView(DebugCanFrame.toBuffer(canFrame.msg));
        return canFrame;
      } catch (e) {
        console.log('Failed to parse ', canFrameAsString, e);
      }
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
      const canFrame = DebugCanFrame.parse(l);
      if (canFrame) {
        const decoded = this.decoder.decode(canFrame);
        if (decoded) {
          feedback.push({ state: 'decoded', msg: JSON.stringify(decoded) });
        } else {
          feedback.push({ state: 'frameonly', msg: JSON.stringify(canFrame) });
        }
        this.storeAPI.store.updateFromNMEA2000Stream(decoded);
      } else {
        feedback.push({ state: 'skipped', msg: l });
      }
    });
    this.storeAPI.removeListener('newstate', newstate);
    this.storeAPI.removeListener('change', change);
    this.setState({
      feedback,
    });
  }

  outputFeedback() {
    if (this.state.feedback) {
      const feedback = this.state.feedback.map((f) => html`<div className="line"><div className="store"><div>${f.state}</div><div>${f.msg}</div></div></div>`);
      return html`<div className="logviewer">${feedback}</div>`;
    }
    return html`<div>ready</div>`;
  }

  render() {
    return html`
            <div className="frameviewer" >
            <div>${this.title}
                <button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button>
                <button onClick=${this.startPlayback} >${this.state.playbackButton}</button>
                <button onClick=${this.parseText} >Parse</button>
            </div>
              <textarea name="debugview-frames" cols="130" rows="10" onChange="${this.inputFramesChange}">
                  ${this.state.framesTxt}
              </textarea>
              ${this.outputFeedback()}
            </div> `;
  }
}
export { DebugView };
