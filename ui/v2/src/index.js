import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

import { NMEALayout } from './layout.js';
import { Logs } from './logs.js';
import { StoreView, FrameView } from './storeview.js';
import { StoreAPIImpl, MainAPIImpl } from './n2kmodule.js';

const rootElement = document.getElementById('root');

const storeAPI = new StoreAPIImpl();
storeAPI.start();
const mainAPI = new MainAPIImpl();



if ( window.location.hash ===  "#view-dump-store") {
   render(html`<${StoreView} title="Store" storeAPI=${storeAPI}  > </StoreView>`, rootElement);
} else if ( window.location.hash ===  "#view-can-frames") { 
    render(html`<${FrameView} title="CAN Frames" mainAPI=${mainAPI} > </FrameView>`, rootElement);
} else if ( window.location.hash ===  "#view-can-messages") { 
   render(html`<${Logs} title="CAN Messages" mainAPI=${mainAPI} enableFeed=${mainAPI.onCanMessage} > </Logs>`, rootElement);
} else if ( window.location.hash ===  "#view-debug-logs") { 
   render(html`<${Logs} title="Debug Logs" mainAPI=${mainAPI} enableFeed=${mainAPI.onLogMessage} > </Logs>`, rootElement);
} else {
   render(html`<${NMEALayout} mainAPI=${mainAPI} storeAPI=${storeAPI} > </NMEALayout>`, rootElement);
}



