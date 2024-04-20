# UI

This has to be packed into the flash partion of an ESP32, and so it cant be big. For that reason it uses preact with no build and no JSX to keep the size down.

JS for the application using this approach is 40KB (11KB gziped), vs 1MB when using React + Webpack in a Electron app. The best I could get with preact + standard Parcel/Webpak/Vite was 400KB.

To develop 

    npm start
    open http://localhost:8080
    <edit save refresh, no auto refresh, sorry>

To build

    npm build
