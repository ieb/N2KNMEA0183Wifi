"use strict;"

class Simulator {
    constructor() {
        this.awa = 34;
        this.aws = 10.0;
        this.hdm = 45;
        this.stw = 6.0;
        this.sog = 6.0;
        this.dbt = 6.1;
        this.variation = 1.0;
        this.roll = 15.0;
        this.cogt = 10.0;
        this.latitude = 52.179921;
        this.longitude = 0.1255688;
        const d = Date.now();
        this.daysSince1970 = Math.floor(d/(3600000*24));
        this.secondsSinceMidnight = (d-this.daysSince1970*3600000*24)/1000;
        const that = this;
        setInterval(() => {
            that.awa = that.fix180(that.awa + 0.1*(Math.random()-0.50));
            that.aws = that.aws + 0.1*(Math.random()-0.50);
            that.hdm = that.fix360(that.hdm + 0.1*(Math.random()-0.50));
            that.stw = that.stw + 0.01*(Math.random()-0.50);

            that.cogt = that.cogt + 0.1*(Math.random()-0.50); 
            that.sog = that.stw + 0.5*(Math.random()-0.50); 

            that.updatePosition(1);

            const d = Date.now();
            that.daysSince1970 = Math.floor(d/(3600000*24));
            that.secondsSinceMidnight = (d-that.daysSince1970*3600000*24)/1000;
        }, 1000);

    }
    boxMullerTransform() {
        const u1 = Math.random();
        const u2 = Math.random();
        
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
        
        return { z0, z1 };
    }
    getNormallyDistributedRandomNumber(mean, stddev) {
        const { z0, _ } = this.boxMullerTransform();
        return z0 * stddev + mean;
    }
    fix180(x) {
        while ( x > 180 ) x = x - 360;
        while ( x < -180) x = x + 360;
        return x;
    }
    fix360(x) {
        while ( x > 360 ) x = x - 360;
        while ( x < 0) x = x + 360;
        return x;
    }
    updatePosition(t) {
        const lat1 = this.latitude*Math.PI/180;
        const lon1  = this.longitude*Math.PI/180;
        const brng = this.cogt*Math.PI/180;
        const d = this.sog*0.514444*t; // in m;
        const R =  6378000;
        const lat2 = Math.asin( Math.sin(lat1)*Math.cos(d/R) +
                          Math.cos(lat1)*Math.sin(d/R)*Math.cos(brng) );
        const lon2 = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat1),
                               Math.cos(d/R)-Math.sin(lat1)*Math.sin(lat2));
        this.latitude = lat2*180/Math.PI;
        this.longitude = this.fix360(lon2*180/Math.PI);

    }
}



module.exports = {
    Simulator
};




