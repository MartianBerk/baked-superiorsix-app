/**
 * Legacy Superior Six password complexity (baked-auth password_policy /
 * accesscontrol.json). Keep in sync with baked-auth
 * `PASSWORD_COMPLEXITY_*`.
 */
export const PASSWORD_COMPLEXITY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!"#$%&'()*+,\-./:;<=>?@[\]^_`{|}~]{8,}$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be at least 8 characters and include at least one lowercase ' +
  'letter, one uppercase letter, and one digit; allowed special characters are ' +
  '!"#$%&\'()*+,-./:;<=>?@[]^_`{|}~.';

export function isPasswordComplex(password: string): boolean {
  return PASSWORD_COMPLEXITY_PATTERN.test(password);
}
