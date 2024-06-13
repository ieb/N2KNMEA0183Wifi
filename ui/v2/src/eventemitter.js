class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  emit(event, payload) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        this.listeners[event][i](payload);
      }
    }
    if (this.listeners['*']) {
      for (let i = 0; i < this.listeners['*'].length; i++) {
        this.listeners['*'][i](event, payload);
      }
    }
  }

  addListener(event, l) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(l);
  }

  removeListener(event, l) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((f) => (f !== l));
    }
  }
}

export { EventEmitter };
