import { h, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
import { LogViewer } from './logviewer.js';
import { DataTypes } from './datatypes.js';
import { CANMessage } from './n2k/messages_decoder.js';

const html = htm.bind(h);

class StoreView extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.title = 'Store';
    this.storeAPI = props.storeAPI;
    this.store = {};
    this.state = {
      pauseButton: 'Pause',
    };
    this.pauseUpdates = this.pauseUpdates.bind(this);
    this.addListener = this.addListener.bind(this);
    this.update = this.update.bind(this);
  }

  // changes is not an object
  update(changes) {
    for (const k of Object.keys(changes)) {
      this.store[k] = changes[k].state;
    }
    if (this.state.pauseButton !== 'Resume') {
      const data = [];
      for (const k of Object.keys(this.store)) {
        data.push({ k, v: this.store[k] });
      }
      /* eslint-disable-next-line class-methods-use-this */
      this.updateLogView(data, StoreView.lineRender);
    }
  }

  static lineRender(lineData) {
    if (typeof lineData.v === 'string') {
      return html`<div className="store" key=${lineData.k} >
                            <div>${lineData.k}</div>
                            <div>${lineData.v}</div>
                            <div></div>
                        </div>`;
    } if (typeof lineData.v === 'number') {
      if (lineData.v === -1e9) {
        return html`<div className="store" key=${lineData.k} >
                                <div>${lineData.k}</div>
                                <div>--</div>
                                <div>(-1e9) </div>
                            </div>`;
      }
      const dataType = DataTypes.getDataType(lineData.k);
      if (dataType !== undefined) {
        const disp = dataType.display(lineData.v);
        return html`<div className="store" key=${lineData.k} >
                                    <div>${lineData.k}</div>
                                    <div>${disp}  ${dataType.units}</div>
                                    <div>(${lineData.v.toPrecision(6)}) </div>
                                </div>`;
      }
      return html`<div className="store" key=${lineData.k} >
                                    <div>${lineData.k}</div>
                                    <div>  </div>
                                    <div>(${lineData.v.toPrecision(6)})</div>
                                </div>`;
    }
    return html`<div className="store" key=${lineData.k} >
                            <div>${lineData.k}</div>
                            <div>${JSON.stringify(lineData.v)}</div>
                            <div>  </div>
                        </div>`;
  }

  componentDidMount() {
    this.storeAPI.addListener('change', this.update);
    this.storeAPI.emitAll();
  }

  componentWillUnmount() {
    this.storeAPI.removeListener('change', this.update);
  }

  pauseUpdates() {
    if (this.state.pauseButton === 'Pause') {
      this.setState({ pauseButton: 'Resume' });
    } else {
      this.setState({ pauseButton: 'Pause' });
    }
  }

  addListener(cb) {
    this.updateLogView = cb;
  }

  render() {
    return html`
            <div className="storeviewer" >
            <div>${this.title}
                <button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button>
            </div>
            <${LogViewer} text="Waiting for updates..." addListener=${this.addListener} />
            </div> `;
  }
}

