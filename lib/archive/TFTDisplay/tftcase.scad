$fn=100;
dw=109;
dd=63;
w=dw+20;
d=dd+8;
r=3;
h=9;
clearance=1;
module tftDisplay() {
    union() {
    cube([110,64,7.7]);
    translate([4,0,5])
        cube([100,64,2.7]);
    }
}
module tftWindow() {
    translate([8.5,0.5+2.5,0])
    cube([85,58,15]);
}    

module touchSwitch() {
    cube([13,22,9]);
}
module case() {
    difference() {
    union() {
        translate([0,r,0])
        cube([w,d-2*r,h]);
        translate([r,0,0])
        cube([w-2*r,d,h]);
        translate([r,r,0])
        
        cylinder(r=r,h=h);
        translate([w-r,r,0])
        cylinder(r=r,h=h);
        translate([w-r,d-r,0])
        cylinder(r=r,h=h);
        translate([r,d-r,0])
        cylinder(r=r,h=h);
        
        
    }

    translate([4,4,-0.1]) {
        tftDisplay();
        tftWindow();
    }

    
  
    // cutout for touch sensors
    translate([112,5,-0.1])
    cube([15,61,7]);

    //translate([120,5,-0.1])
    //cube([15,61,19]);

    }

}

case();


/*
color("blue")
translate([4,4,0]) {
tftDisplay();
//tftWindow();
}


color("red")
translate([114.5,5,7-2.5])
cube([12,21,2.5]);
*/
