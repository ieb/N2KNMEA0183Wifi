import { h, render, Component } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);
import { EditUIControl } from './uicontrol.js';
import {DataTypes, DisplayUtils } from './datatypes.js';




class NMEALayout extends Component {

    static removeOptionKeys = [ 
        "latitude",
        "longitude",
        "log",
        "tripLog",
        "gpsDaysSince1970", 
        "gpsSecondsSinceMidnight",
        "swrt",
        "lastCalc",
        "lastChange",
    ];
    static addOptionKeys = [
        "Position",
        "Log",
        "Time",
        "NMEA2000",
        "System"
    ];

    constructor(props) {
        super(props);
        this.props = props;
        this.storeAPI = props.storeAPI;
        this.mainAPI = props.mainAPI;
        this.onEditLayout = this.onEditLayout.bind(this);
        this.onAddItem = this.onAddItem.bind(this);
        this.onChangeItem = this.onChangeItem.bind(this);
        this.onSave = this.onSave.bind(this);
        this.onMenuChange = this.onMenuChange.bind(this);
        this.onPageChange = this.onPageChange.bind(this);
        this.onDumpStore = this.onDumpStore.bind(this);
        this.lastPacketsRecived  = 0;
        this.state = {
            editing: "",
            options: [],
            dataIndicatorOn: false,
            layout: this.loadLayout(),
            nmea0183Address: "no server",
            connectedClients: 0,
            packetsRecieved: 0

        };

        this.mainAPI.onPlaybackEnd(() => {
            alert("Playback has ended");
        });

        // Not in use at the moment.
        //storeAPI.onStateChange((newState) => {
        //    console.log("Got State Change", newState);
        //});


    }


    componentDidMount() {
        console.log("Register window for events");
        this.mainAPI.addListener();
        window.addEventListener('beforeunload', this.mainAPI.removeListener, false);
        this.updateInterval = setInterval((async () => {
            const packetsRecieved = await this.props.storeAPI.getPacketsRecieved();
            const nmea0183Address = await this.props.storeAPI.getNmea0183Address();
            const connectedClients = await this.props.storeAPI.getConnectedClients();
            if (this.state.packetsRecieved !== packetsRecieved ||
                this.state.nmea0183Address !== nmea0183Address ||
                this.state.connectedClients !== connectedClients
                 ) {
                this.setState({ packetsRecieved, nmea0183Address, connectedClients });
            }
        }).bind(this), 1000);
    }
    
    componentWillUnmount() {
        console.log("deRegister window for events");
        window.removeEventListener('beforeunload', this.mainAPI.removeListener, false);
        this.mainAPI.removeListener();
        if ( this.updateInterval ) {
            clearInterval(this.updateInterval);
        }
    }




    loadLayout() {
        let layout = localStorage.getItem('layout');
        if (layout) {
            const l = JSON.parse(layout);
            if (l.pageId !== undefined && l.pages !== undefined ) {
                return layout;
            }
        }
        const start = Date.now();
        if ( false ) {
            return JSON.stringify({
                    pageId: 1,
                    pages: [
                        {id: 1, name: 'Home',
                            boxes: [
                                { id: start, field:"awa", testValue: 24*Math.PI/180},
                                { id: start+1, field:"aws", testValue: 3.4},
                                { id: start+2, field:"twa", testValue: -22*Math.PI/180},
                                { id: start+3, field:"Position", testValue: { latitide: 55.322134512, longitude: 22.32112}},
                                { id: start+4, field:"engineCoolantTemperature", testValue: 325.212},
                                { id: start+5, field:"alternatorVoltage", testValue: 14.2321},
                                { id: start+6, field:"Log", testValue: { log: 4285528, tripLog: 964892 }},
                                { id: start+7, field:"polarSpeedRatio", testValue: 0.232},
                            ]}
                    ]
                });
        }
        return JSON.stringify({
                pageId: 1,
                pages: [
                    {id: 1, name: 'Home',
                        boxes: [
                            { id: start, field:"awa"},
                            { id: start+1, field:"aws"},
                            { id: start+2, field:"twa"},
                            { id: start+3, field:"Position"},
                            { id: start+4, field:"engineCoolantTemperature"},
                            { id: start+5, field:"alternatorVoltage"},
                            { id: start+6, field:"Log"},
                            { id: start+7, field:"polarSpeedRatio"},
                        ]}
                ]
            });

    }



