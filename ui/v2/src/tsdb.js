/* eslint-disable quotes */
/* eslint-disable no-console */



class Tsdb {
  /**
   * name is the name of the timeseries
   * recordPeriod is the time in ms that a record covers.
   * savePeriod that each sample covers.
   * novalue is the value to use.
   *
   * In a single record the savePeriod cant change, but it can change between
   * records. The recordPeriod can change between records also.
   *
   * The key to the database in ms at the start of the record.
   * The value stored can be a simple value or a json object.
   */
  constructor(dbName, recordPeriod, savePeriod, novalue) {
    this.dbName = dbName;
    this.recordPeriod = recordPeriod;
    this.savePeriod = savePeriod;
    this.novalue = novalue;
    this.dbName = dbName;
    this.saved = [];
  }

  open() {
    return new Promise((resolve, reject) => {
      console.log('OPening database');
      const DBOpenRequest = window.indexedDB.open(this.dbName, 3);
      console.log("Open Request", DBOpenRequest);
      DBOpenRequest.onerror = (event) => {
        console.log("Db error opening ", event);
        reject("failed opening ", event.target);
      };
      DBOpenRequest.onsuccess = (event) => {
        this.db = DBOpenRequest.result;
        resolve("ok");
      };
      DBOpenRequest.onupgradeneeded = (event) => {
        console.log("Starting upgrade");
        const db = event.target.result;
        const transaction = event.target.transaction;
        db.onerror = (event) => {
          console.log('Error loading database ', event);
        };

        console.log("DB is ", db);
        let tsdbOjectStore;
        if (db.objectStoreNames.contains('tsdb') ) {
          tsdbOjectStore = transaction.objectStore('tsdb');
        } else {
          tsdbOjectStore = db.createObjectStore('tsdb', { keyPath: 'ts' });
        }
        if (!tsdbOjectStore.indexNames.contains('name')) {
          tsdbOjectStore.createIndex('name', 'name', { unique: false });
        }
        if (!tsdbOjectStore.indexNames.contains('start')) {
          tsdbOjectStore.createIndex('start', 'start', { unique: false });
        }
        console.log('Done creating ObjectStore');
      };
      console.log("Done open request");
    });
  }


  updateValue(offset, value, tsd) {
    if (tsd.length < offset) {
      console.log("Extending ", JSON.parse(JSON.stringify(tsd)));
      while (tsd.length < offset) {
        tsd.push(this.novalue);
      }
      console.log(" Extended to ", JSON.parse(JSON.stringify(tsd)));
    }
    tsd[offset] = value;
  }

  getStartOfRecord(t) {
    const startOfRecord = Math.floor(t / (this.recordPeriod)) * (this.recordPeriod);
    const offsetInRecord = Math.floor((t - startOfRecord) / this.savePeriod);
    return {
      time: t,
      startOfRecord,
      offsetInRecord,
    };
  }




  saveData(name, v) {
    return new Promise((resolve, reject) => {
        if (!this.db) {
          console.log("Not open yet");
          reject('not open yet');
        }
        // store in 30m chunks, one ever 5s ==  360 values per chunk
        const saveAt = Date.now();
        const {startOfRecord, offsetInRecord}  = this.getStartOfRecord(saveAt);
        const pk = `${startOfRecord}-${name}`;

        // create a transation on the store tsdb.
        const transaction = this.db.transaction('tsdb', 'readwrite');
        transaction.oncomplete = (event) => {
          console.debug('Transaction complete', event);
          //this.saved.push(saveAt);
          resolve('ok');
        };
        transaction.onerror = (event) => {
          console.log('Transaction error', event);
          reject('failed', error.target);
        };

        // get the tsdb object store.
        const objectStore = transaction.objectStore('tsdb');
        let found = false;
        objectStore.openCursor(pk).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.ts === pk) {
              found = true;
              this.updateValue(offsetInRecord, v, cursor.value.tsd);
              cursor.update(cursor.value).onsuccess = (event) => {
                console.debug('Saved ', event);
              };
            }
          } else if (!found) {
            const record = {
              ts: pk,
              start: startOfRecord,
              name,
              period: this.savePeriod,
              tsd: [],
            };
            this.updateValue(offsetInRecord, v, record.tsd);
            objectStore.put(record).onsuccess = (event) => {
              if (event.target.result === pk) {
                console.log('Created New');
              } else {
                console.log('Failed');
              }
            };
          }
        };
    })

  }

  checkRecord(record) {
    /*
    if (this.reports < 5) {
      this.reports++;
      if (record.tsd.length !== 60) {
        console.log("Warn Record length", new Date(record.start), record);
      } else {
        console.log("Record length Ok", new Date(record.start), record);
      }
    } */
    for (let i = 0; i < record.tsd.length; i++) {
      if (record.tsd[i] !== -1e9) {
        const expected = record.start + i * 1000;
        const found = Math.floor(record.tsd[i] / record.period) * record.period;
        if (found !== expected) {
          console.log("Incorrect value", record, i, record.tsd[i], expected);
        }
      }
    }
  }

  checkDb() {
    return new Promise((resolve, reject) => {
      this.reports = 0;
/*      for (let i = 1; i < this.saved.length; i++) {
        if ((this.saved[i] - this.saved[i - 1]) > this.savePeriod * 1.1) {
          console.log("Delay in saving ", new Date(this.saved[i]), (this.saved[i] - this.saved[i - 1]));
        }
      } */
      const fromRecord = this.getStartOfRecord(from);
      const toRecord = this.getStartOfRecord(to);
      const transaction = this.db.transaction(['tsdb'], 'readonly');
      const results = [].fill(this.novalue, 0, Math.floor((to-from)/this.savePeriod));
      transaction.oncomplete = (event) => {
        resolve('db check ok');
      };
      transaction.onerror = (event) => {
        console.log('Transaction error', event);
        reject(results, event.target);
      };
      const tsdbStore = transaction.objectStore('tsdb');
      tsdbStore.openCursor()
        .onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            this.checkRecord(cursor.value);
            cursor.continue();
          }
        };
    });
  }

  updateRange(fromRecord, toRecord, value, results) {
    // find the startOffset of this incoming range in the results
    // a -ve offset means this incoming range starts before the results window.
    const startOffset = (Math.floor((value.start - fromRecord.startOfRecord)
      / value.period)) - fromRecord.offsetInRecord;
    // pad the results out with no value to accept the incoming range.
    console.log("Save ", value, startOffset);
    // copy the incoming range fro the startOffset.
    for (let p = 0; p < value.tsd.length; p++) {
      const trec = value.start + value.period * p;
      if (trec > fromRecord.time && trec <= toRecord.time) {
        const psave = startOffset + p;
        if (psave >= 0) {
          results[psave] = value.tsd[p];
        }
      }
    }
  }

  getData(setname, from, to) {
    return new Promise((resolve, reject) => {
      const fromRecord = this.getStartOfRecord(from);
      const toRecord = this.getStartOfRecord(to);
      const transaction = this.db.transaction(['tsdb'], 'readonly');
      const results = [].fill(this.novalue, 0, Math.floor((to-from)/this.savePeriod));
      transaction.oncomplete = (event) => {
        console.log('Transaction complete', event);
        resolve(results);
      };
      transaction.onerror = (event) => {
        console.log('Transaction error', event);
        reject(results, event.target);
      };
      const tsdbStore = transaction.objectStore('tsdb');
      const startIndex = tsdbStore.index('start');
      startIndex.openCursor(IDBKeyRange.bound(fromRecord.startOfRecord, toRecord.startOfRecord))
        .onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            if (cursor.value.name === setname) {
              this.updateRange(fromRecord, toRecord, cursor.value, results);
            }
            cursor.continue();
          }
        };
    });
  }
}



