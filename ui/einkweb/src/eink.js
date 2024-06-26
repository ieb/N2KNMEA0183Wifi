
try {
    var debugEl = document.getElementById("debug");
    debug = () => {};
    if ( debugEl ) {
        debug = (msg) => {
            if ( typeof msg === 'string') {
                debugEl.value = debugEl.value+"\n"+msg;
            } else if ( JSON ) {
                debugEl.value = debugEl.value+"\n"+JSON.stringify(msg);
            } else {
                debugEl.value = debugEl.value+"\n"+msg;
            }
        };
    }
} catch (e) {
    document.getElementById("debug").value = document.getElementById("debug").value + "\nFailed Fixes\n"+e;
}
isKindle = (Object.create === undefined);
debug("Kindle: "+isKindle);

// perform extension of a class
function extend(extension, base ) {
    for (var fn in base.prototype) {
        extension.prototype[fn] = base.prototype[fn];
    }
    extension.prototype.constructor = extension;
}

EInkDataStoreFactory = function(options) {
    this.dataStores = {};
}

EInkDataStoreFactory.prototype.getStore = function(d, path) {
    if ( d && !this.dataStores[path]) {
        if (d.meta !== undefined && d.meta.units === "rad") {
            this.dataStores[path] = new EInkCircularStats();
        } else {
            this.dataStores[path] = new EInkStats();
        }
    }
    return this.dataStores[path];
};


FlowLayout = function(rows, cols) {
    this.rows = rows;
    this.cols = cols;
    this.row = 0;
    this.col = 0;
    this.page = -1;
    this.pages = [];
    this.newPage();
};

FlowLayout.prototype.append = function(box) {
    this.pages[this.page].push(box);
    box.x = this.col;
    box.y = this.row;
    this.next();
};

FlowLayout.prototype.setPageSize = function(w, h) {
    for(var p = 0; p < this.pages.length; p++) {
        for ( var i = 0; i < this.pages[p].length; i++) {
            this.pages[p][i].setSize(this.cols,this.rows, w, h);
        }
    }
}

FlowLayout.prototype.setPageTitle = function(title) {
    this.pages[this.page].title = title;
};

FlowLayout.prototype.newPage = function() {
    this.page++;
    this.row = 0;
    this.col = 0;
    this.pages[this.page] = [];
    this.setPageTitle("Page "+this.page);
};


FlowLayout.prototype.next = function() {
    this.col++;
    if ( this.col >= this.cols) {
        this.col = 0;
        this.row++;
        if (this.row >= this.rows) {
            this.newPage();
        }
    }
};


EInkDrawingContext = function(options) {
    this.dataStoreFactory = new EInkDataStoreFactory();
    this.canvas = options.canvas;
    this.body = options.body;
    this.themes = options.themes || {};
    this.layout = options.layout;
    this.page = 0;
    this.ctx = canvas.getContext("2d");
    this.setTheme(options.theme || "default");


    if ( options.width == undefined || options.width === "100%" ) {
        options.width = window.innerWidth || document.documentElement.clientWidth || 
        document.body.clientWidth;
    }
    if ( options.height  === undefined || options.height === "100%" ) {
        options.height = window.innerHeight || document.documentElement.clientHeight ||
          document.body.clientHeight;
    }

/*
May need this for kindle or a fixed size
var win = window,
    doc = document,
    docElem = doc.documentElement,
    body = doc.getElementsByTagName('body')[0],
    x = win.innerWidth || docElem.clientWidth || body.clientWidth,
    y = win.innerHeight|| docElem.clientHeight|| body.clientHeight;
alert(x + ' × ' + y);
*/
    //console.log("Width ",  options.width, "Height", options.height);
    this.setOrientation(options.portrait, options.width, options.height);
};

EInkDrawingContext.prototype.setOrientation = function(portrait, width, height) {



    this.width = width || this.width;
    this.height = height || this.height;
    if (portrait) {
        this.canvas.setAttribute("width",this.width+"px");
        this.canvas.setAttribute("height",this.height+"px");
        this.ctx.translate(10,10);
        this.layout.setPageSize(this.width, this.height);
    } else {
        this.canvas.setAttribute("width",this.height+"px");
        this.canvas.setAttribute("height",this.width+"px");
        this.ctx.rotate(-Math.PI/2);
        this.ctx.translate(-this.width+10,10);
        this.layout.setPageSize(this.height, this.width);
    }    
}

EInkDrawingContext.prototype.nextPage = function() {
    this.page++;
    if ( this.page >= this.layout.pages.length) {
        this.page = 0;
    }
    this.body.setAttribute("style","background-color:"+this.theme.background);
    this.canvas.setAttribute("style","background-color:"+this.theme.background);
    this.ctx.clearRect(-10,-10,this.width+10,this.height+10);
    this.render();
}
EInkDrawingContext.prototype.prevPage = function() {
    this.page--;
    if ( this.page < 0 ) {
        this.page = this.layout.pages.length-1;
    }
    this.body.setAttribute("style","background-color:"+this.theme.background);
    this.canvas.setAttribute("style","background-color:"+this.theme.background);
    this.ctx.clearRect(-10,-10,this.width+10,this.height+10);
    this.render();
}


