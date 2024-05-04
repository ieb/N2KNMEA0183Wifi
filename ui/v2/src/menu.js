import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);


class Menu  extends Component {
    constructor(props) {
        super(props);
        if ( props.locationProperties.host ) {
            this.apiUrl = `http://${props.locationProperties.host}`;
        } else {
            this.apiUrl = '';
        }

        this.currentView = props.locationProperties.view || "main";
        const propsArr = [];
        for(let k in props.locationProperties) {
            if ( k !== 'view' && k != 'layout' ) {
                propsArr.push(`${encodeURIComponent(k)}=${encodeURIComponent(props.locationProperties[k])}`);
            }
        }
        this.propsAsString = propsArr.join('&');
        this.state = {
            layoutList: [],
            layoutName: props.locationProperties.layout || "local"
        };

    }


    async componentDidMount() {
        await this.updateFileSystem();
    }
    

    async updateFileSystem() {
        const response = await fetch(`${this.apiUrl}/api/layouts.json`, {
            credentials: "include"
        });
        if ( response.status == 200 ) {
            const dir = await response.json();
            this.setState({
                layoutList: dir.layouts
            });            
        }
    }

    componentWillUnmount() {
    }
    generateLayoutMenu() {
        if ( this.state.layoutList == undefined || this.state.layoutList.length == 0) {
            return html`No saved layouts available`;
        }
        const layoutMenu = [];
        for(let x = 0; x < this.state.layoutList.length; x++) {
            layoutMenu.push(html`<a key=${x} 
                    href="?view=main&layout=${encodeURIComponent(this.state.layoutList[x])}&${this.propsAsString}">
                    ${this.state.layoutList[x]}
                    </a>`);
        }
        return layoutMenu;
    }


    render() {
        const mainUrl = `?view=main&${this.propsAsString}`;
        const storeUrl = `?view=dump-store&${this.propsAsString}`;
        const framesUrl = `?view=can-frames&${this.propsAsString}`;
        const messagesUrl = `?view=can-messages&${this.propsAsString}`;
        const logsUrl = `?view=debug-logs&${this.propsAsString}`;
        const adminUrl = `?view=admin&${this.propsAsString}`;


        return html`
        <div class="navbar">
             <div class="nav-info">${this.state.layoutName} page</div>
             <div class="nav-item">
                <a href="${mainUrl}">Page Layout </a>
                <div class="dropdown-content">
                    ${this.generateLayoutMenu()}
                </div>
            </div>
            <div class="nav-item"><a href="${storeUrl}">Store</a></div>
            <div class="nav-item"><a href="${framesUrl}">Frames</a></div>
            <div class="nav-item"><a href="${adminUrl}">Admin</a></div>
        </div>`;

    }
}


export { Menu };