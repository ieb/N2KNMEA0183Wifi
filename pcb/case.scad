$fn=100;




module board() {
    
    difference() {
        union() {
           translate([0,0,0])
            cube([120,41,2]);
           // connectors
            color("blue") {
                // ESP323C
                translate([37,12,0])
                cube([18,22,6]);
                // 6N137
                translate([21,11,0])
                cube([8,9,6]);
                // 6N137
                translate([21,22,0])
                cube([8,9,6]);
                // DCDC
                translate([63,6,0])
                cube([18,11,7]);

                // bms connector
                translate([-0.5,15,2])
                cube([8,13,6]);
                
                // can cable
                translate([125,21,7])
                rotate([0,90,0]) {
                cylinder(d=7, h=50);
                    translate([3,0,0])
                cube([5,6,50], center=true);
                }
            }
            // es32c3 leds
            color("red") {
                translate([50,19,0])
                cylinder(h=9,d=2);
                translate([40,24.5,0])
                cylinder(h=9,d=2);
            }           


        };
            translate([4,4,-2])
            cylinder(h=10,d=3);
            translate([4,37,-2])
            cylinder(h=10,d=3);
            translate([115,4,-2])
            cylinder(h=10,d=3);
            translate([115,37,-2])
            cylinder(h=10,d=3);
    }
}

module lid(w=133,d=50,h=12,t=3) {
   difference() {
        translate([w/2,d/2-4,8]) 
      difference() {
        union() {
            difference() {
                union() {
                    cube([w-t*2,d,h], center=true);
                    cube([w,d-t*2,h], center=true);
                    translate([w/2-t,d/2-t,0])
                    cylinder(r=t,h=h, center=true);
                    translate([-(w/2-t),d/2-t,0])
                    cylinder(r=t,h=h, center=true);
                    translate([-(w/2-t),-(d/2-t),0])
                    cylinder(r=t,h=h, center=true);
                    translate([w/2-t,-(d/2-t),0])
                    cylinder(r=t,h=h, center=true);
                    

                }
                // inside
                translate([0,0,-t*2])
                    cube([w-t*2,d-t*2,h+t*2], center=true);
            }
            
            

            
            // fxings
            translate([w/2-2*t,d/2-2*t,0])
                    cylinder(r=5,h=h, center=true);
            translate([-(w/2-2*t),d/2-2*t,0])
                    cylinder(r=5,h=h, center=true);
            translate([-(w/2-2*t),-(d/2-2*t),0])
                    cylinder(r=5,h=h, center=true);
                    translate([w/2-2*t,-(d/2-2*t),0])
                    cylinder(r=5,h=h, center=true);
        }
        
            translate([w/2-2*t,d/2-2*t,0])
                    cylinder(d=3,h=h+10, center=true);
            translate([-(w/2-2*t),d/2-2*t,0])
                    cylinder(d=3,h=h+10, center=true);
            translate([-(w/2-2*t),-(d/2-2*t),0])
                    cylinder(d=3,h=h+10, center=true);
                    translate([w/2-2*t,-(d/2-2*t),0])
                    cylinder(d=3,h=h+10, center=true);
    }
    



        // led
        translate([50,19,0])
                cylinder(h=50,d=4);
                translate([40,24.5,0])
                cylinder(h=50,d=4);
  
        board();

    }

}

module case(w=133,d=50,h=9,t=3) {
   difference() {
   translate([w/2,d/2-4,-2.6]) 
      difference() {
        union() {
            difference() {
                union() {
                    cube([w-t*2,d,h], center=true);
                    cube([w,d-t*2,h], center=true);
                    translate([w/2-t,d/2-t,0])
                    cylinder(r=t,h=h, center=true);
                    translate([-(w/2-t),d/2-t,0])
                    cylinder(r=t,h=h, center=true);
                    translate([-(w/2-t),-(d/2-t),0])
                    cylinder(r=t,h=h, center=true);
                    translate([w/2-t,-(d/2-t),0])
                    cylinder(r=t,h=h, center=true);
                    

                }
                // inside
                translate([0,0,t])
                    cube([w-t*2,d-t*2,h+t], center=true);
            }
            

            // fxings
            translate([w/2-2*t,d/2-2*t,0])
                    cylinder(r=5,h=h, center=true);
            translate([-(w/2-2*t),d/2-2*t,0])
                    cylinder(r=5,h=h, center=true);
            translate([-(w/2-2*t),-(d/2-2*t),0])
                    cylinder(r=5,h=h, center=true);
                    translate([w/2-2*t,-(d/2-2*t),0])
                    cylinder(r=5,h=h, center=true);
        }
        
            translate([w/2-2*t,d/2-2*t,0])
                    cylinder(d=3,h=h+10, center=true);
            translate([-(w/2-2*t),d/2-2*t,0])
                    cylinder(d=3,h=h+10, center=true);
            translate([-(w/2-2*t),-(d/2-2*t),0])
                    cylinder(d=3,h=h+10, center=true);
                    translate([w/2-2*t,-(d/2-2*t),0])
                    cylinder(d=3,h=h+10, center=true);
        }
        board();
        
        
    }
}
module cables() {
    /*
    translate([-90,-15,10])
    rotate([0,90,0])
    cylinder(d=2,h=90);
    
    translate([-90,15,10])
    rotate([0,90,0])
    cylinder(d=4,h=90);
*/
    translate([45,0,4.5])
            cube([20,17,8], center=true);


/*
    translate([-90,0,0])
    rotate([0,90,0])
    cylinder(d=4,h=90);

    color("red")
    translate([0,0,0])
    rotate([0,90,0])
    cylinder(d=7,h=90);
    */
}





difference() {
    union() {
        board();
        color("green") case();
        //lid();
    }

   translate([-50,0,0])
   cube([100,100,140], center=true);
}




//board();
//color("green") case();
//lid();
