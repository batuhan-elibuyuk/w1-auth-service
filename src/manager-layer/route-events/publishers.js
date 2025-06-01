const { ServicePublisher } = require("serviceCommon");

// User Event Publisher Classes

// Publisher class for registerUser route
const { UserRegisterredTopic } = require("./topics");
class UserRegisterredPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserRegisterredTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserRegisterredPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for updateUser route
const { UserUpdatedTopic } = require("./topics");
class UserUpdatedPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserUpdatedTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserUpdatedPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for updateUserRole route
const { UserroleUpdatedTopic } = require("./topics");
class UserroleUpdatedPublisher extends ServicePublisher {
  constructor(userrole, session, requestId) {
    super(UserroleUpdatedTopic, userrole, session, requestId);
  }

  static async Publish(userrole, session, requestId) {
    const _publisher = new UserroleUpdatedPublisher(
      userrole,
      session,
      requestId,
    );
    await _publisher.publish();
  }
}

// Publisher class for updatePassword route
const { PasswordUpdatedTopic } = require("./topics");
class PasswordUpdatedPublisher extends ServicePublisher {
  constructor(password, session, requestId) {
    super(PasswordUpdatedTopic, password, session, requestId);
  }

  static async Publish(password, session, requestId) {
    const _publisher = new PasswordUpdatedPublisher(
      password,
      session,
      requestId,
    );
    await _publisher.publish();
  }
}

// Publisher class for getUser route
const { UserRetrivedTopic } = require("./topics");
class UserRetrivedPublisher extends ServicePublisher {
  constructor(user, session, requestId) {
    super(UserRetrivedTopic, user, session, requestId);
  }

  static async Publish(user, session, requestId) {
    const _publisher = new UserRetrivedPublisher(user, session, requestId);
    await _publisher.publish();
  }
}

// Publisher class for listUsers route
const { UsersListedTopic } = require("./topics");
class UsersListedPublisher extends ServicePublisher {
  constructor(users, session, requestId) {
    super(UsersListedTopic, users, session, requestId);
  }

  static async Publish(users, session, requestId) {
    const _publisher = new UsersListedPublisher(users, session, requestId);
    await _publisher.publish();
  }
}

module.exports = {
  UserRegisterredPublisher,
  UserUpdatedPublisher,
  UserroleUpdatedPublisher,
  PasswordUpdatedPublisher,
  UserRetrivedPublisher,
  UsersListedPublisher,
};
