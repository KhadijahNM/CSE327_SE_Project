function normalizeEmail(value) {
  return value ? String(value).trim().toLowerCase() : "";
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function cleanDate(value) {
  const trimmed = cleanText(value);
  if (!trimmed) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

const UserDecorator = require("./UserDecorator");

function serializeUser(user) {
  const decorator = new UserDecorator(user);
  return decorator.decorate();
}

module.exports = {
  normalizeEmail,
  cleanText,
  cleanDate,
  serializeUser
};
