class HexaPublisher {
  constructor(eventName, data) {
    this.eventName = eventName;
    this.data = data;
    this.reTry = 0;
  }

  async sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async setDelay(ms) {
    await this.sleep(ms);
    this.publish(this.eventName, this.data);
  }

  async delayRetry() {
    if (this.reTry == 20) return false;
    this.reTry = this.reTry + 1;
    this.setDelay(this.reTry * 500);
    return true;
  }
  async publish() {}
}

module.exports = HexaPublisher;
