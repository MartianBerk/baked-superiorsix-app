import { apiFetch, readApiJson } from './client';
import { ApiError } from './errors';

/** baked-user profile document for app `superiorsix`. */
export type UserProfileDocument = {
  id: string;
  app_name: string;
  auth_id: string;
  profile: {
    first_name?: string;
    last_name?: string;
    nickname?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    active?: boolean;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string;
};

export type ProfileFields = {
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
};

/**
 * Load the caller's (or readable) roster profile via baked-user by-auth.
 * Throws ApiError 404 when no profile exists yet.
 */
export async function fetchProfileByAuth(
  token: string,
  authId: string,
): Promise<UserProfileDocument> {
  let response: Response;
  try {
    response = await apiFetch('user', `/superiorsix/users/by-auth/${authId}`, {
      token,
    });
  } catch {
    throw new ApiError(
      0,
      'Could not reach baked-user. Is local-dev up on :8020?',
    );
  }
  return readApiJson<UserProfileDocument>(response);
}

/** Map a by-auth document into the editable form fields. */
export function profileFieldsFromDocument(
  doc: UserProfileDocument,
): ProfileFields {
  const data = doc.profile ?? {};
  return {
    first_name: typeof data.first_name === 'string' ? data.first_name : '',
    last_name: typeof data.last_name === 'string' ? data.last_name : '',
    nickname: typeof data.nickname === 'string' ? data.nickname : '',
    email: typeof data.email === 'string' ? data.email : '',
  };
}
