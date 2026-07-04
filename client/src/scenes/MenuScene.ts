import Phaser from "phaser";
import { GameMode, CoopSubtype, CompetitiveSubtype } from "shared/types/enums";
import { colyseusClient } from "../network/ColyseusClient";

type MenuState = "main" | "create" | "join" | "connecting";

export class MenuScene extends Phaser.Scene {
  private menuState: MenuState = "main";
  private codeChars: string[] = [];
  private statusText!: Phaser.GameObjects.Text;
  private modeIndex = 0;
  private subTypeIndex = 0;

  private readonly MODES = [GameMode.Cooperative, GameMode.Competitive];
  private readonly SUBTYPES: Record<string, string[]> = {
    [GameMode.Cooperative]: [CoopSubtype.SharedLives, CoopSubtype.IndependentLives, CoopSubtype.RoleSpecialization],
    [GameMode.Competitive]: [CompetitiveSubtype.ScoreRace, CompetitiveSubtype.LastShipStanding, CompetitiveSubtype.Territory],
  };
  private readonly MODE_LABELS: Record<string, string> = {
    [GameMode.Cooperative]: "CO-OP",
    [GameMode.Competitive]: "COMPETITIVE",
  };
  private readonly SUBTYPE_LABELS: Record<string, string> = {
    [CoopSubtype.SharedLives]: "SHARED LIVES",
    [CoopSubtype.IndependentLives]: "INDEPENDENT LIVES",
    [CoopSubtype.RoleSpecialization]: "ROLE SPECIALIZATION",
    [CompetitiveSubtype.ScoreRace]: "SCORE RACE",
    [CompetitiveSubtype.LastShipStanding]: "LAST SHIP STANDING",
    [CompetitiveSubtype.Territory]: "TERRITORY",
  };

  constructor() { super({ key: "MenuScene" }); }

  create() {
    this.menuState = "main";
    this.codeChars = [];
    this.modeIndex = 0;
    this.subTypeIndex = 0;
    this.drawMain();
  }

  private clear() {
    this.children.list.slice().forEach(c => c.destroy());
    this.input.keyboard!.removeAllListeners();
  }

  private cx() { return this.scale.width / 2; }
  private cy() { return this.scale.height / 2; }