    getLayout() {
        const layout = JSON.parse(this.state.layout);
        const page = layout.pages.find((p) => p.id === layout.pageId);
        return {
            layout,
            page
        };
    }
    setLayout(l) {
        this.setState({layout: JSON.stringify(l.layout)});
    }

    async onEditLayout( editing ) {
        if ( editing ) {
            const that = this;
            if (this.storeAPI) {
                const options = (await that.storeAPI.getKeys()).filter((key) => !NMEALayout.removeOptionKeys.includes(key)).concat(NMEALayout.addOptionKeys);
                console.log("options ", options);
                this.setState({
                    editing: "editing",
                    options
                });
            }
        } else {
            this.setState({
            editing: ""});
        }
    }
    onAddItem(e) {
        console.log("Add Item ", e.target.value);
        if ( e.target.value == "addbox" ) {
            const l = this.getLayout();
            l.page.boxes.push({id: Date.now(), field:"awa"});
            this.setLayout(l);
        } else if ( e.target.value == "addpage" ) {
            const l = this.getLayout();
            const id = Date.now();
            l.layout.pages.push({id: id, name: 'New page',
                        boxes: [
                            { id: id, field:"awa"},
                            { id: id+1, field:"aws" },
                            { id: id+2, field:"twa"},
                            { id: id+3, field:"tws"}
                        ]});
            l.layout.pageId = id;
            this.setLayout(l);
        } else if ( e.target.value == "deletepage") {
            const l = this.getLayout();
            const toRemove = l.layout.pageId;
            l.layout.pageId = undefined;
            let removed = false;
            l.layout.pages = l.layout.pages.filter((p) => {
                 if ( p.id != toRemove ) {
                    if ( !removed ) {
                        l.layout.pageId = p.id;
                    }
                    return true;
                 } else {
                    removed = true;
                    return false;
                 }
            });
            if ( l.layout.pageId === undefined && l.layout.pages.length > 0 ) {
                l.layout.pageId = l.layout.pages[0].id;
            }
            this.setLayout(l);
        }

    }


    onChangeItem(event, id, field) {
        if ( event === "remove") {
            const l = this.getLayout();
            const newBoxes = l.page.boxes.filter((b) => b.id !== id);
            l.page.boxes = newBoxes;
            this.setLayout(l);
        } else if (event === "update") {
            const l = this.getLayout();
            const box = l.page.boxes.find((b) => b.id === id);
            console.log("update ",id, field, box, l.page.boxes);
            box.id = Date.now();
            box.field = field;
            this.setLayout(l);
        } else if ( event === "size" ) {
            const l = this.getLayout();
            const box = l.page.boxes.find((b) => b.id === id);
            console.log("update ",id, field, box, l.page.boxes);
            box.id = Date.now();
            box.size = field;
            this.setLayout(l);
        }

    }
    onSave() {
        localStorage.setItem('layout', this.state.layout);
    }

    onMenuChange() {
        this.setState({ showMenu: !this.state.showMenu });

    }

    onPageChange(e) {
        const l = this.getLayout();
        l.layout.pageId = +e.target.value;
        this.setLayout(l);
    }
    onPageNameChange(e) {
        const l = this.getLayout();
        l.page.name = e.target.value;
        this.setLayout(l);        
    }


    async onDumpStore() {
        const keys = await this.storeAPI.getKeys();
        const values = {};
        for(const k of keys) {
            values[k] = await this.storeAPI.getState(k);
        }
        console.log("Store Values are",values);

    }


