/**
 * HONK Gaming Coach Engine (Coach Mode Default)
 * Mandate: Observe permitted game state, explain game situations, provide tactical strategy, and assist with controls.
 * STRICT ANTI-CHEAT & COMPLIANCE:
 * - NEVER automates competitive gameplay.
 * - NEVER bypasses anti-cheat systems or game security controls.
 * - NEVER violates a game's terms of service.
 */

export interface GameStateObservation {
  gameTitle: string;
  genre: string;
  visibleHUDText: string[];
  healthStatus?: string;
  ammoStatus?: string;
  currentObjective?: string;
  tacticalSituation: string;
}

export interface CoachAdvice {
  summaryDesi: string;
  tacticalTip: string;
  suggestedControls: string[];
  recommendedStrategy: string;
  antiCheatCompliant: boolean;
  isAutomationEnabled: boolean; // Always false for competitive gameplay
}

export class GamingCoachEngine {
  private static instance: GamingCoachEngine;

  private constructor() {}

  public static getInstance(): GamingCoachEngine {
    if (!GamingCoachEngine.instance) {
      GamingCoachEngine.instance = new GamingCoachEngine();
    }
    return GamingCoachEngine.instance;
  }

  /**
   * Observe visible game HUD & state and generate Coach Advice
   */
  public generateCoachAdvice(
    gameTitleQuery: string,
    visibleText: string[] = []
  ): CoachAdvice {
    const gameTitle = gameTitleQuery || 'Active Game';
    const gameLower = gameTitle.toLowerCase();

    const isFPS = /bgmi|pubg|freefire|call of duty|cod|valorant|csgo|apex/i.test(gameLower);
    const isChessOrStrategy = /chess|ludo|clash|age of empire|starcraft|monopoly/i.test(gameLower);

    let summaryDesi = '';
    let tacticalTip = '';
    let suggestedControls: string[] = [];
    let recommendedStrategy = '';

    if (isFPS) {
      summaryDesi = `Bhai, ${gameTitle} mein Coach Mode active hai! Focus on cover and zone positioning.`;
      tacticalTip = 'Reload behind solid hard cover before engaging in the next high-ground gunfight. Keep high ground advantage.';
      suggestedControls = [
        'Crouch/Prone for recoil stability',
        'Use smoke grenades for safe revive or rotation',
        'Peak from right shoulder cover',
      ];
      recommendedStrategy = 'Rotate early to the center of the safe zone rather than edge-hunting. Save boost items for end-game circles.';
    } else if (isChessOrStrategy) {
      summaryDesi = `Bhai, ${gameTitle} mein Coach Mode tactical guide ready hai!`;
      tacticalTip = 'Control the center 4 squares (d4, d5, e4, e5) and develop minor pieces (knights and bishops) early.';
      suggestedControls = [
        'Look 2 moves ahead for undefended enemy pieces',
        'Castle early to protect your king',
      ];
      recommendedStrategy = 'Maintain pawn structure and avoid premature queen attacks before your rooks are connected.';
    } else {
      summaryDesi = `Bhai, ${gameTitle} ka Coach Mode observation complete hai!`;
      tacticalTip = 'Review visible controls and objective indicators on screen. Take time to master timing and resource conservation.';
      suggestedControls = ['Tap main action button when indicator aligns', 'Keep eye on energy/cooldown meters'];
      recommendedStrategy = 'Follow main story or level objective markers while stocking up on essential consumable items.';
    }

    return {
      summaryDesi,
      tacticalTip,
      suggestedControls,
      recommendedStrategy,
      antiCheatCompliant: true,
      isAutomationEnabled: false, // Strict Rule: Coach mode advises, user controls!
    };
  }
}
