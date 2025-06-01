const express = require("express");
const router = express.Router();

const {
  startPasswordResetByEmail,
  completePasswordResetByEmail,
} = require("./password-reset-by-email");
router.post("/password-reset-by-email/start", startPasswordResetByEmail);
router.post("/password-reset-by-email/complete", completePasswordResetByEmail);

const {
  startPasswordResetByMobile,
  completePasswordResetByMobile,
} = require("./password-reset-by-mobile");
router.post("/password-reset-by-mobile/start", startPasswordResetByMobile);
router.post(
  "/password-reset-by-mobile/complete",
  completePasswordResetByMobile,
);

const {
  startEmail2Factor,
  completeEmail2Factor,
} = require("./email-2-factor-verification");
router.post("/email-2factor-verification/start", startEmail2Factor);
router.post("/email-2factor-verification/complete", completeEmail2Factor);

const {
  startMobile2Factor,
  completeMobile2Factor,
} = require("./mobile-2-factor-verification");
router.post("/mobile-2factor-verification/start", startMobile2Factor);
router.post("/mobile-2factor-verification/complete", completeMobile2Factor);

const {
  startEmailVerification,
  completeEmailVerification,
} = require("./email-verification");
router.post("/email-verification/start", startEmailVerification);
router.post("/email-verification/complete", completeEmailVerification);

const {
  startMobileVerification,
  completeMobileVerification,
} = require("./mobile-verification");
router.post("/mobile-verification/start", startMobileVerification);
router.post("/mobile-verification/complete", completeMobileVerification);

module.exports = router;