    renderMenu() {
        const menuClass = this.state.showMenu?"menu normal":"menu minimised";
        return html`<div className=${menuClass} >
                <${MenuButton}  storeAPI=${this.storeAPI} onClick=${this.onMenuChange} />
                <${EditUIControl} onEdit=${this.onEditLayout} 
                    onSave=${this.onSave}
                    onAddItem=${this.onAddItem}/>
                <div className="debugControls">
                  address: ${this.state.nmea0183Address}
                </div>
                <div className="debugControls">
                  connected: ${this.state.connectedClients}
                </div>
                <div className="debugControls">
                  packetsRecieved: ${this.state.packetsRecieved}
                </div>
                <div className="debugControls">
                    <button onClick=${this.onDumpStore} >DumpStore</button>
                </div>
            </div>
        `;
    }
    renderItem(item) {
        switch (item.field ) {
            case 'Position':
                return html`<${LatitudeBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing} // NB, the key must change for an existing component to be updated when properties change.
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} /> `
             case 'Log':
                return html`<${LogBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI} 
                        options=${this.state.options}/>`;
            case "Time":
                return html`<${TimeBox} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
            case "NMEA2000":
                return html`<${NMEA2000} 
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} /> `;
            case "System":
                return html`<${SystemStatus}
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing}
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;
           default:
                return html`<${TextBox}
                        field=${item.field} 
                        id=${item.id} 
                        key=${item.id+this.state.editing} 
                        size=${item.size}
                        testValue=${item.testValue}
                        onChange=${this.onChangeItem} 
                        editing=${this.state.editing}  
                        storeAPI=${this.storeAPI}
                        options=${this.state.options} />`;

        }
    }
    render() {
        const l = this.getLayout();
        const boxes = l.page.boxes.map((item) => { return this.renderItem(item); });
        return html`<div className="nmeaLayout">
                ${this.renderMenu()}
                <div>
                 ${boxes}
                </div>
            </div>`;

    }

}

class MenuButton extends Component {


    constructor(props) {
        super(props);
        this.props = props;
        this.lastPacketsRecived = 0;
        this.state = {
            dataIndicatorOn: false
        };
    }

    componentDidMount() {
        this.updateInterval = setInterval((async () => {
            const packetsRecieved = await this.props.storeAPI.getPacketsRecieved();
            if (this.lastPacketsRecived !== packetsRecieved ) {
                this.lastPacketsRecived = packetsRecieved;
                this.setState({dataIndicatorOn: !this.state.dataIndicatorOn});
            }
        }).bind(this), 1000);
    }

    componentWillUnmount() {
        if ( this.updateInterval ) {
            clearInterval(this.updateInterval);
        }
    }

    render() {
        const indicatorClass = this.state.dataIndicatorOn?"iOn":"iOff";
        return html`<button onClick=${this.props.onClick} className=${indicatorClass} >${"\u2630"}</button>`;
    }

}




class TextBox extends Component {


    constructor(props) {
        super(props);
        console.log("Create with ",props);
        this.storeAPI = props.storeAPI;
        this.editing = props.editing;
        this.onChange = props.onChange;
        this.testValue = props.testValue;
        this.id = props.id;
        this.field = props.field;
        this.theme = props.theme || "default";
        this.size = props.size || "1x";
        this.sizes = [
            "1x",
            "2x"
        ];
        this.themes = [
            "default",
            "red",
            "green",
            "blue",
            "yellow"
        ];
        this.debugEnable = false;

        this.state = {
            main: props.main || "-.-",
            graph: {
                path: "M 0 0",
                outline: "M 0 0"
            }
        }
        this.updateDisplayState = this.updateDisplayState.bind(this);
        this.changeField = this.changeField.bind(this);
        this.changeTheme = this.changeTheme.bind(this);
        this.remove = this.remove.bind(this);
        this.onDebug = this.onDebug.bind(this);
        this.changeSize = this.changeSize.bind(this);
        this.onMaximseBox = this.onMaximseBox.bind(this);
        this.updateRate = props.updateRate || 1000;
        this.options = props.options;
    }

    componentDidMount() {
        this.updateDisplayState().then(() => {
            this.updateInterval = setInterval(this.updateDisplayState, this.updateRate);
        });

    }
    
    componentWillUnmount() {
        if ( this.updateInterval ) {
            clearInterval(this.updateInterval);
        }
    }


    /*
                  <svg className="overlay">
                    <path d="M 50 50 C 20 20, 40 20, 50 10 A 30 50 0 0 1 162.55 162.45" stroke="green" stroke-width="4"  />
                  <circle cx="100" cy="100" r="20" fill="red"/>
              </svg>
    */


