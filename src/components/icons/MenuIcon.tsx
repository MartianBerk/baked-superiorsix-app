import { SvgXml } from 'react-native-svg';

import { colors } from '@/theme';

/** Legacy supersixapp menu SVGs (assets/icons/*.svg), fill overridden for theme. */
const FIXTURES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path fill="CURRENT" d="M288.76,163.31h33.63v14.47H303.23v44.44h19.16v14.47H288.76V163.31Zm-80,72.55v32.2H194.32v-32.2a38.95,38.95,0,0,1,0-76.54v-31h14.47v31a38.95,38.95,0,0,1,0,76.54Zm-98.43.83H76.72V222.22H95.89V177.78H76.72V163.31h33.64v73.38Zm137.1-118.07H67.09V281H336V118.62Z"/><path fill="CURRENT" d="M201.56,170.94a27.23,27.23,0,1,0,27.23,27.23,27.23,27.23,0,0,0-27.23-27.23Z"/><path fill="CURRENT" d="M49.18,103.66H350.82V296.34H49.18V103.66ZM27.57,318H372.43V82H27.57V318Z"/></svg>`;

const SCORES = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><polygon fill="CURRENT" points="29.62 271.45 46.66 271.45 46.66 103.17 353.34 103.17 353.34 271.45 370.38 271.45 370.38 85.91 29.62 85.91 29.62 271.45"/><path fill="CURRENT" d="M196.3,168.4l2.68,2.69,2.76-2.76-1.74,0c-1.24,0-2.47,0-3.7.09Z"/><path fill="CURRENT" d="M237.6,194.73a65.77,65.77,0,0,0-97.19,82.46,65.26,65.26,0,0,0,12.35,17.38l.06.07a65.58,65.58,0,0,0,46.27,19.45h.84A65.76,65.76,0,0,0,237.6,194.73Z"/></svg>`;

const LEADERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path fill="CURRENT" d="M251.39,290.51H147.69a18,18,0,0,0-18,18v2.18H111.36a10.1,10.1,0,1,0,0,20.2H288.64a10.1,10.1,0,0,0,0-20.2H269.41v-2.18a18,18,0,0,0-18-18Z"/><path fill="CURRENT" d="M92.5,182.45l1.43,1a120,120,0,0,0,23.62,12.09c15.87,6.09,25.36,14.47,26.72,23.58,1.33,8.93-5.06,19.41-18,29.48a6.88,6.88,0,0,0,8.45,10.85,77.15,77.15,0,0,0,15.64-15.8,153.05,153.05,0,0,1,.91,16.6v15.88h97.42V260.2a153.05,153.05,0,0,1,.91-16.6,77.15,77.15,0,0,0,15.64,15.8,6.88,6.88,0,0,0,8.45-10.85c-12.92-10.07-19.31-20.55-18-29.48,1.36-9.11,10.85-17.49,26.72-23.58a120,120,0,0,0,23.62-12.09l1.43-1a51.83,51.83,0,0,0-22.31-94.53V69.09H114.81V87.92A51.83,51.83,0,0,0,92.5,182.45Z"/><path fill="CURRENT" d="M200.06,103.62a37.81,37.81,0,1,1-37.81,37.81,37.81,37.81,0,0,1,37.81-37.81Z"/></svg>`;

const USERS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><path fill="CURRENT" d="M204,332c43.05,0,75.29-4.55,125.28-20.07.13-1.81.16-3.77.15-6.43-.22-44.85-26.85-72.13-73.35-87.6-13.58,7.6-39.42,14-56.05,14s-42.47-6.4-56.05-14c-46.5,15.47-73.35,42.75-73.35,87.6,0,2.84.11,5,.28,6.87C119.1,327.45,158.14,332,204,332Z"/><path fill="CURRENT" d="M200,68c-38.8,0-70.36,32-70.36,71.25S161.2,210.49,200,210.49s70.35-32,70.35-71.24S238.79,68,200,68Z"/></svg>`;

const ICONS = {
  fixtures: FIXTURES,
  scores: SCORES,
  leaders: LEADERS,
  users: USERS,
} as const;

export type MenuIconName = keyof typeof ICONS;

type Props = {
  name: MenuIconName;
  size?: number;
  color?: string;
  active?: boolean;
};

export function MenuIcon({
  name,
  size = 28,
  color,
  active = false,
}: Props) {
  const fill = color ?? (active ? colors.accentBright : colors.textMuted);
  const xml = ICONS[name].replaceAll('CURRENT', fill);
  return <SvgXml xml={xml} width={size} height={size} />;
}
