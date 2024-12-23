# On device UI

Basic UI for the BMs minimizing dependencies as there is limited flash available on the device.

# Install into Flash

Where possible the files are gzipped, as the Azyng web server code supports serving from flash gzipped without decompression.

     ./initialiseFlash.sh

This will rebuild the disk image for flash and upload it over serial using pio.

    ./redeployUI.sh

This will process and upload the UI files over http without resetting the flash.