    async updateDisplayState() {

        if ( this.storeAPI ) {
            const dataType = DataTypes.getDataType(this.field);
            const value = this.testValue || await this.storeAPI.getState(this.field);
            const display = dataType.display(value);


            const displayClass = dataType.cssClass?dataType.cssClass(value):'';

            const h = [];
            const v = await this.storeAPI.getHistory(this.field);
            this.debug(this.field, "Values", v, value);
            if (dataType.withHistory && v &&  v.data.length > 1) {
                h.push(dataType.toDisplayUnits(v.value));
                for (let i = 0; i < v.data.length; i++) {
                    if ( v.data[i] !== undefined && !Number.isNaN(v.data[i])) {
                        h.push(dataType.toDisplayUnits(v.data[i]));
                    }
                }
                const graph = this.generateGraphPath(v, h);
                if ( display != this.state.main || graph.path != this.state.graph.path ) {
                    this.setState({main: display, graph: graph, displayClass: displayClass });
                }  
            } else {
                if ( display != this.state.main ) {
                    this.setState({main: display, displayClass: displayClass  });
                }
            }
        }    

    }

    horizontalLine(v, range) {
        const y = DisplayUtils.y(v, range).toFixed(0);
        return `M 0 ${y} L 320 ${y}`;
    }


    generateGraphPath(v, h) {
        if ( h && h.length > 1 ) {
            const pairs = [];
            const dataType = DataTypes.getDataType(this.field);
            // get the range in sensor units, not display units
            const range = dataType.range(h);
            this.debug(this.field, "Range", h, range);

            if ( range ) {
                // calculate the pairs in screen co-ordinates.
                for(let i = 0; i < h.length; i++) {
                    const x=DisplayUtils.x(i, range).toFixed(0);
                    const y=DisplayUtils.y(h[i], range).toFixed(0);
                    pairs.push(`${x} ${y}`);
                }
                pairs.push(pairs[pairs.length-1]);
                this.debug(this.field, "Pairs", pairs);

                const lastX = DisplayUtils.x(h.length-1, range).toFixed(0);
                const path = `M ${pairs[0]} L ${pairs.join(",")}`; 
                const outline = `M 0 180 L ${pairs.join(",")}, ${lastX} 180 z`; 

                const mean = dataType.toDisplayUnits(v.mean);
                const stdDev = dataType.toDisplayUnits(v.stdev);
                if ( mean === undefined ) {
                    console.log("Line 546", dataType, v, v.mean, mean);
                }
                const meanTxt = (mean!==undefined)?mean.toFixed(1):"-.-";
                const stdDevTxt = (stdDev!==undefined)?stdDev.toFixed(1):"-.-";
                const meanLine = this.horizontalLine(mean, range);
                const stdTopLine = this.horizontalLine(mean+stdDev, range);
                const stdBottomLine = this.horizontalLine(mean-stdDev, range);
                if ( path.includes("Infinity") || path.includes("NaN") ) {
                    console.log(this.field, range, "path", path);
                }
                if ( meanLine.includes("Infinity") || meanLine.includes("NaN") ) {
                    console.log(this.field, range, "meanLine", meanLine);
                }
                if ( stdTopLine.includes("Infinity") || stdTopLine.includes("NaN")) {
                    console.log(this.field, range, "stdTopLine", stdTopLine);
                }
                if ( outline.includes("Infinity") || outline.includes("NaN") ) {
                    console.log(this.field, range, "outline", outline);
                }
                return {
                    path,
                    outline,
                    meanTxt,
                    stdDevTxt,
                    meanLine,
                    stdTopLine,
                    stdBottomLine
                };                           
            } else {
                this.debug(this.field, "no range, no graph");
            }
        } else {
            this.debug(this.field, "no history, no graph");
        }
        return {
            path: "M 0 0",
            outline: "M 0 0",
            meanTxt: "",
            stdDevTxt: "",
            meanLine: "M 0 0",
            stdTopLine: "M 0 0",
            stdBottomLine: "M 0 0"
        };
    }

    changeField(e) {
        this.onChange("update", this.id, e.target.value);
    }
    changeTheme(e) {
        this.onChange("theme", this.id, e.target.value);
    }
    changeSize(e) {
        this.onChange("size", this.id, e.target.value);
    }
    remove() {
        this.onChange("remove", this.id);
    }
    debug(...msg) {
        if (this.debugEnable) {
            console.log(msg);
        }
    }
    onDebug() {
        this.debugEnable = !this.debugEnable;
    }
    onMaximseBox() {
        console.log("Maximise clicked");
        if ( this.state.sizeClass !== "size-maximum") {
            this.setState({sizeClass: "size-maximum"});
        } else {
            this.setState({ sizeClass: "size-normal"});
        }
    }
    getSizeClass() {
        if ( this.state.sizeClass ) {
            return this.state.sizeClass;
        } else if ( this.size === "2x") {
            return "size-maximum";
        }
        return "size-normal";
    }
    renderEditOverlay() {
        if ( this.editing === "editing" ) {
            const options1 = this.options.map((item) => html`<option key=${item} value=${item} >${item}</option>`);
            const options2 = this.sizes.map((item) => html`<option key=${item} value=${item} >${item}</option>`);
            
            return html`
                <div className="overlay edit">
                <select onChange=${this.changeField} value=${this.field} title="select data item" >
                    ${optons1}
                </select>
                <select onChange=${this.changeSize} value=${this.size} title="change size" >
                    ${options2}
                </select>
                <button onClick=${this.remove} title="remove">${"\u2573"}</button>
                <button onClick=${this.onDebug} title="debug" >debug</button>
                </div>`;

        } else {
            return html`<div></div>`;
        }
    } 

