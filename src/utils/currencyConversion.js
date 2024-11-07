const https = require("https");
require("dotenv").config();

// Obtener moneda por país
const getCurrencyByCountry = (country) => {
  const currencies = {
    ARG: "ARS", // Argentina (Peso Argentino)
    BOL: "BOB", // Bolivia (Boliviano)
    CHL: "CLP", // Chile (Peso Chileno)
    COL: "COP", // Colombia (Peso Colombiano)
    CRI: "CRC", // Costa Rica (Colón Costarricense)
    CUB: "CUP", // Cuba (Peso Cubano)
    ECU: "USD", // Ecuador (Dólar Estadounidense)
    SLV: "USD", // El Salvador (Dólar Estadounidense)
    ESP: "EUR", // España (Euro)
    GTM: "GTQ", // Guatemala (Quetzal)
    HND: "HNL", // Honduras (Lempira)
    MEX: "MXN", // México (Peso Mexicano)
    NIC: "NIO", // Nicaragua (Córdoba)
    PAN: "USD", // Panamá (Dólar Estadounidense)
    PRY: "PYG", // Paraguay (Guaraní)
    PER: "PEN", // Perú (Sol)
    DOM: "DOP", // República Dominicana (Peso Dominicano)
    URY: "UYU", // Uruguay (Peso Uruguayo)
    VEN: "VES", // Venezuela (Bolívar Soberano)
  };

  // Si no encuentra el país, retorna USD por defecto
  return currencies[country] || "USD";
};

// Tasas de cambio definidas (1 unidad de moneda local = X USD)
const conversionRates = {
  ARS: 0.0010, // 1 ARS = 0.0010 USD
  BOB: 0.14,    // 1 BOB = 0.14 USD
  CLP: 0.0011, // 1 CLP = 0.00125 USD
  COP: 0.00024, // 1 COP = 0.00022 USD
  CRC: 0.0019,  // 1 CRC = 0.0016 USD
  CUP: 0.042,  // 1 CUP = 0.0417 USD
  EUR: 1.12,    // 1 EUR = 1.05 USD (Ejemplo)
  GTQ: 0.13,    // 1 GTQ = 0.13 USD
  HNL: 0.79,   // 1 HNL = 0.041 USD
  MXN: 0.051,   // 1 MXN = 0.055 USD
  NIO: 0.027,   // 1 NIO = 0.028 USD
  PYG: 0.00013, // 1 PYG = 0.00014 USD
  PEN: 0.27,    // 1 PEN = 0.28 USD
  DOP: 0.017,   // 1 DOP = 0.018 USD
  UYU: 0.024,   // 1 UYU = 0.025 USD
  VES: 0.027, // 1 VES = 0.00045 USD
  USD: 1
  
};

// Conversión de moneda local a USD
const convertLocalCurrencyToUsd = (usdAmount, currency) => {
  const rate = conversionRates[currency];
  if (!rate) {
    throw new Error(`No hay tasa de conversión para la moneda: ${currency}`);
  }
  return usdAmount / rate; 
};

module.exports = {
  getCurrencyByCountry,
  convertLocalCurrencyToUsd 
};
