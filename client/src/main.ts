import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { LobbyScene } from "./scenes/LobbyScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { colyseusClient } from "./network/ColyseusClient";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#000000",
  pixelArt: true,
  scene: [BootScene, MenuScene, LobbyScene, GameScene, GameOverScene],
});

// Expose for smoke tests — lets Playwright drive and inspect game state without parsing canvas
(window as any).__galaga = {
  activeScene: () => game.scene.getScenes(true)[0]?.sys.settings.key ?? null,
  roomCode: () => (colyseusClient.room?.state as any)?.roomCode ?? null,
  roomPhase: () => (colyseusClient.room?.state as any)?.phase ?? null,
  playerCount: () => (colyseusClient.room?.state as any)?.players?.size ?? 0,
  hostId: () => (colyseusClient.room?.state as any)?.hostId ?? null,
  sessionId: () => colyseusClient.room?.sessionId ?? null,
  // Drive actions directly (bypasses keyboard UI so tests don't depend on Phaser key handling)
  createRoom: (mode: string, subType: string) =>
    colyseusClient.createRoom(mode, subType).then(() => {
      game.scene.getScene("MenuScene")?.scene.start("LobbyScene");
    }),
  joinRoom: (code: string) =>
    colyseusClient.joinRoom(code).then(() => {
      game.scene.getScene("MenuScene")?.scene.start("LobbyScene");
    }),
  startGame: () => colyseusClient.sendStart(),
  leave: () => {
    colyseusClient.leave();
    const active = game.scene.getScenes(true)[0];
    active?.scene.start("MenuScene");
  },
};
