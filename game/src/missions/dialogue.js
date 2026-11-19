// Dialogue: plays conversations on the card with voice blips, and runs the cutscene camera for scene talks.
import { createConversation } from './conversation.js';
import { createCutscene } from './cutscene.js';
import { createDialogueCard } from '../ui/dialoguecard.js';
import { castMember } from '../data/cast.js';

/**
 * Dialogue over `game`. talk(lines, done, {scene, focus}) queues a conversation; a scene holds Ilo and takes the
 * camera while it plays. setVoice(fn(characterId, line)) connects the voice blips. update(dt, input) each step.
 */
export function createDialogue(game) {
  const card = createDialogueCard(game.hud.root);
  const cutscene = createCutscene(game);
  let voice = () => {};

  const conversation = createConversation({
    onLine(line) {
      if (line.scene && !cutscene.active) {
        const focus = line.scene.focus;
        game.player.holdForScene(focus?.x ?? null, focus?.z ?? null);
        cutscene.begin(focus);
      }
      voice(line.speaker, line.text);
    },
  });

  function endScene() {
    if (!cutscene.active) return;
    cutscene.end();
    game.player.releaseScene();
  }

  return {
    conversation,
    cutscene,
    card,
    get active() {
      return conversation.active;
    },
    setVoice(fn) {
      voice = fn;
    },
    /** Queue `lines` ([speaker, text] pairs); `done` runs after the last one. */
    talk(lines, done = () => {}, options = {}) {
      const list = (lines ?? []).map((line) => (Array.isArray(line) ? { speaker: line[0], text: line[1] } : line));
      if (options.scene && list.length) list[0] = { ...list[0], scene: { focus: options.focus ?? null } };
      conversation.queue(list, () => {
        if (options.scene) endScene();
        done();
      });
    },
    /** Stop talking at once (a quit or a failure): no callbacks, the camera and Ilo are handed back. */
    clear() {
      conversation.clear();
      endScene();
      card.update(null);
    },
    update(dt, input) {
      if (conversation.active && input.pressed('Enter')) conversation.skip();
      conversation.update(dt);
      cutscene.update(dt);
      const line = conversation.line;
      card.update(line ? castMember(line.speaker) : null, conversation.text, conversation.complete);
    },
  };
}
