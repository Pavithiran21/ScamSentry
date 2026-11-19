// The sample chips under the guest check panel. A chip only fills the box: it uses no check
// until "Check message" is pressed. Every name, number and link here is made up.
export const SAMPLE_MESSAGES = [
  {
    label: 'Fake bank KYC',
    text: 'Dear customer, your SBI account will be BLOCKED today. Update KYC immediately at http://sbi-kyc-update.co/verify and share the OTP sent to you.',
  },
  {
    label: 'Job offer',
    text: 'Hi! We are hiring for a part-time job, work from home. Earn ₹3,000 daily by liking YouTube videos. Contact HR on Telegram: t.me/earnfast_hr',
  },
  {
    label: 'Parcel fee',
    text: 'India Post: your parcel is on hold at our hub. Pay ₹25 redelivery fee within 24 hrs or it will be returned: bit.ly/3xYz9k',
  },
  {
    label: 'Real OTP',
    text: '482913 is your OTP for HDFC Bank NetBanking login. Do not share this OTP with anyone. Bank staff will never ask for it. -HDFC Bank',
  },
];

export const MAX_MESSAGE_LENGTH = 5000;
