import {
  IconAlertCircle,
  IconBriefcase,
  IconClockExclamation,
  IconCreditCard,
  IconCurrencyRupee,
  IconEyeOff,
  IconGift,
  IconHourglassHigh,
  IconIdBadge2,
  IconKey,
  IconLink,
  IconLockPassword,
  IconRobotOff,
  IconWorldExclamation,
} from '@tabler/icons-react';

// One Tabler icon per flag code (UI-UX.md "Flag icons"). The label always comes from the API,
// because one code can have more than one label ("Pretends to be India Post").
const FLAG_ICONS = {
  URGENCY: IconClockExclamation,
  DEADLINE: IconHourglassHigh,
  IMPERSONATION: IconIdBadge2,
  OTP_REQUEST: IconKey,
  CARD_DETAILS_REQUEST: IconCreditCard,
  PASSWORD_REQUEST: IconLockPassword,
  MONEY_REQUEST: IconCurrencyRupee,
  PRIZE_OFFER: IconGift,
  JOB_OFFER: IconBriefcase,
  PROMPT_INJECTION: IconRobotOff,
  LOOKALIKE_LINK: IconLink,
  UNUSUAL_LINK: IconWorldExclamation,
  SHORT_LINK: IconEyeOff,
};

/** The icon for a flag code; an unknown code (for example after a rules update) still gets one. */
export function FlagIcon({ code }) {
  const Icon = FLAG_ICONS[code] ?? IconAlertCircle;
  return <Icon aria-hidden="true" />;
}
