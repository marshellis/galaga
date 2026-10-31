export interface InputEvent {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

export interface JoinOptions {
  displayName?: string;
  mode?: string;
  subType?: string;
  /** Signed Marshellis game pass from the site (optional; see server/src/auth/pass.ts). */
  pass?: string;
}
