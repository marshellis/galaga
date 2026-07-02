import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";
import { GameOverScene } from "./scenes/GameOverScene";

// colyseus.js 0.15 passes { headers, protocols } as the WebSocket protocols arg.
// Safari rejects non-string/array protocols and fires an error event (not a throw),
// so the library's own try-catch never rescues it. Patch WebSocket to strip the object.
{
  const _NativeWS = window.WebSocket;
  (window as any).WebSocket = class extends _NativeWS {
    constructor(url: string | URL, protocols?: any) {
      const p = (protocols != null && typeof protocols === "object" && !Array.isArray(protocols))
        ? (protocols.protocols as string[] | undefined)
        : (protocols as string | string[] | undefined);
      p != null ? super(url, p) : super(url);
    }
  };
}

new Phaser.Game({
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: "#000000",
  pixelArt: true,
  scene: [BootScene, MenuScene, GameScene, GameOverScene],
});