  private drawMain() {
    this.clear();
    this.menuState = "main";
    const cx = this.cx(), cy = this.cy();
    this.add.text(cx, cy - 140, "GALAGA", { fontSize: "64px", color: "#ffff00", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy - 20, "[ C ]  CREATE ROOM", { fontSize: "22px", color: "#00ffff", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy + 30, "[ J ]  JOIN ROOM", { fontSize: "22px", color: "#00ffff", fontFamily: "monospace" }).setOrigin(0.5);

    this.input.keyboard!.on("keydown-C", () => this.drawCreate());
    this.input.keyboard!.on("keydown-J", () => this.drawJoin());
  }

  private drawCreate() {
    this.clear();
    this.menuState = "create";
    const cx = this.cx(), cy = this.cy();
    this.add.text(cx, cy - 160, "CREATE ROOM", { fontSize: "32px", color: "#ffff00", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy - 90, "MODE:  ← →", { fontSize: "16px", color: "#888888", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy - 40, "SUBTYPE:  A D", { fontSize: "16px", color: "#888888", fontFamily: "monospace" }).setOrigin(0.5);

    const modeText = this.add.text(cx, cy - 70, "", { fontSize: "22px", color: "#00ffff", fontFamily: "monospace" }).setOrigin(0.5);
    const subText  = this.add.text(cx, cy - 20, "", { fontSize: "22px", color: "#00ff88", fontFamily: "monospace" }).setOrigin(0.5);
    this.statusText = this.add.text(cx, cy + 60, "", { fontSize: "16px", color: "#ff4444", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy + 20, "[ ENTER ] CREATE", { fontSize: "20px", color: "#aaaaaa", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy + 100, "[ ESC ] BACK", { fontSize: "16px", color: "#666666", fontFamily: "monospace" }).setOrigin(0.5);

    const refresh = () => {
      const mode = this.MODES[this.modeIndex];
      const subtypes = this.SUBTYPES[mode];
      if (this.subTypeIndex >= subtypes.length) this.subTypeIndex = 0;
      modeText.setText(this.MODE_LABELS[mode]);
      subText.setText(this.SUBTYPE_LABELS[subtypes[this.subTypeIndex]]);
    };
    refresh();

    this.input.keyboard!.on("keydown-LEFT",  () => { this.modeIndex = (this.modeIndex - 1 + this.MODES.length) % this.MODES.length; this.subTypeIndex = 0; refresh(); });
    this.input.keyboard!.on("keydown-RIGHT", () => { this.modeIndex = (this.modeIndex + 1) % this.MODES.length; this.subTypeIndex = 0; refresh(); });
    this.input.keyboard!.on("keydown-A", () => { const s = this.SUBTYPES[this.MODES[this.modeIndex]]; this.subTypeIndex = (this.subTypeIndex - 1 + s.length) % s.length; refresh(); });
    this.input.keyboard!.on("keydown-D", () => { const s = this.SUBTYPES[this.MODES[this.modeIndex]]; this.subTypeIndex = (this.subTypeIndex + 1) % s.length; refresh(); });

    this.input.keyboard!.once("keydown-ENTER", async () => {
      this.statusText.setText("Creating...").setColor("#ffffff");
      const mode = this.MODES[this.modeIndex];
      const subType = this.SUBTYPES[mode][this.subTypeIndex];
      try {
        await colyseusClient.createRoom(mode, subType);
        this.scene.start("LobbyScene");
      } catch (e) {
        this.statusText.setText("Could not connect to server.").setColor("#ff4444");
        this.input.keyboard!.once("keydown-ENTER", () => this.drawCreate());
      }
    });
    this.input.keyboard!.on("keydown-ESC", () => this.drawMain());
  }

  private drawJoin() {
    this.clear();
    this.menuState = "join";
    const cx = this.cx(), cy = this.cy();
    this.add.text(cx, cy - 120, "JOIN ROOM", { fontSize: "32px", color: "#ffff00", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy - 60, "ENTER ROOM CODE:", { fontSize: "18px", color: "#888888", fontFamily: "monospace" }).setOrigin(0.5);
    const codeDisplay = this.add.text(cx, cy - 20, "______", { fontSize: "32px", color: "#00ffff", fontFamily: "monospace" }).setOrigin(0.5);
    this.statusText = this.add.text(cx, cy + 40, "", { fontSize: "16px", color: "#ff4444", fontFamily: "monospace" }).setOrigin(0.5);
    this.add.text(cx, cy + 80, "[ ESC ] BACK", { fontSize: "16px", color: "#666666", fontFamily: "monospace" }).setOrigin(0.5);

    const allowed = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let joining = false;
    const refreshCode = () => {
      const display = this.codeChars.concat(Array(6 - this.codeChars.length).fill("_")).join("");
      const formatted = display.slice(0, 3) + "-" + display.slice(3);
      codeDisplay.setText(formatted);
    };

    this.input.keyboard!.on("keydown", async (e: KeyboardEvent) => {
      if (joining) return;
      if (e.key === "Escape") { this.drawMain(); return; }
      if (e.key === "Backspace") { this.codeChars.pop(); refreshCode(); return; }
      const ch = e.key.toUpperCase();
      if (allowed.includes(ch) && this.codeChars.length < 6) {
        this.codeChars.push(ch);
        refreshCode();
      }
      if (!joining && this.codeChars.length === 6) {
        joining = true;
        this.statusText.setText("Joining...").setColor("#ffffff");
        const code = this.codeChars.join("");
        try {
          await colyseusClient.joinRoom(code);
          this.scene.start("LobbyScene");
        } catch (e) {
          this.statusText.setText("Room not found.").setColor("#ff4444");
          this.codeChars = [];
          refreshCode();
          joining = false;
        }
      }
    });
  }
}
