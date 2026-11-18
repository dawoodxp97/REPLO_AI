function formatMoney(cents, currency) {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).format(cents / 100)
}

module.exports = { formatMoney }
