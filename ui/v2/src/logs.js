import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

//import { LazyLog } from 'react-lazylog';


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
            const loglines = this.state.loglines.slice(-500);
            loglines.push(line);
            this.setState({loglines, linecount: this.state.linecount+1});
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


    render() {
        let text= this.state.pausedLogs || this.state.loglines.join("\n");
        if ( text === "" ) {
            text = "Waiting for logs...."
        }
        return html`
            <div className="logviewer" >
            <div>${this.title}<button onClick=${this.pauseUpdates} >${this.state.pauseButton}</button></div>
            <LazyLog text=${text} extraLines=${1} 
                selectableLines 
                caseInsensitive
                follow
                lineClassName="logline"
                enableSearch / >
            </div> `;
    }
}

export { Logs };