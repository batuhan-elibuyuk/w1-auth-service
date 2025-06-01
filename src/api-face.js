const { inject } = require("mindbricks-api-face");

module.exports = (app) => {
  const authUrl = (process.env.SERVICE_URL ?? "mindbricks.com").replace(
    process.env.SERVICE_SHORT_NAME,
    "auth",
  );

  const config = {
    name: "w - auth",
    brand: {
      name: "w",
      image: "https://mindbricks.com/images/logo-light.svg",
      moduleName: "auth",
    },
    auth: {
      url: authUrl,
    },
    dataObjects: [
      {
        name: "User",
        description:
          "A data object that stores the user information and handles login settings.",
        reference: {
          tableName: "user",
          properties: [
            {
              name: "email",
              type: "String",
            },

            {
              name: "password",
              type: "String",
            },

            {
              name: "fullname",
              type: "String",
            },

            {
              name: "avatar",
              type: "String",
            },

            {
              name: "emailVerified",
              type: "Boolean",
            },
          ],
        },
        endpoints: [
          {
            isAuth: false,
            method: "POST",
            url: "/registeruser",
            title: "registerUser",
            query: [],

            body: {
              type: "json",
              content: {
                avatar: "String",
                socialCode: "String",
                password: "String",
                fullname: "String",
                email: "String",
              },
            },

            parameters: [],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: "/users/{userId}",
            title: "updateUser",
            query: [],

            body: {
              type: "json",
              content: {
                fullname: "String",
                avatar: "String",
              },
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: "/userrole/{userId}",
            title: "updateUserRole",
            query: [],

            body: {
              type: "json",
              content: {
                roleId: "String",
              },
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "PATCH",
            url: "/password/{userId}",
            title: "updatePassword",
            query: [],

            body: {
              type: "json",
              content: {
                oldPassword: "String",
                newPassword: "String",
              },
            },

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "GET",
            url: "/users/{userId}",
            title: "getUser",
            query: [],

            parameters: [
              {
                key: "userId",
                value: "",
                description: "",
              },
            ],
            headers: [],
          },

          {
            isAuth: true,
            method: "GET",
            url: "/users",
            title: "listUsers",
            query: [],

            parameters: [],
            headers: [],
          },
        ],
      },
    ],
  };

  inject(app, config);
};
