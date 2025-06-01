const express = require("express");
const axios = require("axios");
const router = express.Router();
const jwt = require("jsonwebtoken");

const { BadRequestError, ForbiddenError, HttpServerError } = require("common");
const { md5 } = require("common");

const createSession = require("../project-session/create-session");

const REDIRECT_PORTAL_URI =
  process.env.SERVICE_URL + "/auth/social-login-redirect";

// redirect portal for all social login providers to extract tenantCodename
router.get("/auth/social-login-redirect", (req, res) => {
  const stateStr = Buffer.from(req.query.state, "base64").toString();
  const state = JSON.parse(stateStr); // contains redirect with tenant and csrf token if needed
  console.log("State from  Social Auth:", state);
  res.redirect(state.redirect + req.queryString ? `?${req.queryString}` : "");
});

router.get("/social-login-demo", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.sendFile(__dirname + "/authdemo/index.html");
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_ALLOW_REGISTER = process.env.GOOGLE_ALLOW_REGISTER === "true";
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  process.env.SERVICE_URL + "/google-auth/callback";

router.get("/auth/google", (req, res) => {
  let redirectUri = GOOGLE_REDIRECT_URI;
  let state = null;
  if (req.tenantCodename) {
    const uri = new URL(GOOGLE_REDIRECT_URI);
    uri.pathname = `/${req.tenantCodename}${uri.pathname}`;
    const redirectWithTenant = uri.toString();
    const stateObj = {
      redirect: redirectWithTenant,
    };
    state = encodeURIComponent(
      Buffer.from(JSON.stringify(stateObj)).toString("base64"),
    );
    redirectUri = REDIRECT_PORTAL_URI;
  }

  // If tenantCodename is not set, use the original redirect URI
  console.log("Redirect URI for Google Auth:", redirectUri);
  console.log("State for Google Auth:", state);
  // Construct the Google OAuth URL with the redirect URI and state
  // If state is provided, append it to the URL
  // Redirect to Google OAuth authorization endpoint
  // The URL includes the client ID, redirect URI, response type, and scope
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=profile email` +
    (state ? `&state=${state}` : "");
  console.log("Redirecting to Google OAuth URL:", url);
  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res, next) => {
  const { code } = req.query;

  if (!code) next(new BadRequestError("errMsg_MissingAuthorizationCode"));

  try {
    const { data: tokenData } = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      },
    );

    const { access_token } = tokenData;

    const { data: profileData } = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const sessionManager = createSession();

    await sessionManager.loginBySocialAccount(
      {
        email: profileData.email,
        fullname: profileData.name,
        avatar: profileData.picture,
        name: profileData.given_name,
        surname: profileData.family_name,
        emailVerified: profileData.email_verified ?? true,
        socialCode: md5(access_token),
        allowRegister: GOOGLE_ALLOW_REGISTER,
        userField: "email",
      },
      req,
      res,
      next,
    );
  } catch (error) {
    next(new HttpServerError("errMsg_GoogleAuthFailed", error));
    console.error("OAuth callback error:", error.response?.data || error);
  }
});

router.get("/google-auth/callback", (req, res) => {
  console.log("Google Auth Callback Triggered");
  res.setHeader("Content-Type", "text/html");
  res.sendFile(__dirname + "/authdemo/google-callback.html");
});

const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = (process.env.APPLE_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n",
);
const APPLE_ALLOW_REGISTER = process.env.APPLE_ALLOW_REGISTER === "true";
const APPLE_REDIRECT_URI =
  process.env.APPLE_REDIRECT_URI ??
  process.env.SERVICE_URL + "/apple-auth/callback";

function generateAppleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: APPLE_TEAM_ID,
      iat: now,
      exp: now + 3600,
      aud: "https://appleid.apple.com",
      sub: APPLE_CLIENT_ID,
    },
    APPLE_PRIVATE_KEY,
    {
      algorithm: "ES256",
      keyid: APPLE_KEY_ID,
    },
  );
}

router.get("/auth/apple", (req, res) => {
  const url = `https://appleid.apple.com/auth/authorize?response_type=code&client_id=${APPLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(APPLE_REDIRECT_URI)}&scope=name email&response_mode=form_post`;
  res.redirect(url);
});

router.post("/auth/apple/callback", async (req, res, next) => {
  const { code, id_token } = req.body;

  if (!code)
    return next(new BadRequestError("errMsg_MissingAuthorizationCode"));

  try {
    const clientSecret = generateAppleClientSecret();

    const tokenResponse = await axios.post(
      "https://appleid.apple.com/auth/token",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: APPLE_REDIRECT_URI,
          client_id: APPLE_CLIENT_ID,
          client_secret: clientSecret,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { id_token: appleIdToken, access_token } = tokenResponse.data;
    const decoded = jwt.decode(appleIdToken);

    const sessionManager = createSession();

    await sessionManager.loginBySocialAccount(
      {
        email: decoded.email,
        fullname: decoded.name
          ? `${decoded.name.firstName} ${decoded.name.lastName}`
          : undefined,
        avatar: undefined, // Apple does not provide an avatar
        name: decoded.name?.firstName ?? "",
        surname: decoded.name?.lastName ?? "",
        emailVerified: decoded.email_verified ?? true,
        socialCode: md5(access_token),
        allowRegister: APPLE_ALLOW_REGISTER,
        userField: "email",
      },
      req,
      res,
      next,
    );
  } catch (error) {
    next(new HttpServerError("errMsg_AppleAuthFailed", error));
    console.error("Apple OAuth callback error:", error.response?.data || error);
  }
});

router.get("/apple-auth/callback", (req, res) => {
  console.log("Apple Auth Callback Triggered");
  res.setHeader("Content-Type", "text/html");
  res.sendFile(__dirname + "/authdemo/apple-callback.html");
});

// GitHub OAuth configuration

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REDIRECT_URI =
  process.env.GITHUB_REDIRECT_URI ??
  process.env.SERVICE_URL + "/github-auth/callback";
const GITHUB_ALLOW_REGISTER = process.env.GITHUB_ALLOW_REGISTER === "true";

router.get("/auth/github", (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=read:user user:email`;
  res.redirect(url);
});

router.get("/auth/github/callback", async (req, res, next) => {
  const { code } = req.query;

  if (!code)
    return next(new BadRequestError("errMsg_MissingAuthorizationCode"));

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: GITHUB_REDIRECT_URI,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    const access_token = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const emailResponse = await axios.get(
      "https://api.github.com/user/emails",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );

    const primaryEmail = emailResponse.data.find((e) => e.primary)?.email ?? "";

    const profile = userResponse.data;

    const sessionManager = createSession();

    await sessionManager.loginBySocialAccount(
      {
        email: primaryEmail,
        fullname: profile.name || profile.login,
        avatar: profile.avatar_url,
        name: profile.name?.split(" ")[0] ?? profile.login,
        surname: profile.name?.split(" ").slice(1).join(" ") ?? "",
        emailVerified: true,
        socialCode: md5(access_token),
        allowRegister: GITHUB_ALLOW_REGISTER,
        userField: "email",
      },
      req,
      res,
      next,
    );
  } catch (error) {
    next(new HttpServerError("errMsg_GithubAuthFailed", error));
    console.error("GitHub Auth error:", error.response?.data || error);
  }
});

router.get("/github-auth/callback", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.sendFile(__dirname + "/authdemo/github-callback.html");
});

// gitlab OAuth configuration
const GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID;
const GITLAB_CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET;
const GITLAB_REDIRECT_URI =
  process.env.GITLAB_REDIRECT_URI ??
  process.env.SERVICE_URL + "/gitlab-auth/callback";
const GITLAB_ALLOW_REGISTER = process.env.GITLAB_ALLOW_REGISTER === "true";

router.get("/auth/gitlab", (req, res) => {
  const url = `https://gitlab.com/oauth/authorize?client_id=${GITLAB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITLAB_REDIRECT_URI)}&response_type=code&scope=read_user`;
  res.redirect(url);
});

router.get("/auth/gitlab/callback", async (req, res, next) => {
  const { code } = req.query;

  if (!code)
    return next(new BadRequestError("errMsg_MissingAuthorizationCode"));

  try {
    const tokenResponse = await axios.post(
      "https://gitlab.com/oauth/token",
      null,
      {
        params: {
          client_id: GITLAB_CLIENT_ID,
          client_secret: GITLAB_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: GITLAB_REDIRECT_URI,
        },
      },
    );

    const access_token = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://gitlab.com/api/v4/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = userResponse.data;

    const sessionManager = createSession();

    await sessionManager.loginBySocialAccount(
      {
        email: profile.email,
        fullname: profile.name,
        avatar: profile.avatar_url,
        name: profile.name?.split(" ")[0] ?? profile.username,
        surname: profile.name?.split(" ").slice(1).join(" ") ?? "",
        emailVerified: true,
        socialCode: md5(access_token),
        allowRegister: GITLAB_ALLOW_REGISTER,
        userField: "email",
      },
      req,
      res,
      next,
    );
  } catch (error) {
    next(new HttpServerError("errMsg_GitlabAuthFailed", error));
    console.error("GitLab Auth error:", error.response?.data || error);
  }
});

router.get("/gitlab-auth/callback", (req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.sendFile(__dirname + "/authdemo/gitlab-callback.html");
});

module.exports = router;