EInkDrawingContext.prototype.setTheme = function(theme) {
    if ( this.themeName != theme ) {
        this.theme = this.themes[theme];
        this.themeName = theme;
        this.body.setAttribute("style","background-color:"+this.theme.background);
        this.canvas.setAttribute("style","background-color:"+this.theme.background);
        this.ctx.clearRect(-10,-10,this.width+10,this.height+10);
        this.render();
    }
}

EInkDrawingContext.prototype.update = function(state) {
    for(var p = 0; p < this.layout.pages.length; p++) {
        for (var i = 0; i < this.layout.pages[p].length; i++) {
            try {
                this.layout.pages[p][i].update(state, this.dataStoreFactory);
            } catch(e) {
                debug("Error "+e);
            }
        }
    }
    this.render();
};

EInkDrawingContext.prototype.render = function() {
    for (var i = 0; i < this.layout.pages[this.page].length; i++) {
        try {
            this.layout.pages[this.page][i].render(this.ctx, this.theme, this.dataStoreFactory);
        } catch (e) {
            debug("Error "+e);
        }
    };
};


EInkUIController = function(options) {
    this.drawingContext = options.context;
    this.rotateControl = options.rotateControl;
    this.pageControl = options.pageControl;
    this.themeControl = options.themeControl;
    this.themes = options.themes;
    this.rotation = false;
    this.theme = 0;
    var that = this;
    if ( this.rotateControl ) {
        this.rotateControl.addEventListener("click", function(event) {
            that.rotation = !that.rotation;
            that.drawingContext.setOrientation(that.rotation);
            debug("Rotate Click");
        });        
    }
    if ( this.pageControl ) {
        this.pageControl.addEventListener("click", function(event) {
            that.drawingContext.nextPage();
            debug("Page Click");
        });        
    }
    if ( this.themeControl ) {
        this.themeControl.addEventListener("click", function(event) {
            that.theme++;
            if (that.theme === that.themes.length) {
                that.theme = 0;
            }
            that.drawingContext.setTheme(that.themes[that.theme]);
            debug(that.themes[that.theme]);
        });        
    }

    // Kindle 1st gen doesnt have a viable mouse, so there is no need to support this on a gen 1 kindle device
    // paperwhite browser has a thouch screen and has zones to tap for page turns.
    // andriod and other browsers have touch support or mouse.
    // not supporting iphone as the devices are simply to expensive to support, might work, might not.
    var startX, startY, startTouch;
    this.drawingContext.canvas.addEventListener("touchstart", function(event) {
        startX = event.touches[0].pageX;
        startY = event.touches[0].pageY;
        startTouch = new Date().getTime();
    });
    this.drawingContext.canvas.addEventListener("touchmove", function(event) {
        event.preventDefault();
    });
    this.drawingContext.canvas.addEventListener("touchend", function(event) {
        var moveX = startX - event.changedTouches[0].pageX;
        var moveY = startY - event.changedTouches[0].pageY;
        var elapsed = new Date().getTime() - startTouch;
        if (elapsed < 1000) {
            if ( Math.abs(moveX) > 150 && Math.abs(moveY) < 100 ) {
                if ( moveX > 0 ) {
                    that.drawingContext.nextPage();
                } else {
                    that.drawingContext.prevPage();
                }
            } else if ( Math.abs(moveY) > 150 && Math.abs(moveX) < 100 ) {
                that.theme++;
                if (that.theme === that.themes.length) {
                    that.theme = 0;
                }
                that.drawingContext.setTheme(that.themes[that.theme]);    
            }
        }
    });
    var mouseStartX, mouseStartY, startMouse;
    this.drawingContext.canvas.addEventListener("mousedown", function(event) {
        mouseStartX = event.pageX;
        mouseStartY = event.pageY;
        startMouse = new Date().getTime();
    });
    this.drawingContext.canvas.addEventListener("mousemove", function(event) {
        event.preventDefault();
    });
    this.drawingContext.canvas.addEventListener("mouseup", function(event) {
        var moveX = mouseStartX - event.pageX;
        var moveY = mouseStartY - event.pageY;
        var elapsed = new Date().getTime() - startMouse;
        if (elapsed < 1000) {
            if ( Math.abs(moveX) > 150 && Math.abs(moveY) < 100 ) {
                if ( moveX > 0 ) {
                    that.drawingContext.nextPage();
                } else {
                    that.drawingContext.prevPage();
                }
            } else if ( Math.abs(moveY) > 150 && Math.abs(moveX) < 100 ) {
                that.theme++;
                if (that.theme === that.themes.length) {
                    that.theme = 0;
                }
                that.drawingContext.setTheme(that.themes[that.theme]);  
            }
        }
    });

    




}



