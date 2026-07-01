export enum GameMode {
  Cooperative = "cooperative",
  Competitive = "competitive",
}

export enum CoopSubtype {
  SharedLives = "shared_lives",
  IndependentLives = "independent_lives",
  RoleSpecialization = "role_specialization",
}

export enum CompetitiveSubtype {
  ScoreRace = "score_race",
  LastShipStanding = "last_ship_standing",
  Territory = "territory",
}

export enum PlayerRole {
  Shooter = "shooter",
  Shield = "shield",
  Bomber = "bomber",
  Healer = "healer",
}

export enum ShooterShotType {
  Rapid = "rapid",
  Heavy = "heavy",
  Spread = "spread",
  Piercing = "piercing",
}

export enum EnemyType {
  Basic = "basic",
  Boss = "boss",
}

export enum GamePhase {
  Lobby = "lobby",
  Playing = "playing",
  GameOver = "gameover",
}
