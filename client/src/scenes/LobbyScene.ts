import Phaser from "phaser";
import { colyseusClient } from "../network/ColyseusClient";
import { GameState } from "shared/schemas/GameState";
import {
  GamePhase,
  GameMode,
  CoopSubtype,
  PlayerRole,
  ShooterShotType,
} from "shared/types/enums";

export class LobbyScene extends Phaser.Scene {
  private listText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private rolePicker: Phaser.GameObjects.Text[] = [];
  private roleIndex = 0;

  private readonly ROLES = [PlayerRole.Shooter, PlayerRole.Shield, PlayerRole.Bomber, PlayerRole.Healer];
  private readonly SHOT_TYPES = [ShooterShotType.Rapid, ShooterShotType.Heavy, ShooterShotType.Spread, ShooterShotType.Piercing];
  private shotIndex = 0;

  constructor() { super({ key: "LobbyScene" }); }

  create() {
    this.roleIndex = 0;
    this.shotIndex = 0;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, 40, "LOBBY", { fontSize: "36px", color: "#ffff00", fontFamily: "monospace" }).setOrigin(0.5);

    this.infoText = this.add.text(cx, 90, "", { fontSize: "18px", color: "#00ffff", fontFamily: "monospace" }).setOrigin(0.5);
    this.listText = this.add.text(40, 130, "", { fontSize: "16px", color: "#ffffff", fontFamily: "monospace" });
    this.promptText = this.add.text(cx, cy + 160, "", { fontSize: "16px", color: "#aaaaaa", fontFamily: "monospace" }).setOrigin(0.5);

    const room = colyseusClient.room!;
    const state = room.state as unknown as GameState;

    // Watch for game start
    room.onStateChange.once(() => {});  // ensure listener is set
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        const s = colyseusClient.room?.state as unknown as GameState | undefined;
        if (!s) return;
        if (s.phase === GamePhase.Playing) {
          this.scene.start("GameScene");
          return;
        }
        this.refresh(s);
      },
    });

    this.input.keyboard!.on("keydown-ENTER", () => {
      const s = colyseusClient.room?.state as unknown as GameState | undefined;
      if (!s) return;
      if (s.hostId !== colyseusClient.room?.sessionId) return;
      colyseusClient.sendStart();
    });

    // Role selection keys (only in Role Specialization mode)
    this.input.keyboard!.on("keydown-LEFT",  () => this.changeRole(-1));
    this.input.keyboard!.on("keydown-RIGHT", () => this.changeRole(1));
    this.input.keyboard!.on("keydown-UP",    () => this.changeShotType(-1));
    this.input.keyboard!.on("keydown-DOWN",  () => this.changeShotType(1));
  }

  private changeRole(dir: number) {
    const s = colyseusClient.room?.state as unknown as GameState | undefined;
    if (!s || s.subType !== CoopSubtype.RoleSpecialization) return;
    this.roleIndex = (this.roleIndex + dir + this.ROLES.length) % this.ROLES.length;
    colyseusClient.sendSetRole(this.ROLES[this.roleIndex]);
  }

  private changeShotType(dir: number) {
    const s = colyseusClient.room?.state as unknown as GameState | undefined;
    const me = s?.players?.get(colyseusClient.room!.sessionId);
    if (!me || me.role !== PlayerRole.Shooter) return;
    this.shotIndex = (this.shotIndex + dir + this.SHOT_TYPES.length) % this.SHOT_TYPES.length;
    colyseusClient.sendSetShotType(this.SHOT_TYPES[this.shotIndex]);
  }

  private refresh(state: GameState) {
    const code = state.roomCode;
    const formatted = code.slice(0, 3) + "-" + code.slice(3);
    const isHost = state.hostId === colyseusClient.room?.sessionId;

    const modeLabel = state.gameMode === GameMode.Cooperative ? "CO-OP" : "COMPETITIVE";
    const subLabel = state.subType.replace(/_/g, " ").toUpperCase();
    this.infoText.setText(`CODE: ${formatted}   ${modeLabel} › ${subLabel}`);

    const lines: string[] = [];
    state.players?.forEach((p: any) => {
      const isMe = p.sessionId === colyseusClient.room?.sessionId;
      const crown = p.sessionId === state.hostId ? " ♦" : "";
      const roleInfo = state.subType === CoopSubtype.RoleSpecialization
        ? `  [${p.role.toUpperCase()}${p.role === PlayerRole.Shooter ? "/" + p.shotType.toUpperCase() : ""}]`
        : "";
      lines.push(`${isMe ? "▶ " : "  "}${p.displayName}${crown}${roleInfo}`);
    });
    this.listText.setText(lines.join("\n"));

    const hints: string[] = [];
    if (state.subType === CoopSubtype.RoleSpecialization) {
      hints.push("← → : change role    ↑ ↓ : change shot type (Shooter only)");
    }
    if (isHost) hints.push("[ ENTER ] : start game");
    this.promptText.setText(hints.join("\n"));
  }
}