EInkUpdater = function(options) {
    this.url = options.url;
    this.period = options.period;
    if ( isKindle ) {
        this.period = Math.max(this.period,2000);
    }
    this.calculations = options.calculations || {
        enhance: function() {}
    };
    this.context = options.context;
    if ( ! XMLHttpRequest.DONE ) {
        XMLHttpRequest.UNSENT = XMLHttpRequest.UNSENT || 0;
        XMLHttpRequest.OPENED = XMLHttpRequest.OPENED || 1;
        XMLHttpRequest.HEADERS_RECEIVED = XMLHttpRequest.HEADERS_RECEIVED || 2;
        XMLHttpRequest.LOADING = XMLHttpRequest.LOADING || 3;
        XMLHttpRequest.DONE = XMLHttpRequest.DONE || 4;
    }

    if ( this.period ) {
        var that = this;
        debug(this.period);
        setInterval(function() {
            try {
                that.update();
            } catch (e) {
                debug("error "+e);
            }
        }, this.period);        
    }
}
EInkUpdater.prototype.update = function() {
    var that = this;
    var httpRequest = new XMLHttpRequest();
    httpRequest.onreadystatechange = function() {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          if (httpRequest.status === 200) {
            var start = Date.now();
            const lines = httpRequest.responseText.split("\n");
            const state = {};
            const getDouble = (v) => {
                if ( v == "") return -1e9;
                return +v;
            } 
            for ( var i = 0; i < lines.length; i++) {
                const props = lines[i].split(',');
                if ( props[0] == 'H') {
                    // handler state
                    state.headingTrue = getDouble(props[1]);
                    state.headingMagnetic = getDouble(props[2]);
                    state.faaValid = (props[3]==='V');
                    state.sog = getDouble(props[4]);
                    state.cogt = getDouble(props[5]);
                    state.cogm = getDouble(props[6]);
                    state.variation = getDouble(props[7]);
                    state.fixSecondsSinceMidnight = getDouble(props[8]);
                    state.latitude = getDouble(props[9]);
                    state.longitude = getDouble(props[10]);
                    state.aparentWindAngle = getDouble(props[11]);
                    state.aparentWindSpeed = getDouble(props[12]);
                    state.waterSpeed = getDouble(props[13]);
                    state.roll = getDouble(props[14]);
                    state.daysSince1970 = getDouble(props[15]);
                    state.log = getDouble(props[16]);
                    state.tripLog = getDouble(props[17]);
                    state.pressure = getDouble(props[18]);
                    state.engineSpeed = getDouble(props[19]);
                    state.engineCoolantTemp = getDouble(props[20]);
                } else if (props[0] == 'P') {
                    state.tws = getDouble(props[1]);
                    state.twa = getDouble(props[2]);
                    state.leeway = getDouble(props[3]);
                    state.polarSpeed = getDouble(props[4]);
                    state.polarSpeedRatio = getDouble(props[5]);
                    state.polarVmg = getDouble(props[6]);
                    state.vmg = getDouble(props[7]);
                    state.targetTwa = getDouble(props[8]);
                    state.targetVmg = getDouble(props[9]);
                    state.targetStw = getDouble(props[10]);
                    state.polarVmgRatio = getDouble(props[11]);
                    state.windDirectionTrue = getDouble(props[12]);
                    state.windDirectionMagnetic = getDouble(props[13]);
                    state.oppositeTrackHeadingTrue = getDouble(props[14]);
                    state.oppositeTrackHeadingMagnetic = getDouble(props[15]);
                    state.oppositeTrackTrue = getDouble(props[16]);
                    state.oppositeTrackMagnetic = getDouble(props[17]);
                }
            }

            state._ts = new Date().getTime();
//            Calcs.prototype.save(state, 'sys.updateTime', that.updateTime, new Date(), "ms", "Timetaken to process update", true);
//            that.calculations.enhance(state);
            that.context.update(state);
            that.updateTime = Date.now() - start;
          }
        }
    };
    httpRequest.open('GET', this.url);
    httpRequest.send();
};




// stats classes -------------------------------------

EInkStats = function(options) {
    this.withStats = true;
    this._ts = 0;
    this.currentValue = 0.0;
    this.values = [];
    this.mean = 0;
    this.max = 0;
    this.min = 0;
    this.stdev = 0;
}

EInkStats.prototype.doUpdate = function(state) {
    if ( !state._ts ) {
        state._ts = new Date().getTime();
    }
    if ( this._ts === state.ts ) {
        return false;
    }
    this._ts = state._ts;
    return true;
}

EInkStats.prototype.updateValues = function(v, state) {
    if (!this.doUpdate(state)) {
        return;
    }
    this.currentValue = v;
    if ( !this.withStats ) {
        return;
    }
    this.values.push(v);
    while(this.values.length > 100) {
        this.values.shift();
    }

    var s = 0.0;
    var n = 0.0;
    for (var i = 0; i < this.values.length; i++) {
        w = (i+1)/2;
        s += this.values[i]*w;
        n += w;
    }
    this.mean = s/n;
    s = 0.0;
    n = 0.0;
    for (var i = 0; i < this.values.length; i++) {
        w = (i+1)/2;
        s += (this.values[i]-this.mean)*(this.values[i]-this.mean)*w;
        n += w;
    }
    this.stdev = Math.sqrt(s/n);

    this.min = this.mean;
    this.max = this.mean;
    for (var i = this.values.length - 1; i >= 0; i--) {
        this.min = Math.min(this.values[i],this.min);
    };
    for (var i = this.values.length - 1; i >= 0; i--) {
        this.max = Math.max(this.values[i],this.max);
    };
}

EInkCircularStats = function(options) {
    EInkStats.call(this, options);
    this.sinvalues = [];
    this.cosvalues = [];
}

extend(EInkCircularStats, EInkStats);

