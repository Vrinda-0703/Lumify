const express = require("express");
const protect = require("../middleware/authMiddleware");
const c = require("../controllers/featureController").shared;

const router = express.Router();

router.get("/invitation/:token", c.getInvitation);
router.post("/invitation/:token/respond", protect, c.respondInvitationToken);
router.get("/", protect, c.list);
router.post("/", protect, c.create);
router.put("/:id", protect, c.update);
router.delete("/:id", protect, c.delete);
router.post("/:id/invite", protect, c.invite);
router.post("/:id/respond", protect, c.respond);
router.post("/:id/contribute", protect, c.contribute);
router.delete("/:id/members/:userId", protect, c.removeMember);
router.post("/:id/leave", protect, c.leave);

module.exports = router;