    renderControls() {
        return html`
            <div>
            <button onClick=${this.onMaximseBox} title="maximise" >${"\u26F6"}</button>
            </div>`;
    }

    render() {
        const dataType = DataTypes.getDataType(this.field);
        const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
        const classNames = ["overlay", "main"].concat(this.state.displayClass?this.state.displayClass:'').join(" ");
        return html`
            <div className=${themes} >
              <div className=${classNames}>${this.state.main}</div>
              <svg className="overlay" viewBox="0 0 320 180">
                    <path d=${this.state.graph.path} className="path"  />
                    <path d=${this.state.graph.outline} className="outline"  />
                    <path d=${this.state.graph.meanLine} className="meanline"  />
                    <path d=${this.state.graph.stdTopLine} className="stdtopline"  />
                    <path d=${this.state.graph.stdBottomLine} className="stdbottomline"  />
                    <text x="5" y="10" className="small">${this.state.graph.meanTxt}</text>
                    <text x="5" y="20" className="small">${this.state.graph.stdDevTxt}</text>
              </svg>
              <div className="corner tl">${dataType.tl}</div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">${DataTypes.getDisplayName(this.field)}</div>
              <div className="corner br">${dataType.units}</div>
              ${this.renderEditOverlay()}
            </div>
            `;
    }
}

class LogBox extends TextBox {


    constructor(props) {
        super(props);
        this.testValue = props.testValue;
    }

    async getDisplayValue(field) {
        if ( this.testValue && this.testValue[field] ) {
            return DataTypes.getDataType(field).display(this.testValue[field]);
        }
        return DataTypes.getDataType(field).display(await this.storeAPI.getState(field));
    }

    async updateDisplayState() {
        if ( this.storeAPI ) {
            this.debug(this.field, "Update State");
            const logDisplay = await this.getDisplayValue("log");
            const tripLogDisplay = await this.getDisplayValue("tripLog");
            if ( logDisplay !== this.state.logDisplay || 
                  tripLogDisplay !== this.state.tripLogDisplay) {
                    this.setState({
                         logDisplay,
                         tripLogDisplay});
            }
        }        
    }

    render() {
        const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
        return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.logDisplay}</div>
                <div className="smallLine2" >${this.state.tripLogDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">log/trip</div>
              <div className="corner br">Nm</div>
              ${this.renderEditOverlay()}
            </div>
            `;
    }


}

class TimeBox extends TextBox {


    constructor(props) {
        super(props);
        this.testValue = props.testValue;
    }

    async getDisplayValue(field) {
        if ( this.testValue && this.testValue[field] ) {
            return DataTypes.getDataType(field).display(this.testValue[field]);
        }
        return DataTypes.getDataType(field).display(await this.storeAPI.getState(field));
    }

    async updateDisplayState() {
        if ( this.storeAPI ) {
            this.debug(this.field, "Update State");
            const dateDisplay = await this.getDisplayValue("gpsDaysSince1970");
            const timeDisplay = await this.getDisplayValue("gpsSecondsSinceMidnight");
            if ( dateDisplay !== this.state.dateDisplay || 
                  timeDisplay !== this.state.timeDisplay) {
                    this.setState({
                         dateDisplay,
                         timeDisplay });
            }
        }        
    }

    render() {
        const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
        return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.dateDisplay}</div>
                <div className="smallLine2" >${this.state.timeDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">Time</div>
              <div className="corner br">UTC</div>
              ${this.renderEditOverlay()}
            </div>
            `;
    }


}

class LatitudeBox extends TextBox {