EInkCircularStats.prototype.updateValues = function(v, state) {
    if (!this.doUpdate(state)) {
        return;
    }    this.currentValue = v;
    if ( !this.withStats ) {
        return;
    }
    this.values.push(v);
    while(this.values.length > 100) {
        this.values.shift();
    }
    this.sinvalues.push(Math.sin(v));
    while(this.sinvalues.length > 100) {
        this.sinvalues.shift();
    }
    this.cosvalues.push(Math.cos(v));
    while(this.cosvalues.length > 100) {
        this.cosvalues.shift();
    }
    var s = 0.0, c= 0.0;
    var n = 0.0;
    for (var i = 0; i < this.values.length; i++) {
        w = (i+1)/2;
        s += this.sinvalues[i]*w;
        c += this.cosvalues[i]*w;
        n += w;
    }
    this.mean = Math.atan2(s/n,c/n);

    // probably not the right way of calculating a SD of a circular
    // value, however it does produces a viable result.
    // other methods are estimates.
    // Not 100% certain about the weighting here.
    s = 0.0;
    n = 0.0;
    for (var i = 0; i < this.values.length; i++) {
        w = (i+1)/2;
        a = this.values[i]-this.mean;
        // find the smallest sweep from the mean.
        if ( a > Math.PI ) {
            a = a - 2*Math.PI;
        } else if ( a < -Math.PI ) {
            a = a + 2*Math.PI;
        }
        s += a*a*w;
        n += w;
    }
    this.stdev = Math.sqrt(s/n);
    this.min = this.mean;
    this.max = this.mean;
    for (var i = this.values.length - 1; i >= 0; i--) {
        this.min = Math.min(this.values[i],this.min);
    };
    for (var i = this.values.length - 1; i >= 0; i--) {
        this.max = Math.max(this.values[i],this.max);
    };
}

// UI classes -------------------------------------




EInkTextBox = function(options) {
    this.options = options;
    this.path = options.path;
    this.pathElements = options.path.split(".");
    this.labels = options.labels || {};
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.displayUnits = options.displayUnits || "";
    this.displayPositive = options.displayPositive;
    this.displayNegative = options.displayNegative;
    this.withStats = (options.withStats===undefined)?true:options.withStats;
    this.scale = options.scale || 1 ;
    this.offset = options.offset || 0;
    this.precision = (options.precision ===undefined)?1:options.precision;
    this.out = "no data";
    this.data = undefined;
    this.suppliedDisplayFn = options.suppliedDisplayFn;
    this.dims = {
        w: 10,
        h: 10,
        t: 0,
        l: 0,
    };
    if ( this.withStats ) {
        this.outmean = "-";
        this.outstdev = "-";
        this.outmax = "-";
        this.outmin = "-";
    }
};

EInkTextBox.number = function(path, name, units, precision, scale, offset) {
    return new EInkTextBox({
        path: path,
        labels: {
            bl: name,
            br: units
        },
        withStats: false,
        scale: scale || 1.0,
        offset: offset|| 0,
        precision: (precision==undefined)?2:precision
    });
};




EInkTextBox.prototype.resolve = function(state, path) {
    var pathElements = this.pathElements;
    if ( path ) {
        pathElements = path.split(".");
    }
    var n = state;
    for (var i = 0; n && i < pathElements.length; i++) {
        if (pathElements[i].startsWith("[") && pathElements[i].endsWith("]") )  {
            var filterElements = pathElements[i].slice(1,-1).split(",");
            var filters = [];
            var debug = false;
            for(var j = 0; j < filterElements.length; j++) {
                if (filterElements[j] == "debug" ) {
                    debug = true;
                } else {
                    filters.push(filterElements[j].split("=="));
                }
            }
            if ( debug ) {
                console.log("Processed Filter ",filters);
            }
            var nextN = undefined;
            for( var k in n) {
                if ( debug ) {
                    console.log("checking ",n,k[n]);
                }
                var matches = 0;
                for ( var j = 0; j < filters.length; j++) {
                    if (n[k][filters[j][0]] == filters[j][1]) {
                        matches++;
                    }
                }
                if ( matches == filters.length ) {
                    if ( debug ) {
                        console.log(n[k],"hit",matches);
                    }
                    nextN = n[k];
                    break;
                } else {
                    if ( debug ) {
                        console.log(n[k],"miss",matches);
                    }

                }
            }
            n = nextN;
        } else {
            n = n[pathElements[i]];
        }
    }
    if (n !== undefined && typeof n !== "object") {
        return {
            value: n,
            meta: this.meta
        };
    }
    return n;
};


EInkTextBox.prototype.toDispay = function(v, precision, displayUnits, neg, pos) {
    var dis = (displayUnits===undefined)?this.displayUnits:displayUnits;
    var neg = (neg===undefined)?this.displayNegative:neg;
    var pos = (pos===undefined)?this.displayPositive:pos;
    var res = v.toFixed((precision === undefined)?this.precision:precision);
    if ( neg && res < 0) {
        res = -res;
        res = neg+res+dis;
    } else if ( pos && res > 0) {
        res = pos+res+dis;
    } else {
        res = res+dis;
    }
    return res;
}


