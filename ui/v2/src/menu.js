import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);


class Menu  extends Component {
    constructor(props) {
        super(props);
        this.currentView = props.locationProperties.view || "main";
        const propsArr = [];
        for(let k in props.locationProperties) {
            if ( k !== 'view' ) {
                propsArr.push(`${encodeURIComponent(k)}=${encodeURIComponent(props.locationProperties[k])}`);
            }
        }
        this.propsAsString = propsArr.join('&');
    }


    async componentDidMount() {
    }
    
    componentWillUnmount() {
    }

    render() {

        const mainUrl = `?view=main&${this.propsAsString}`;
        const storeUrl = `?view=dump-store&${this.propsAsString}`;
        const framesUrl = `?view=can-frames&${this.propsAsString}`;
        const messagesUrl = `?view=can-messages&${this.propsAsString}`;
        const logsUrl = `?view=debug-logs&${this.propsAsString}`;
        const adminUrl = `?view=admin&${this.propsAsString}`;
        return html`
            <div className="topmenu" >
                <a href="${mainUrl}">Main</a>
                <a href="${storeUrl}">Store</a>
                <a href="${framesUrl}">Frames</a>
                <a href="${messagesUrl}">Messages</a>
                <a href="${logsUrl}">Logs</a>
                <a href="${adminUrl}">Admin</a>
            </div> `;
    }
}


export { Menu };