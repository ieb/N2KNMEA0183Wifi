import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);
import {LogViewer} from './logviewer.js';
import {DataTypes, DisplayUtils } from './datatypes.js';


class StoreView  extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.title = "Store";
        this.storeAPI = props.storeAPI;
        this.store = {};
        this.state = {
            linecount: 0,
            updates: 0,
            renderedStore: "",
            pauseButton: "Pause"
        };
        this.pauseUpdates = this.pauseUpdates.bind(this);
        this.addListener = this.addListener.bind(this);
        this.update = this.update.bind(this);
        this.lineRender = this.lineRender.bind(this);
    }
    update(changes) {

        for(let k in changes) {
            this.store[k] = changes[k].state;
        }
        const data = [];
        for (let k in this.store) {
            data.push({k: k, v: this.store[k]});
        }
        this.updateLogView(data, this.lineRender);
    }

    lineRender(lineData) {
        if ( typeof lineData.v === 'string' ) {
            return html`<div className="string" key=${lineData.k} >
                            <div>${lineData.k}</div>
                            <div>${lineData.v}</div>
                        </div>`;
        } else if ( typeof lineData.v === 'number' ) {
            if ( lineData.v === -1e9 ) {
                return html`<div className="undefined" key=${lineData.k} >
                                <div>${lineData.k}</div>
                                <div>--</div>
                            </div>`;
            } else {
                const dataType = DataTypes.getDataType(lineData.k);
                if ( dataType !== undefined ) {
                    const disp = dataType.display(lineData.v);
                    return html`<div className=${dataType.type} key=${lineData.k} >
                                    <div>${lineData.k}</div>
                                    <div>(${lineData.v.toPrecision(6)}) ${disp}  ${dataType.units}</div>
                                </div>`;
                } else {
                    return html`<div className="number" key=${lineData.k} >
                                    <div>${lineData.k}</div>
                                    <div>(${lineData.v.toPrecision(6)})</div>
                                </div>`;
                }
            }
        } else {
            return html`<div className="object" key=${lineData.k} >
                            <div>${lineData.k}</div>
                            <div>${JSON.stringify(lineData.v)}</div>
                        </div>`;
        }
    }

    componentDidMount() {
        this.storeAPI.addListener("change", this.update);
    }
    
    componentWillUnmount() {
        this.storeAPI.removeListener("change", this.update);
    }
    pauseUpdates() {
        if ( this.state.pauseButton === "Pause" ) {
            this.setState({pauseButton: 'Resume', pausedLogs: this.state.renderedStore});
        } else {
            this.setState({pauseButton: 'Pause', pausedLogs: undefined});
        }
    }

    addListener(cb) {
        this.updateLogView = cb;
    }


    render() {
        let text = this.state.pausedLogs || this.state.renderedStore;
        if ( text === "" ) {
            text = "Waiting for updates...."
        }
        console.log("Viewer Text ", text);
        return html`
            <div className="storeviewer" >
            <div>${this.title}<button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button></div>
            <div>NMEA2000 Standard units, Rad, m/s, K, etc ${this.state.updates}</div>
            <${LogViewer} text=${this.state.renderedStore} addListener=${this.addListener} />
            </div> `;
    }
}

class FrameView  extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.title = "FrameView";
        this.mainAPI = props.mainAPI;
        this.messages = {};
        this.frames = {};
        this.combined = {};
        this.state = {
            frameCount: 0,
            renderedStore: "",
            pauseButton: "Pause",
            loglines: [],
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
        this.mainAPI.onCanFrame((value) => {
            if ( value && value.message && value.message.pgn ) {
                this.messages[value.message.pgn] = value.message;
                this.combined[value.message.pgn] = value;
            }
            if ( value && value.frame && value.frame.messageHeader ) {
                this.frames[value.frame.messageHeader.pgn] = value.frame;
            }
            // add the message to the end for a time based view.
            const loglines = this.state.loglines.slice(-500);
            loglines.push(JSON.stringify(value,null,2));
            this.setState({loglines, frameCount: this.state.frameCount+1,
                frameView: JSON.stringify(this.frames,null,2), 
                messageView: JSON.stringify(this.messages,null,2),
                combinedView:  JSON.stringify(this.combined,null,2)
            });
        });        
    }
    componentDidMount() {
        console.log("Register window for events");
        this.mainAPI.addListener();
        window.addEventListener('beforeunload', this.mainAPI.removeListener, false);
    }
    
    componentWillUnmount() {
        console.log("deRegister window for events");
        window.removeEventListener('beforeunload', this.mainAPI.removeListener, false);
        this.mainAPI.removeListener();
    }
    pauseUpdates() {
        if ( this.state.pauseButton === "Pause" ) {
            this.setState({pauseButton: 'Resume', pausedState: this.state});
        } else {
            this.setState({pauseButton: 'Pause', pausedState: undefined});
        }
    }
    logView() {
        this.setState({
            logViewClass: "enabled",
            messageViewClass: "disabled",
            frameViewClass: "disabled",
            combinedViewClass: "disabled",
        });
    }
    messageView() {
        this.setState({
            logViewClass: "disabled",
            messageViewClass: "enabled",
            frameViewClass: "disabled",
            combinedViewClass: "disabled",
        });
    }
    frameView() {
        this.setState({
            logViewClass: "disabled",
            messageViewClass: "disabled",
            frameViewClass: "enabled",
            combinedViewClass: "disabled",
        });
    }

    combinedView() {
        this.setState({
            logViewClass: "disabled",
            messageViewClass: "disabled",
            frameViewClass: "disabled",
            combinedViewClass: "enabled",
        });
    }


    render() {
        const currentState = this.state.pausedState || this.state;
        let text = "";
        let follow = false;
        if ( this.state.logViewClass === 'enabled') {
            text = currentState.loglines.join('\n');
            follow = true
        } else if (this.state.messageViewClass === 'enabled') {
            text = currentState.messageView;
        } else if (this.state.frameViewClass === 'enabled') {
            text = currentState.frameView;
        } else if (this.state.combinedViewClass === 'enabled') {
            text = currentState.combinedView;
        }
        if ( text === "" ) {
            text = "Waiting for updates...."
        }
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
            <LogViewer text=${text}  / >
            </div> `;
    }
}
export { StoreView, FrameView };