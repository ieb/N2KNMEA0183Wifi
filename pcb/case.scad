$fn=100;




module board() {
    translate([25,3,0])
    difference() {
        union() {
           translate([0,0,0])
            cube([95,41,2]);
           // connectors
            color("blue") {
                // ESP323C
                translate([44,2,0])
                cube([18,22,6]);
                // Supply
                translate([12,33,0])
                cube([17,6,12]);

                // bms connector
                translate([29,6,2])
                cube([6,12,12]);
                
                // can cable
                translate([95,24,0])
                rotate([0,90,0]) {
                cylinder(d=7, h=50);
                }
                // serial cable
                translate([95,10,0])
                cube([50,5,3]);
            }
            // es32c3 leds
            color("red") {
                translate([58,9,0])
                cylinder(h=9,d=2);
                translate([47,14.5,0])
                cylinder(h=9,d=2);
            }          
           // switch 
            translate([-20,13,0]) {
                cube([18,13,7]);
                translate([-8,13/2,7/2])
                rotate([0,90,0])
                    cylinder(h=8,d=6);
            }
 
        };
        // holes
            translate([7,4,-2])
            cylinder(h=10,d=3);
            translate([7,37,-2])
            cylinder(h=10,d=3);
            translate([90,4,-2])
            cylinder(h=10,d=3);
            translate([90,37,-2])
            cylinder(h=10,d=3);
    }
}

module lid(w=133,d=55,h=17,t=3) {
   difference() {
        translate([w/2,d/2-4,10]) 
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
    translate([25,3,0]) {

        translate([58,9,0])
                cylinder(h=50,d=4);
        translate([47,14,0])
                cylinder(h=50,d=4);
    }
  
        board();

    }

}

module case(w=133,d=55,h=9,t=3) {
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




/*
difference() {
    union() {
        board();
        color("green") case();
        lid();
    }

   translate([10,0,0])
       cube([100,100,140], center=true);
}
*/




//board();
//color("green") case();
lid();