EInkTextBox.prototype.formatOutput = function(data, scale, precision, offset) {
    if ( this.suppliedDisplayFn) {
        return this.suppliedDisplayFn(data); 
    }
    scale = scale || this.scale;
    offset = offset || this.offset;
    if ( !this.withStats) {
        this.out = this.toDispay((data.currentValue*scale)+offset, precision);
    } else {
        this.out = this.toDispay((data.currentValue*scale)+offset, precision);
        this.outmax = this.toDispay((data.max*scale)+offset, precision);
        this.outmin = this.toDispay((data.min*scale)+offset, precision);
        this.outmean = "\u03BC "+this.toDispay((data.mean*scale)+offset, precision);
        this.outstdev = "\u03C3 "+this.toDispay(data.stdev*scale, precision, this.displayUnits, "","");
    }
    return this.out;
}

EInkTextBox.prototype.setSize = function(cols, rows, screenWidth, screenHeight) {
    var boxHeightFactor = 1.1; // 10% margin top and bottom of box
    var boxWidthFactor = 2.3/2.2; // margin left and right of box
    var boxRatio = 1.2/2.2; // ratio of box height to box width
    var fontRatio = 1/2.2; // ratio of font height to font width
    var w1 = (screenWidth-40)/cols;
    var w2 = ((screenHeight/boxHeightFactor)/rows)*(1/boxRatio);
    this.dims.w = Math.min(w1,w2);    
    this.dims.sz = this.dims.w*fontRatio;
    this.dims.h = this.dims.w*boxRatio;
    this.dims.t = this.y*this.dims.h*boxHeightFactor;
    this.dims.l = this.x*this.dims.w*boxWidthFactor;
}


EInkTextBox.prototype.startDraw = function(ctx, theme) {
  ctx.translate(this.dims.l,this.dims.t); 
  ctx.beginPath();
  ctx.fillStyle = theme.background;
  ctx.fillRect(0,0,this.dims.w,this.dims.h);
  ctx.strokeRect(0,0,this.dims.w,this.dims.h);
  ctx.fillStyle = theme.foreground;
  ctx.strokeStyle = theme.foreground;
};

EInkTextBox.prototype.endDraw = function(ctx) {
  ctx.translate(-this.dims.l,-this.dims.t);
}

EInkTextBox.prototype.twoLineLeft = function(ctx, l1, l2) {
    ctx.font =  this.dims.sz/3+"px arial";
    ctx.textBaseline="bottom";
    ctx.textAlign="left";
    ctx.fillText(l1, this.dims.w*0.1,this.dims.h*0.2+this.dims.sz/3);
    ctx.fillText(l2 , this.dims.w*0.1,this.dims.h*0.2+2*this.dims.sz/3);

}
EInkTextBox.prototype.twoLineRight = function(ctx, l1, l2) {
    ctx.font =  this.dims.sz/3+"px arial";
    ctx.textBaseline="bottom";
    ctx.textAlign="right";
    ctx.fillText(l1, this.dims.w*0.95,this.dims.h*0.2+this.dims.sz/3);
    ctx.fillText(l2 , this.dims.w*0.95,this.dims.h*0.2+2*this.dims.sz/3);

}

EInkTextBox.prototype.baseLine = function(ctx, l, r) {
    ctx.textBaseline="bottom";
    ctx.font =  (this.dims.sz/4)+"px arial";
    if ( l ) {
        ctx.textAlign="left";
        ctx.fillText(l, this.dims.w*0.05, this.dims.h);
    }
    if ( r ) {
        ctx.textAlign="right";
        ctx.fillText(r, this.dims.w*0.95, this.dims.h);        
    }
};



EInkTextBox.prototype.update = function(state, dataStoreFactory) {
  var d = this.resolve(state);
  if (!d) {
    return;
  }
  var data = dataStoreFactory.getStore(d, this.path);
  data.updateValues(d.value, state);
}

EInkTextBox.prototype.render = function(ctx, theme, dataStoreFactory) {
  var data = dataStoreFactory.getStore( undefined, this.path);
  if ( data ) {
    this.formatOutput(data);
  }

  var labels = this.labels;
  this.startDraw(ctx, theme);


  ctx.font =  this.dims.sz+"px arial";
  ctx.textBaseline="bottom";
  ctx.textAlign="center";
  var txtW = ctx.measureText(this.out).width; 
  if ( txtW > (this.dims.w*0.8) ) {
      ctx.font =  this.dims.sz*((this.dims.w*0.8)/txtW)+"px arial";
      ctx.fillText(this.out, this.dims.w*0.5,this.dims.h*0.9);
  } else {
      ctx.fillText(this.out, this.dims.w*0.5,this.dims.h);

  }
  if ( labels ) {
    ctx.font =  (this.dims.sz/4)+"px arial";
    ctx.textAlign="left";
    if ( labels.tl  && !this.withStats ) {
        ctx.fillText(labels.tl, this.dims.w*0.05, sz/4);
    }
    if ( labels.bl ) {
        ctx.fillText(labels.bl, this.dims.w*0.05, this.dims.h);
    }
    ctx.textAlign="right";
    if ( labels.tr  && !this.withStats ) {
        ctx.fillText(labels.tr, this.dims.w*0.95, this.dims.sz/4);
    }
    if ( labels.br ) {
        ctx.fillText(labels.br, this.dims.w*0.95, this.dims.h);
    }
  }
  if ( this.withStats ) {
      ctx.textAlign="left";
      ctx.fillText(this.outmin, this.dims.w*0.05,this.dims.sz/4);
      ctx.textAlign="right";
      ctx.fillText(this.outmax, this.dims.w*0.95,this.dims.sz/4);
      ctx.font =  (this.dims.sz/8)+"px arial";
      ctx.textAlign="center";
      ctx.fillText(this.outmean, this.dims.w*0.5,this.dims.sz/8);
      ctx.fillText(this.outstdev, this.dims.w*0.5,this.dims.sz/4);
  }
  this.endDraw(ctx, this.dims);
}


