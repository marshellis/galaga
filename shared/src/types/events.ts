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
}
