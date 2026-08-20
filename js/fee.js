/* TeleCod marketplace fee configuration */
window.TELECOD_FEE_PERCENT = 20;

window.telecodMoney = function(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat(
    localStorage.getItem("lang") === "en" ? "en-US" : "id-ID",
    { style: "currency", currency: "IDR", maximumFractionDigits: 0 }
  ).format(n);
};

window.telecodNetAmount = function(price) {
  const amount = Number(price || 0);
  return Math.max(0, Math.floor(amount * (100 - window.TELECOD_FEE_PERCENT) / 100));
};

window.telecodFeeAmount = function(price) {
  const amount = Number(price || 0);
  return Math.max(0, Math.floor(amount * window.TELECOD_FEE_PERCENT / 100));
};