EInkTextBox.text = function(path, name, units, displayFn) {
    return  new EInkTextBox({
        path: path,
        labels: {
            bl: name,
            br: units
        },
        withStats: false,
        suppliedDisplayFn: displayFn
    });


};

EInkEngineStatus = function(path) {
    var options = {
        path: path,
        withStats: false
    }
    EInkTextBox.call(this, options);
    this.engineStatus = undefined;
}
extend(EInkEngineStatus, EInkTextBox);

EInkEngineStatus.prototype.update = function( state, dataStoreFactory) {
    var d = this.resolve(state);
    if ( d == undefined ) {
        return;
    }
    this.engineStatus = d;
}


EInkEngineStatus.prototype.render = function(ctx, theme, dataStoreFactory) {
    
    this.startDraw(ctx,theme);
    ctx.font =  this.dims.sz/2+"px arial";
    ctx.textBaseline="middle";
    ctx.textAlign="center";
    if ( this.engineStatus  &&  this.engineStatus.status1 === 0 && this.engineStatus.status2 === 0 ) {
        ctx.fillText("ok", this.dims.w*0.5,this.dims.h/2);
    } else {
        ctx.fillText("alarm", this.dims.w*0.5,this.dims.h/2);
    }
    this.baseLine(ctx, "alarm", "status");
    ctx.textAlign="center";
    ctx.fillText("engine", this.dims.w*0.5, (this.dims.sz/4));
    this.endDraw(ctx, this.dims);
};


EInkPilot = function(x, y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 180/Math.PI,
        precision: 0
    }
    EInkTextBox.call(this, options);
}
extend(EInkPilot, EInkTextBox);

EInkPilot.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}


EInkPilot.prototype.render = function(ctx, state, theme, dataStoreFactory) {
    var heading = "-", autoState = "-";
    var d = this.resolve(state, "steering.autopilot.state");
    if ( d ) {
        autoState = d.value;
        h = this.resolve(state, "steering.autopilot.target.headingMagnetic");
        if ( h ) {
            heading = this.formatOutput({ currentValue: h.value});
        }
    }

    this.startDraw(ctx,theme);
    ctx.font =  this.dims.sz+"px arial";
    ctx.textBaseline="bottom";
    ctx.textAlign="center";
    ctx.fillText(heading, dim.w*0.5,dim.h);

    this.baseLine(ctx, autoState, "deg");
    ctx.textAlign="center";
    ctx.fillText("pilot", this.dims.w*0.5, (this.dims.sz/4));
    this.endDraw(ctx);
};



EInkLog = function(x,y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 1/1852,
        precision: 1
    }
    EInkTextBox.call(this, options);
}
extend(EInkLog, EInkTextBox);


EInkLog.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}


EInkLog.prototype.render = function(ctx, state, theme, dataStoreFactory) {
    // there are 2 paths
    // navigation.trip.log (m)   distance
    // navigation.log (m) distance

    var t = this.resolve(state, "navigation.trip.log");
    var l = this.resolve(state, "navigation.log");
    var trip = "-.-", log = "-.-";
    if ( (t || l) ) {
        trip = "0.0";
        if ( t ) {
            trip = this.formatOutput({currentValue: t.value},this.scale,2);
        }
        log = "0.0";
        if ( l ) {
            log = this.formatOutput({currentValue: l.value});
        }
    }
    // this will need some adjustment
    this.startDraw(ctx,theme);

    this.twoLineLeft(ctx, "t: "+trip,"l: "+log);
    this.baseLine(ctx, "log","Nm");

    this.endDraw(ctx);
}



EInkFix = function(x,y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 1/1852,
        precision: 1
    }
    EInkTextBox.call(this, options);
}
extend(EInkFix, EInkTextBox);
EInkFix.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}
EInkFix.prototype.render = function(ctx, state, theme, dataStoreFactory) {
   /*EInkFix
   navigation.gnss.methodQuality (text) fix
   navigation.gnss.horizontalDilution (float) fix
   navigation.gnss.type (text) fix
   navigation.gnss.satellites (int) fix
   navigation.gnss.integrity (text) fix
    */

    var gnss = "-", 
        methodQuality = "-", 
        horizontalDilution = "-", 
        type="-", 
        satellites="-", 
        integrity = "-";
    if ( (state && state.navigation && state.navigation.gnss) ) {
        gnss = state.navigation.gnss;
        methodQuality = (gnss.methodQuality)?gnss.methodQuality.value:"-";
        horizontalDilution = (gnss.horizontalDilution)?gnss.horizontalDilution.value:"-";
        type = (gnss.type)?gnss.type.value:"-";
        satellites = (gnss.satellites)?gnss.satellites.value:"-";
        integrity = (gnss.integrity)?gnss.integrity.value:"-";
    }

    // this will need some adjustment
    this.startDraw(ctx,theme);
    ctx.font =  this.dims.sz/6+"px arial";
    ctx.textBaseline="bottom";
    ctx.textAlign="left";
    ctx.fillText(methodQuality, this.dims.w*0.05, this.dims.sz/4);
    ctx.fillText("sat:"+satellites, this.dims.w*0.05,2*this.dims.sz/4);
    ctx.fillText("hdop:"+horizontalDilution, this.dims.w*0.05,3*this.dims.sz/4);
    ctx.font =  this.dims.sz/6+"px arial";
    ctx.fillText(type, this.dims.w*0.05,this.dims.sz);


    this.endDraw(ctx);
}