    constructor(props) {
        super(props);
        this.testValue = props.testValue;
    }

    async getDisplayValue(field) {
        if ( this.testValue && this.testValue[field] ) {
            return DataTypes.getDataType(field).display(this.testValue[field]);
        }
        return DataTypes.getDataType(field).display(await this.storeAPI.getState(field));
    }

    async updateDisplayState() {
        if ( this.storeAPI ) {
            this.debug(this.field, "Update State");
            const latitudeDisplay = await this.getDisplayValue("latitude");
            const longitudeDisplay = await this.getDisplayValue("longitude");
            if ( latitudeDisplay !== this.state.latitudeDisplay || 
                  longitudeDisplay !== this.state.longitudeDisplay) {
                    this.setState({
                         latitudeDisplay,
                         longitudeDisplay});
            }
        }        
    }

    render() {
        const themes = `textbox ${this.theme} ${this.getSizeClass()} `;
        return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="smallLine1" >${this.state.latitudeDisplay}</div>
                <div className="smallLine2" >${this.state.longitudeDisplay}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">position</div>
              <div className="corner br"></div>
              ${this.renderEditOverlay()}
            </div>
            `;
    }


}

class SystemStatus extends TextBox {

    constructor(props) {
        super(props);
        this.testValue = props.testValue;
        this.state.nmea0183Address = "none";
        this.state.packetsRecieved = 0;
        this.state.connectedClients = 0;
    }

    async getDisplayValue(field) {
        if ( this.testValue && this.testValue[field] ) {
            return DataTypes.getDataType(field).display(this.testValue[field]);
        }
        return DataTypes.getDataType(field).display(await this.storeAPI.getState(field));
    }

    async updateDisplayState() {
        if ( this.storeAPI ) {
            this.debug(this.field, "Update State");
            const packetsRecieved = await this.storeAPI.getPacketsRecieved();
            const nmea0183Address = await this.storeAPI.getNmea0183Address();
            const connectedClients = await this.storeAPI.getConnectedClients();
            this.setState({
                packetsRecieved,
                nmea0183Address,
                connectedClients
            });
        }      
    }

    render() {
        const themes = `textbox appStatus ${this.theme} ${this.getSizeClass()} `;
        return html`
            <div className=${themes} >
              <div className="overlay main">
                <div className="statusData" >tcp: ${this.state.nmea0183Address}</div>
                <div className="statusData" >clients: ${this.state.connectedClients}</div>
                <div className="statusData" >packets: ${this.state.packetsRecieved}</div>
              </div>
              <div className="corner tl"></div>
              <div className="corner tr">${this.renderControls()}</div>
              <div className="corner bl">status</div>
              <div className="corner br"></div>
              ${this.renderEditOverlay()}
            </div>
            `;
    }


}

class NMEA2000 extends TextBox {


    constructor(props) {
        super(props);
        this.testValue = props.testValue;
    }

    async getDisplayValue(field) {
        if ( this.testValue && this.testValue[field] ) {
            return DataTypes.getDataType(field).display(this.testValue[field]);
        }
        return DataTypes.getDataType(field).display(await this.storeAPI.getState(field));
    }

    async updateDisplayState() {
        if ( this.storeAPI ) {
            const messages = await this.storeAPI.getMessages();
            this.setState({
                nmea2000Data: messages
            });
        } else {
            console.log("No store API");
        }       
    }

    renderMessages() {
        if ( this.state.nmea2000Data ) {
            const l = [];
            for(var pgn in this.state.nmea2000Data ) {
                const message = this.state.nmea2000Data[pgn];
                const m = [];
                for(var k in message) {
                    if ( message[k].id !== undefined ) {
                        m.push(`${k}: ${message[k].name}(${message[k].id})`)
                    } else {
                        m.push(`${k}: ${message[k]}`);
                    }
                }



                l.push(html`<div key=${pgn} >${m.join(' ')}</div>`)
            }
            return html`
                <div>
                    ${l}
                </div>
            `;
        } else {
            return html`
                <div>
                    No Messages
                </div>
            `;
        }
    }

    render() {
        const themes = `textbox nmea2000Messages ${this.theme} ${this.getSizeClass()} `;
        return html`
            <div className=${themes} >
              ${this.renderMessages()}
              ${this.renderEditOverlay()}
            </div>
            `;
    }

}




export { NMEALayout };