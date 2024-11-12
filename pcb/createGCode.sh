#!/bin/bash

# Kicad files needed, front back, edge boardname
# Put all the drils into 1 file
# turn of X2 as it creates codes that are not understood.
# decide where the mirror line will be default is X=60
# decide where the alignment holes will be, default +-10 from the mirror, and at 10,80 y. 4 in total.
#
# grbl 0.9 doesnt process M6 or G81 so both need to be disabled.
# Check the output at https://ncviewer.com/
# Milling, 
# Mill the front side
# drill alignment holes on the mirror line.
# Flip and align.
# mill the backside
# Flip and align
# Drill the back side.

boardname=$1
mirror=${2:-60}
alignoffset=${3:-10}
bottomalign=${4:-10}
topalign=${5:-80}

rm -rf ${boardname}-cnc
mkdir -p ${boardname}-cnc

pcb2gcode \
  --back ${boardname}-B_Cu.gbr \
  --front ${boardname}-F_Cu.gbr \
  --outline ${boardname}-Edge_Cuts.gbr \
  --drill ${boardname}.drl \
  --metric \
  --nog81 \
  --nom6  \
  --metricoutput \
  --mirror-axis ${mirror} \
  --x-offset 0.0 \
  --y-offset 0.0 \
  --zero-start 1 \
  --zsafe 2.0 \
  --zdrill -3.0 \
  --drill-feed 50.0 \
  --drills-available 0.8 1.0 3.0 \
  --offset 0.1 \
  --mill-diameters 0.3 \
  --milling-overlap 20% \
  --isolation-width 20 \
  --zwork -0.02 \
  --mill-feed 200 \
   --mill-vertfeed 100 \
   --mill-infeed 100 \
   --output-dir ${boardname}-cnc \
   --zchange 25 \
   --drill-speed 4000 \
   --mill-speed 4000 \
   --zcut -1.0 \
   --cutter-diameter 2.0 \
   --cut-feed 50 \
   --cut-infeed 50 \
   --cut-speed 4000  



alignlx=$(echo ${mirror}-${alignoffset} @4 | bc)
alignhx=$(echo ${mirror}+${alignoffset} @4 | bc)
alignly=$(echo ${bottomalign} @4 | bc)
alignhy=$(echo ${topalign} @4 | bc)

cat << EOF > ${boardname}-cnc/align.ngc
( pcb2gcode 2.5.0 )
( Software-independent Gcode )

( This file uses 1 drill bit sizes. )
( Bit sizes: [3mm] )

G94       (Millimeters per minute feed rate.)
G21       (Units == Millimeters.)
G91.1     (Incremental arc distance mode.)
G90       (Absolute coordinates.)
G00 S4000     (RPM spindle speed.)

G00 Z25.00000 (Retract)
T1
M5      (Spindle stop.)
G04 P1.00000
(MSG, Change tool bit to drill size 1mm)
M0      (Temporary machine stop.)
M3      (Spindle on clockwise.)
G0 Z2.00000
G04 P1.00000
G1 F50.00000
G0 X${alignlx} Y${alignly}
G1 Z-3.00000
G1 Z2.00000
G0 X${alignhx} Y${alignly}
G1 Z-3.00000
G1 Z2.00000
G0 X${alignhx} Y${alignhy}
G1 Z-3.00000
G1 Z2.00000
G0 X${alignlx} Y${alignhy}
G1 Z-3.00000
G1 Z2.00000
G80

G00 Z25.000 ( All done -- retract )

M5      (Spindle off.)
G04 P1.000000
M9      (Coolant off.)
M2      (Program end.)
EOF