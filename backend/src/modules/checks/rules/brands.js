// Brands that scam messages in India pretend to be, with their real (registered) domains.
//   names:    how the brand is written in a message (matched as whole words, any case)
//   keywords: what a lookalike domain tends to contain ("sbi-kyc-update.co" has "sbi")
//   official: the registered domains the brand really uses; any other domain that carries
//             the brand's keyword is a lookalike
//   kind:     picks the advice ("Call SBI on the number printed on your card")
// The list is small on purpose: it covers the samples and the most copied brands, and a new
// brand is one more line.
const BRANDS = [
  { id: 'sbi', name: 'SBI', kind: 'bank', names: ['sbi', 'state bank of india', 'yono'], keywords: ['sbi', 'onlinesbi', 'yonosbi'], official: ['sbi.co.in', 'onlinesbi.sbi', 'sbi.bank.in'] },
  { id: 'hdfc', name: 'HDFC Bank', kind: 'bank', names: ['hdfc', 'hdfc bank'], keywords: ['hdfc', 'hdfcbank'], official: ['hdfcbank.com', 'hdfc.bank.in', 'hdfcbank.bank.in'] },
  { id: 'icici', name: 'ICICI Bank', kind: 'bank', names: ['icici', 'icici bank'], keywords: ['icici', 'icicibank'], official: ['icicibank.com', 'icici.bank.in'] },
  { id: 'axis', name: 'Axis Bank', kind: 'bank', names: ['axis bank'], keywords: ['axisbank'], official: ['axisbank.com', 'axis.bank.in'] },
  { id: 'kotak', name: 'Kotak Bank', kind: 'bank', names: ['kotak', 'kotak mahindra bank'], keywords: ['kotak'], official: ['kotak.com', 'kotak.bank.in'] },
  { id: 'pnb', name: 'PNB', kind: 'bank', names: ['pnb', 'punjab national bank'], keywords: ['pnb', 'pnbindia'], official: ['pnbindia.in', 'pnb.bank.in'] },
  { id: 'paytm', name: 'Paytm', kind: 'payments', names: ['paytm'], keywords: ['paytm'], official: ['paytm.com'] },
  { id: 'phonepe', name: 'PhonePe', kind: 'payments', names: ['phonepe'], keywords: ['phonepe'], official: ['phonepe.com'] },
  { id: 'paypal', name: 'PayPal', kind: 'payments', names: ['paypal'], keywords: ['paypal'], official: ['paypal.com', 'paypal.me'] },
  { id: 'amazon', name: 'Amazon', kind: 'shop', names: ['amazon'], keywords: ['amazon'], official: ['amazon.in', 'amazon.com', 'amzn.to', 'amzn.in'] },
  { id: 'flipkart', name: 'Flipkart', kind: 'shop', names: ['flipkart'], keywords: ['flipkart'], official: ['flipkart.com', 'fkrt.it'] },
  { id: 'indiapost', name: 'India Post', kind: 'courier', names: ['india post', 'indiapost', 'speed post'], keywords: ['indiapost', 'indiapst'], official: ['indiapost.gov.in'] },
  { id: 'bluedart', name: 'Blue Dart', kind: 'courier', names: ['blue dart', 'bluedart'], keywords: ['bluedart'], official: ['bluedart.com'] },
  { id: 'delhivery', name: 'Delhivery', kind: 'courier', names: ['delhivery'], keywords: ['delhivery'], official: ['delhivery.com'] },
  { id: 'fedex', name: 'FedEx', kind: 'courier', names: ['fedex'], keywords: ['fedex'], official: ['fedex.com'] },
  { id: 'irctc', name: 'IRCTC', kind: 'service', names: ['irctc'], keywords: ['irctc'], official: ['irctc.co.in'] },
  { id: 'incometax', name: 'the Income Tax Department', kind: 'government', names: ['income tax', 'income-tax', 'itr refund'], keywords: ['incometax', 'itrefund'], official: ['incometax.gov.in'] },
  { id: 'epfo', name: 'EPFO', kind: 'government', names: ['epfo', 'provident fund'], keywords: ['epfo'], official: ['epfindia.gov.in'] },
  { id: 'uidai', name: 'UIDAI (Aadhaar)', kind: 'government', names: ['aadhaar', 'aadhar', 'uidai'], keywords: ['aadhaar', 'aadhar', 'uidai'], official: ['uidai.gov.in'] },
  { id: 'whatsapp', name: 'WhatsApp', kind: 'service', names: ['whatsapp'], keywords: ['whatsapp'], official: ['whatsapp.com', 'wa.me'] },
  { id: 'netflix', name: 'Netflix', kind: 'service', names: ['netflix'], keywords: ['netflix'], official: ['netflix.com'] },
  { id: 'jio', name: 'Jio', kind: 'service', names: ['jio'], keywords: ['jio', 'myjio'], official: ['jio.com'] },
  { id: 'airtel', name: 'Airtel', kind: 'service', names: ['airtel'], keywords: ['airtel'], official: ['airtel.in', 'airtel.com'] },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// One whole-word pattern per brand, built once. "sbi" matches "SBI" and "SBI's", not "Sbinder".
const BRAND_PATTERNS = BRANDS.map((brand) => ({
  brand,
  pattern: new RegExp(`(?<![a-z0-9])(?:${brand.names.map(escapeRegExp).join('|')})(?![a-z0-9])`, 'gi'),
}));

/** The brands a message names, each with where the first mention is: [{ brand, start, end }]. */
function findBrandMentions(text) {
  const mentions = [];
  for (const { brand, pattern } of BRAND_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match) {
      mentions.push({ brand, start: match.index, end: match.index + match[0].length });
    }
  }
  return mentions.sort((a, b) => a.start - b.start);
}

function findOfficialBrand(domain) {
  return BRANDS.find((brand) => brand.official.includes(domain)) ?? null;
}

module.exports = { BRANDS, findBrandMentions, findOfficialBrand };
