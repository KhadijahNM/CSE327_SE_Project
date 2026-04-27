const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/index.html")));
router.get("/login", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/login.html")));
router.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/dashboard.html")));
router.get("/diagnostics", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/diagnostics.html")));
router.get("/donation", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/donation.html")));
router.get("/settings", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/settings.html")));
router.get("/test-history", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/test-history.html")));
router.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "../../client/html/admin.html")));

module.exports = router;
