import type { PropsWithChildren } from 'react';
import { Fragment } from 'react';

/** Native: no phone frame — app is already device-sized. */
export function WebPhoneFrame({ children }: PropsWithChildren) {
  return <Fragment>{children}</Fragment>;
}
