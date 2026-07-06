// Mock Socket.io Client for Serverless Hosting
class MockSocket {
  constructor() {
    this.listeners = {};
  }
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
  off(event, cb) {
    if (!this.listeners[event]) return;
    if (cb) {
      this.listeners[event] = this.listeners[event].filter(x => x !== cb);
    } else {
      delete this.listeners[event];
    }
  }
  emit(event, ...args) {
    const eventListeners = this.listeners[event] || [];
    eventListeners.forEach(cb => {
      try { cb(...args); } catch (err) { console.error('Socket event error:', err); }
    });
  }
}

export const socket = new MockSocket();
export function io() {
  setTimeout(() => {
    socket.emit("connect");
  }, 100);
  return socket;
}
