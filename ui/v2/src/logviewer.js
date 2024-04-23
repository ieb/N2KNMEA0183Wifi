import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);


class LogViewer extends Component {
    constructor(props) {
        super(props);
        this.props = props;
        const lines = props.text.split('\n');
        console.log("Lines are ", props.text);
        this.state = {
            from: 0,
            to: 0,
            lines: lines
        }
        props.addListener((data, renderFn) => {
            if ( renderFn  ) {
                const lines = [];
                for (let x = 0; x < data.length; x++ ) {
                    lines.push(renderFn(data[x]));
                }
                const from = Math.max(lines.length-50,0);
                const to = lines.length
                this.setState({lines, from, to });                
        } else {
                const lines = data.split('\n');                
                const from = Math.max(lines.length-50,0);
                const to = lines.length
                this.setState({lines, from, to });                
            }
        });
        console.log("created");
    }


    renderLines() {
        const l = [];
        for (let x = 0; x < this.state.lines.length; x++) {
            l.push(html`<div className="line" key=${x}>${this.state.lines[x]}</div>`);
        }
        if ( l.length === 0) {
            l.push(html`<div className="line" key=${-1}>Waiting for input....</div>`);            
        }
        return l;
    }
    render() {
      return html`<div className="logviewer" >${this.renderLines()}</div>`; 
    } 
}

export { LogViewer };