import { COPY, helpReply, mainMenuReply } from "@/lib/conversation/copy";
import { textReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationHandler,
  ConversationTurn,
  HandlerResult,
} from "@/lib/conversation/handlers/types";

export function landingFor(_userType?: string): HandlerResult {
  return {
    state: "MAIN_MENU",
    context: {},
    replies: [mainMenuReply()],
  };
}

export function showHelp(): HandlerResult {
  return {
    state: "SUPPORT",
    context: {},
    replies: [helpReply()],
  };
}

export async function requestHumanSupport(
  turn: ConversationTurn,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (deps.support) {
    await deps.support.open({
      phoneNumber: turn.message.phoneNumber,
      userType: turn.identity.userType,
      userId: turn.identity.userId,
      category: "CONVERSATION",
      description: turn.input.raw || "User asked to talk to support",
    });
  }

  return {
    state: "SUPPORT",
    context: {},
    replies: [textReply(COPY.supportCreated)],
  };
}

export const handleSupport: ConversationHandler = async (turn, deps) => {
  if (turn.input.choice === 1 || turn.input.menu || turn.input.greeting) {
    return landingFor(turn.identity.userType);
  }

  if (turn.input.choice === 2 || turn.input.normalized.includes("talk to support")) {
    return requestHumanSupport(turn, deps);
  }

  return showHelp();
};
