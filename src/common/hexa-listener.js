class HexaListener {
  constructor(eventName, eventHandler, callBackData, listenerType) {
    this.eventName = eventName;
    this.eventHandler = eventHandler;
    this.sessionIdPath = "sessionId";
    this.callBackData = callBackData;
    this.listenerType = listenerType;
    // event handler parameter structure
    // eventName: string -> name of the event (channel, topic)
    // session: object -> a session object from Redis if seesionId is given in data
    // payLoad: object -> a data object that has the information given by publisher
  }
  async listen() {}

  async getSession(sessionId) {
    return {
      id: "c10d12345678901234567801",
      loginDate: "2023-06-18T10:09:56.967Z",
      ip: "145.1.11.24",
      userId: "a10d1234567890123456780112345678",
      userRole: 0,
      isAdmin: true,
      shopId: "b10d12345678901234567801",
      _USERID: "a10d1234567890123456780112345678",
    };
  }
}

module.exports = HexaListener;
