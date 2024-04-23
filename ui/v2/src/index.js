import { h, render } from './deps/preact/preact.module.js';
import htm from './deps/htm/index.module.js';
const html = htm.bind(h);

import { NMEALayout } from './layout.js';
import { Logs } from './logs.js';
import { StoreView, FrameView } from './storeview.js';
import { StoreAPIImpl, MainAPIImpl } from './n2kmodule.js';

const getLocationProperties = () => {
   const props = {};
   console.log(window.location);
   let p = [];
   if ( window.location.hash.startsWith('#')) {
      p = window.location.hash.substring(1).split(",");
   } else if ( window.location.search.startsWith('?') ) {
      p = window.location.search.substring(1).split("&");
   }
   for (var i = 0; i < p.length; i++) {
      const kv = p[i].split('=',2);
      props[kv[0]] = decodeURIComponent(kv[1]);
   }
   console.log("URL properties", props);
   return props;
}

const rootElement = document.getElementById('root');


const storeAPI = new StoreAPIImpl();
const properties = getLocationProperties();
storeAPI.start(properties.host);
const mainAPI = new MainAPIImpl();



if ( properties.view ===  "dump-store") {
   render(html`<${StoreView} title="Store" storeAPI=${storeAPI}  > </StoreView>`, rootElement);
} else if ( properties.view ===  "can-frames") { 
    render(html`<${FrameView} title="CAN Frames" mainAPI=${mainAPI} > </FrameView>`, rootElement);
} else if ( properties.view ===  "can-messages") { 
   render(html`<${Logs} title="CAN Messages" mainAPI=${mainAPI} enableFeed=${mainAPI.onCanMessage} > </Logs>`, rootElement);
} else if ( properties.view ===  "debug-logs") { 
   render(html`<${Logs} title="Debug Logs" mainAPI=${mainAPI} enableFeed=${mainAPI.onLogMessage} > </Logs>`, rootElement);
} else {
   render(html`<${NMEALayout} mainAPI=${mainAPI} storeAPI=${storeAPI} > </NMEALayout>`, rootElement);
}



