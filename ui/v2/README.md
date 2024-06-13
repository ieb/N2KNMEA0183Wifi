# UI

Originally, this has to be packed into the flash partion of an ESP32, and so it cant be big. For that reason it uses preact with no build and no JSX to keep the size down.

JS for the application using this approach is 40KB (11KB gziped), vs 1MB when using React + Webpack in a Electron app. The best I could get with preact + standard Parcel/Webpak/Vite was 400KB.

However, its now been converted into a install-able PWA, which removes some of the size limitation. Layouts are stored in localstorage on the device, and the app connects over CORS using a websocket. Installation must be done on localhost as the ESP32 does not support https and pwas must be installed from a https service, except for localhost. Trying to connect to a http websocket from a https installed PWA is blocked as being insecure. It is, but is anyone really going sniff packets on a disconnected network at sea ? (Famous last words.)

To install on a chromebook or work locally the best solution found so far is to use https://github.com/kzahel/web-server-chrome which is a ChromeOS app that runs a webserver. It only works on Chromebooks now that Google chose to remove the ability to serve a socket. Its unlikely to be possible to run an android app or linux container on a ChromeOS on localhost, since neither are on localhost. For how long this works, who knows.

# Changes

* Reworked the menu system and editing layouts to use localstorage rather than the ESP32 flash.

To develop 

    npm start
    open http://localhost:8080
    <edit save refresh, no auto refresh, sorry>

To build

    npm build