EInkPossition = function(x,y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 1,
        precision: 1
    }
    EInkTextBox.call(this, options);
}
extend(EInkPossition, EInkTextBox);
EInkPossition.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}
EInkPossition.prototype.toLatitude = function(lat) {
    var NS = "N"
    if ( lat < 0 ) {
        lat = -lat;
        NS = "S";
    } 
    var d = Math.floor(lat);
    var m = (60*(lat - d)).toFixed(3);
    return ("00"+d).slice(-2)+"\u00B0"+("00"+m).slice(-6)+"\u2032"+NS;
}
EInkPossition.prototype.toLongitude = function(lon) {
    var EW = "E"
    if ( lon < 0 ) {
        lon = -lon;
        EW = "W";
    } 
    var d =  Math.floor(lon);
    var m = (60*(lon - d)).toFixed(3);
    return ("000"+d).slice(-3)+"\u00B0"+("00"+m).slice(-6)+"\u2032"+EW;
};

EInkPossition.prototype.parseDate = function(dateStr) {
    const regex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(.*)Z/gm;
    let m;

    if ((m = regex.exec(dateStr)) !== null) {
        var s = Math.floor(m[6]);
        var ms = m[6]-s;
        var date = new Date(Date.UTC(m[1],m[2]-1,m[3],m[4],m[5],s,ms));
        return date.toUTCString();
    }
    return dateStr;
};


EInkPossition.prototype.render = function(ctx, state, theme, dataStoreFactory) {
   /*
   EInkPossition
   navigation.position (lat, lon, deg) position
   navigation.datetime (date)
    */

    var lat = "--\u00B0--.---\u2032N", lon = "---\u00B0--.---\u2032W", ts = "-";

    if ( state && state.navigation && state.navigation.position && state.navigation.position.value ) {
        lat = this.toLatitude(state.navigation.position.value.latitude);
        lon = this.toLongitude(state.navigation.position.value.longitude);
    }
    if (state && state.navigation && state.navigation.datetime && state.navigation.datetime.value ) {
        ts = this.parseDate(state.navigation.datetime.value);
    }
    // this will need some adjustment

    this.startDraw(ctx,theme);
    this.twoLineRight(ctx, lat, lon);
    ctx.font =  (this.dims.sz/7)+"px arial";
    ctx.fillText(ts, this.dims.w*0.95, this.dims.h*0.95);


    this.endDraw(ctx);
}

EInkCurrent = function(x,y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 1,
        precision: 1
    }
    EInkTextBox.call(this, options);
}
extend(EInkCurrent, EInkTextBox);
EInkCurrent.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}
EInkCurrent.prototype.render = function(ctx, state, theme, dataStoreFactory) {
   /*
    EInkCurrent
    environment.current (drift (m/s), setTrue (rad))
    */
    var drift = "-", set = "-";
    if ( (state && state.environment && state.environment.current) ) {
        drift = this.formatOutput({ currentValue: state.environment.current.value.drift }, 1.943844,1);
        set = this.formatOutput({ currentValue: state.environment.current.value.setTrue }, 180/Math.PI,1);
    }



    // this will need some adjustment
    this.startDraw(ctx,theme);

    this.twoLineLeft(ctx, drift+" Kn",set+"\u00B0T" );
    this.baseLine(ctx, "current");

    this.endDraw(ctx);
}


EInkAttitude = function(x,y) {
    var options = {
        path: "none",
        x: x,
        y: y,
        withStats: false,
        scale: 180/Math.PI,
        precision: 1
    }
    EInkTextBox.call(this, options);
}
extend(EInkAttitude, EInkTextBox);
EInkAttitude.prototype.update = function( state, dataStoreFactory) {
    // no action as there are no stats stored centrally.
    return;
}
EInkAttitude.prototype.render = function(ctx, state, theme, dataStoreFactory) {
   /*
    EInkAttitude
    navigation.attitude (roll, pitch, yaw rad)
    */
    var attitude = "-", roll = "-", pitch = "-", yaw = "-";
    if ( (state && state.navigation && state.navigation.attitude) ) {
        attitude = state.navigation.attitude;
        roll = this.formatOutput({ currentValue: attitude.value.roll });
        pitch = this.formatOutput({ currentValue: attitude.value.pitch });
        yaw = this.formatOutput({ currentValue: attitude.value.yaw });
    }




    // this will need some adjustment
    this.startDraw(ctx,theme);

    this.twoLineLeft(ctx, "roll:"+roll+"\u00B0","pitch:"+pitch+"\u00B0" );
    this.baseLine(ctx,   "attitude", "deg")

 
    this.endDraw(ctx);
}