//
let running = false;

const tsdb = new Tsdb('testhistory', 60000, 1000, -1e9);
const testOffsets = [];
for (let i = 0; i < 120; i++) {
  const t = 1718634900000 + i * 750;
  testOffsets.push(tsdb.getStartOfRecord(t));
}
console.log('Test Offsets', testOffsets);

tsdb.open().then((msg) => {
  console.log('Db opened', msg);


  const runData = (name) => {
    let saved = 1;
    let lastAdded = Date.now();
    let startSave = Date.now();
    const save = () => {
      if (running) {
        tsdb.saveData(name, Date.now())
          .then((txmsg) => {
            console.log(txmsg);
            saved++;
            const now = Date.now();
            const diffTime = now - lastAdded;
            if (diffTime > 1100) {
              console.log(`Didnt save since ${lastAdded} overdue:${diffTime}, now:${now}`);
            }
            lastAdded = now;
          })
          .catch(console.log);
      } else {
        saved = 0;
        lastAdded = Date.now();
        startSave = Date.now();
      }
    };
    // NB intervals in foreground tasks get called once every 60s when the task is inactive.
    // for this to be every second, all the code needs to be in a web worker
    // BLE API is not available in a WebWorker and its likely that messages
    // from a WebWorker to a inactive task will not be delivered when inactive.
    // So.... got to live with the once every 60s behaviour when inactive.
    // The records need to be created at a fixed rate so that the current record can be found.
    // however, perhaps we simply store the current record.
    // or we store both value and time and avoid the problem of holes in the dataset.
    // this may be more efficient with a variable record size.

    setInterval(save, 1000);
  };

  for (let i = 0; i < 2; i++) {
    runData(`test${i}`);
  }
});



document.addEventListener('DOMContentLoaded', (event) => {
  document.getElementById('pause').addEventListener('click', (event) => {
    console.log("Pause");
    running = false;
  });
  document.getElementById('run').addEventListener('click', (event) => {
    console.log("Run");
    running = true;
  });

  document.getElementById('checkDb').addEventListener('click', (event) => {
    tsdb.checkDb().then(console.log).catch(console.log);
  });

  const now = Date.now();
  const fromDate = new Date(now - 7200000).toISOString();
  const toDate = new Date(now).toISOString();
  document.getElementById('from').value = fromDate.substring(0, fromDate.indexOf("T") + 6);
  document.getElementById('to').value = toDate.substring(0, toDate.indexOf("T") + 6);
  document.getElementById('query').addEventListener('click', (event) => {
    const from = 1718710500000; // Date.parse(document.getElementById('from').value);
    const to = 1718710680000; Date.parse(document.getElementById('to').value);
    const setname = document.getElementById('set').value;

    console.log("Query ", setname, from, to, new Date(from), new Date(to));
    console.log("Expecting ", Math.floor(((to - from) / 1000)));
    tsdb.getData(setname, from, to).then((results) => {
      console.log("Got ", results.length);

      const check = [];
      for (let i = 0; i < results.length; i++) {
        if (results[i] === -1e9) {
          check.push({ r: results[i], ir: i });
        } else {
          check.push({
            r: results[i],
            ir: from + (i * 1000),
            d: new Date(results[i]),
            diff: results[i] - (from + (i * 1000)),
          });
        }
      }
      console.log('Results ', results);
      console.log('Check ', check);
    }).catch((results, error) => {
      console.log('Failed ', results, error);
    });
  });
});

