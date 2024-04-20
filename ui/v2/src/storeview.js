import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);
//import { LazyLog } from 'react-lazylog';
//import yaml  from 'js-yaml';

//import './styles/logs.css';


class StoreView  extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.title = "Store";
        this.storeAPI = props.storeAPI;
        this.store = {};
        this.state = {
            linecount: 0,
            renderedStore: "",
            pauseButton: "Pause"
        };
        this.pauseUpdates = this.pauseUpdates.bind(this);
        this.storeAPI.onStateChange((storeUpdate) => {
            for(let k in storeUpdate) {
                this.store[k] = storeUpdate[k];
            }
            this.setState({renderedStore: yaml.dump(this.store, {
                    skipInvalid: true,
                    flowLevel:1,
                })});
        });        
    }
    componentDidMount() {
        console.log("Register window for events");
        this.storeAPI.addListener();
        window.addEventListener('beforeunload', this.storeAPI.removeListener, false);
    }
    
    componentWillUnmount() {
        console.log("deRegister window for events");
        window.removeEventListener('beforeunload', this.storeAPI.removeListener, false);
        this.storeAPI.removeListener();
    }
    pauseUpdates() {
        if ( this.state.pauseButton === "Pause" ) {
            this.setState({pauseButton: 'Resume', pausedLogs: this.state.renderedStore});
        } else {
            this.setState({pauseButton: 'Pause', pausedLogs: undefined});
        }
    }


    render() {
        let text= this.state.pausedLogs || this.state.renderedStore;
        if ( text === "" ) {
            text = "Waiting for updates...."
        }
        return html`
            <div className="logviewer" >
            <div>${this.title}<button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button></div>
            <div>NMEA2000 Standard units, Rad, m/s, K, etc</div>
            <LazyLog text=${text} extraLines=${1} 
                selectableLines 
                caseInsensitive
                follow
                lineClassName="logline"
                enableSearch / >
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
            loglines.push(yaml.dump(value, { skipInvalid: true, flowLevel: 2}));
            const update = 
            this.setState({loglines, frameCount: this.state.frameCount+1,
                frameView: yaml.dump(this.frames, { skipInvalid: true, flowLevel: 3}),
                messageView: yaml.dump(this.messages, { skipInvalid: true, flowLevel: 3}),
                combinedView:  yaml.dump(this.combined, { skipInvalid: true, flowLevel: 3})
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
            <div className="logviewer" >
            <div>${this.title}
                <button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button>
                mode [
                <button onClick=${this.logView} className=${this.state.logViewClass} >log</button>
                <button onClick=${this.messageView} className=${this.state.messageViewClass} >message</button>
                <button onClick=${this.frameView} className=${this.state.frameViewClass} >frame</button>
                <button onClick=${this.combinedView} className=${this.state.combinedViewClass} >combined</button> ]
            </div>
            <LazyLog text=${text} extraLines=${1} 
                selectableLines 
                caseInsensitive
                follow={follow}
                lineClassName="logline"
                enableSearch / >
            </div> `;
    }
}
export { StoreView, FrameView };