class FrameView extends Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.title = 'FrameView';
    this.storeAPI = props.storeAPI;
    this.canFrames = [];
    this.messages = {};
    this.frames = {};
    this.combined = {};
    this.state = {
      pauseButton: 'Pause',
      logViewClass: 'enabled',
      messageViewClass: 'disabled',
      frameViewClass: 'disabled',
      combinedViewClass: 'disabled',
    };
    this.pauseUpdates = this.pauseUpdates.bind(this);
    this.messageView = this.messageView.bind(this);
    this.frameView = this.frameView.bind(this);
    this.logView = this.logView.bind(this);
    this.combinedView = this.combinedView.bind(this);
    this.addListener = this.addListener.bind(this);
    this.updateLogView = undefined;
    this.frameCount = 0;

    this.recieveMessage = this.recieveMessage.bind(this);
    this.recieveFrame = this.recieveFrame.bind(this);
  }

  componentDidMount() {
    this.storeAPI.addListener('n2kdecoded', this.recieveMessage);
    this.storeAPI.addListener('n2kraw', this.recieveFrame);
  }

  componentWillUnmount() {
    this.storeAPI.removeListener('n2kdecoded', this.recieveMessage);
    this.storeAPI.removeListener('n2kraw', this.recieveFrame);
  }

  recieveMessage(message) {
    if (message && message.pgn) {
      this.messages[message.pgn] = this.messages[message.pgn] || {};
      this.messages[message.pgn][message.src] = message;
    }
    this.update();
  }

  recieveFrame(canFrame) {
    if (canFrame) {
      this.frames[canFrame.pgn] = this.frames[canFrame.pgn] || {};
      this.frames[canFrame.pgn][canFrame.source] = canFrame;
    }
    this.canFrames = this.canFrames.slice(-50);
    this.frameCount++;
    this.canFrames.push({ n: this.frameCount, canFrame });
    this.update();
  }

  update() {
    if (this.state.pauseButton === 'Pause' && this.updateLogView !== undefined) {
      if (this.state.logViewClass === 'enabled') {
        this.updateLogView(this.canFrames, FrameView.renderCanFrameLine);
      } else if (this.state.messageViewClass === 'enabled') {
        const messageList = [];
        for (const k of Object.keys(this.messages)) {
          let n = 0;
          for (const s of Object.keys(this.messages[k])) {
            messageList.push({ pgn: n ? '...' : k, message: this.messages[k][s] });
            n++;
          }
        }
        this.updateLogView(messageList, FrameView.renderMessageLine);
      } else if (this.state.frameViewClass === 'enabled') {
        const frameList = [];
        for (const k of Object.keys(this.frames)) {
          let n = 0;
          for (const s of Object.keys(this.frames[k])) {
            frameList.push({ pgn: n ? '...' : k, canFrame: this.frames[k][s] });
            n++;
          }
        }
        this.updateLogView(frameList, FrameView.renderFrameLine);
      } else if (this.state.combinedViewClass === 'enabled') {
        const combinedList = [];
        for (const k of Object.keys(this.frames)) {
          let n = 0;
          for (const s of Object.keys(this.frames[k])) {
            combinedList.push({ pgn: n ? '...' : k, message: this.messages[k] ? this.messages[k][s] : '--', canFrame: this.frames[k][s] });
            n++;
          }
        }
        this.updateLogView(combinedList, FrameView.renderCombinedLine);
      }
    }
  }

  static toMessage(canFrame) {
    if (canFrame) {
      return CANMessage.dumpMessage(canFrame);
    }
    return '';
  }

  static renderCanFrameLine(frameline) {
    return html`<div className="log" key=${frameline.n} >
                        <div>${frameline.n}</div>
                        <div>${frameline.canFrame.pgn}</div>
                        <div>src:${frameline.canFrame.source}</div>
                        <div>msg:${FrameView.toMessage(frameline.canFrame)}</div>
                    </div>`;
  }

  static renderMessageLine(message) {
    return html`<div className="message" key=${message.pgn} >
                        <div>${message.pgn}</div>
                        <div>${JSON.stringify(message.message)}</div>
                    </div>`;
  }

  static renderFrameLine(frame) {
    return html`<div className="frame" key=${frame.pgn} >
                        <div>${frame.pgn}</div>
                        <div>src:${frame.canFrame.source}</div>
                        <div>msg:${FrameView.toMessage(frame.canFrame)}</div>
                    </div>`;
  }

  static renderCombinedLine(combined) {
    return html`<div className="combined" key=${combined.pgn} >
                        <div>${combined.pgn}</div>
                        <div>${JSON.stringify(combined.message)}</div>
                        <div>msg:${FrameView.toMessage(combined.canFrame)}</div>
                    </div>`;
  }

  pauseUpdates() {
    if (this.state.pauseButton === 'Pause') {
      this.setState({ pauseButton: 'Resume', pausedState: this.state });
    } else {
      this.setState({ pauseButton: 'Pause', pausedState: undefined });
    }
  }

  logView() {
    this.setState({
      logViewClass: 'enabled',
      messageViewClass: 'disabled',
      frameViewClass: 'disabled',
      combinedViewClass: 'disabled',
    });
  }

  messageView() {
    this.setState({
      logViewClass: 'disabled',
      messageViewClass: 'enabled',
      frameViewClass: 'disabled',
      combinedViewClass: 'disabled',
    });
  }

  frameView() {
    this.setState({
      logViewClass: 'disabled',
      messageViewClass: 'disabled',
      frameViewClass: 'enabled',
      combinedViewClass: 'disabled',
    });
  }

  combinedView() {
    this.setState({
      logViewClass: 'disabled',
      messageViewClass: 'disabled',
      frameViewClass: 'disabled',
      combinedViewClass: 'enabled',
    });
  }

  addListener(cb) {
    console.log('Binding listener');
    this.updateLogView = cb;
  }

  render() {
    return html`
            <div className="frameviewer" >
            <div>${this.title}
                <button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button>
                mode [
                <button onClick=${this.logView} className=${this.state.logViewClass} >log</button>
                <button onClick=${this.messageView} className=${this.state.messageViewClass} >message</button>
                <button onClick=${this.frameView} className=${this.state.frameViewClass} >frame</button>
                <button onClick=${this.combinedView} className=${this.state.combinedViewClass} >combined</button> ]
            </div>
            <${LogViewer} text="Waiting for updates...." addListener=${this.addListener} / >
            </div> `;
  }
}
export { StoreView, FrameView };