EInkRelativeAngle = function(path, label, x, y, precision ) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "deg"
        },
        x: x,
        y: y,
        withStats: true,
        displayUnits: "\u00B0",
        displayNegative: "P",
        displayPositive: "S",
        textSize: 3,
        scale: 180/Math.PI,
        precision: (precision==undefined)?0:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkRelativeAngle, EInkTextBox);

EInkRelativeAngle.prototype.formatOutput = function(data, scale, precision) {
    scale = scale || this.scale;

    if ( !this.withStats) {
        this.out = this.toDispay(data.currentValue*scale, precision);
    } else {
        this.out = this.toDispay(data.currentValue*scale, precision);
        this.outmax = this.toDispay(data.max*scale, precision);
        this.outmin = this.toDispay(data.min*scale, precision);
        this.outmean = "\u03BC "+this.toDispay(data.mean*scale, precision);
        this.outstdev = "\u03C3 "+this.toDispay(data.stdev*scale, 1, this.displayUnits, "","");
    }
    return this.out;
}



EInkSpeed = function(path, label, x, y, precision) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "kn"
        },
        x: x,
        y: y,
        withStats: true,
        scale: 1.943844,
        precision: (precision==undefined)?1:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkSpeed, EInkTextBox);

EInkDistance = function(path, label, x, y, precision) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "m"
        },
        x: x,
        y: y,
        withStats: true,
        scale: 1,
        precision: (precision==undefined)?1:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkDistance, EInkTextBox);

EInkBearing = function(path, label, x, y, precision) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "deg"
        },
        x: x,
        y: y,
        withStats: true,
        scale: 180/Math.PI,
        precision: (precision==undefined)?0:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkBearing, EInkTextBox);

// todo
EInkTemperature = function(path, label, x, y, precision) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "C"
        },
        x: x,
        y: y,
        withStats: true,
        scale: 1,
        precision: (precision==undefined)?1:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkTemperature, EInkTextBox);


EInkTemperature.prototype.formatOutput = function(data) {
    if ( !this.withStats) {
        this.out = this.toDispay(data.currentValue-273.15, this.precision);
    } else {
        this.out = this.toDispay(data.currentValue-273.15, this.precision);
        this.outmax = this.toDispay(data.max-273.15, this.precision);
        this.outmin = this.toDispay(data.min-273.15, this.precision);
        this.outmean = "\u03BC "+this.toDispay(data.mean-273.15, this.precision);
        this.outstdev = "\u03C3 "+this.toDispay(data.stdev, this.precision);            
    }
}

// todo
EInkSys = function(x, y) {
    var options = {
        path: "none",
        labels: {
            bl: "sys"
        },
        x: x,
        y: y,
        withStats: false,
        scale: 1,
        precision: 0
    }
    EInkTextBox.call(this, options);
}
extend(EInkSys, EInkTextBox);

EInkSys.prototype.render = function(ctx, state, theme, dataStoreFactory) {

    if ( !(state && state.sys ) ) {
        return;
    }
    var sys = state.sys;
    var polarBuild = (sys.polarBuild)?sys.polarBuild.value:"-";
    var calcTime = (sys.calcTime)?sys.calcTime.value:"-";
    var updateTime = (sys.updateTime)?sys.updateTime.value:"-";
    var jsHeapSizeLimit = (sys.jsHeapSizeLimit)?(sys.jsHeapSizeLimit.value/(1024*1024)).toFixed(1):"-";
    var totalJSHeapSize = (sys.totalJSHeapSize)?(sys.totalJSHeapSize.value/(1024*1024)).toFixed(1):"-";
    var usedJSHeapSize = (sys.usedJSHeapSize)?(sys.usedJSHeapSize.value/(1024*1024)).toFixed(1):"-";



    // this will need some adjustment
    this.startDraw(ctx,theme);

    ctx.font =  this.dims.sz/6+"px arial";
    ctx.textBaseline="bottom";
    ctx.textAlign="left";
    ctx.fillText("init: "+polarBuild, this.dims.w*0.05, this.dims.sz/4);
    ctx.fillText("calc: "+calcTime, this.dims.w*0.05,2*this.dims.sz/4);
    ctx.fillText("up: "+updateTime, this.dims.w*0.05,3*this.dims.sz/4);
    ctx.fillText("mem: "+usedJSHeapSize, this.dims.w*0.05,4*this.dims.sz/4);



    this.endDraw(ctx);
}

EInkRatio = function(path, label, x, y, precision ) {
    var options = {
        path: path,
        labels: {
            bl: label,
            br: "%"
        },
        x: x,
        y: y,
        withStats: true,
        scale: 100,
        precision: (precision==undefined)?0:precision
    }
    EInkTextBox.call(this, options);
}
extend(EInkRatio, EInkTextBox);

EInkRatio.prototype.formatOutput = function(data, scale, precision) {
    scale = scale || this.scale;

    if ( !this.withStats) {
        this.out = this.toDispay(data.currentValue*scale, precision);
    } else {
        this.out = this.toDispay(data.currentValue*scale, precision);
        this.outmax = this.toDispay(data.max*scale, precision);
        this.outmin = this.toDispay(data.min*scale, precision);
        this.outmean = "\u03BC "+this.toDispay(data.mean*scale, precision);
        this.outstdev = "\u03C3 "+this.toDispay(data.stdev*scale, 1, this.displayUnits, "","");
    }
    return this.out;
}









