# PCBs

There are 2 variant, one for an ESP32 WROOM board and one for ESP32-C3 boards. 2 PCBs for the later one using the 18n pin waveshare module and the other using a generic 16 pin module from ebay.

The BMS serial is isolated with a pair of 6N137s as 0v of the BMS will likely not be 0V of the Canbus due to current flowing from the battery pack.  The device is powered from the canbus which is driven through a TJ1050.  The preferred board is one of the ESP32-C3 boards which are more compact and better designed.


# Gcode generation.

For each board, in KiCad
* generate gerbers for front, back and edge.
* generate 1 drill file with all drills.
* Turn of X2 gerber commands as this creates codes that pcb2gcode wont understand.
* decide on where the mirror line will be, default is X=60, which uses a lot of bed space, sometimes best to use a midpoint on X.
* decide where the alignment holes will be, default is +-10 from the mirror, any y10,80. 4 in total.
* run

        ./createGCode.sh <boardname> <mirrorX> <alignOffsetX>  <alignLowerY> <alignUpperY>
        where:
            boardname is the name of the board
            mirrorX is the X of the mirror line, default 60.
            alignOffsetX is the X distance of alignment holes from the mirror line, default = 10
            alignLowerY is the lower Y position default = 10
            alignUpperY is the upper Y position default = 80

* check the output at https://ncviewer.com/

# Milling

NM grbl 0.9 doesnt process M6 or G81 so both are to be disabled during gcode generation.


* mill the fron side,
* drill alignment
* flip and align
* mill backside
* flip and align
* drill from the frontside


