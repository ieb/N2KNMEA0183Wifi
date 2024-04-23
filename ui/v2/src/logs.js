import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

import {LogViewer} from './logviewer.js';



class Logs  extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        this.title = props.title || "Debug Log"
        this.mainAPI = props.mainAPI;
        this.state = {
            linecount: 0,
            loglines: [],
            pauseButton: "Pause"
        };
        this.pauseUpdates = this.pauseUpdates.bind(this);
        this.props.enableFeed((line) => {
            if ( this.logControlAPI !== undefined ) {
                const lines = this.state.loglines.slice(-500).push(line);
                this.setState({loglines: lines});
            }
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
            this.setState({pauseButton: 'Resume', pausedLogs: this.state.loglines.join('\n')});
        } else {
            this.setState({pauseButton: 'Pause', pausedLogs: undefined});
        }
    }

    registerControl(logControlAPI) {
        this.logControlAPI = logControlAPI;
    }


    render() {
        return html`
            <div className="logviewer" >
            <div>${this.title}<button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button></div>
            <LogViewer text=${text}
                selectableLines 
                caseInsensitive
                follow
                lineClassName="logline"
                enableSearch / >
            </div> `;
    }
}

export { Logs };