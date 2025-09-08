import notificationConfig from 'services/notifications/config';

const baseUrl = `${notificationConfig.BASE_URL}/public/img`;

const icons = [
  { name: 'LogoBanner', file: 'blackbridge-banner.png' },
  { name: 'PhoneIcon', file: 'phone-icon.png' },
  { name: 'TabletIcon', file: 'tablet-icon.png' },
  { name: 'LaptopIcon', file: 'laptop-icon.png' },
  { name: 'LoginIcon', file: 'login-icon.png' },
] as const;

type IconExports = {
  [K in (typeof icons)[number]['name']]: string;
};

const iconExports: IconExports = icons.reduce((acc, { name, file }) => {
  acc[name] = `${baseUrl}/${file}`;
  return acc;
}, {} as IconExports);

export const { LogoBanner, PhoneIcon, TabletIcon, LaptopIcon, LoginIcon } = iconExports;
