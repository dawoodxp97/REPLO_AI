const EMAIL = /^[^@\s]+@[^@\s]+$/

function isEmail(value) {
  return EMAIL.test(value)
}

module.exports = { isEmail }
