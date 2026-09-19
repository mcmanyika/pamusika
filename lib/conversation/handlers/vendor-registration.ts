import { COPY, LANGUAGES, categoryMenuReplies, languageMenuReplies, registrationConfirmText, vendorMenuReplies } from "@/lib/conversation/copy";
import { withRegistration } from "@/lib/conversation/context";
import { continueProductDraft } from "@/lib/conversation/handlers/add-product";
import { qualifyReferral, syncReferralIdentity } from "@/lib/conversation/handlers/referrals";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { parseLocation } from "@/lib/conversation/input";
import { confirmReply, textReply } from "@/lib/conversation/replies";
import type { ConversationEngineDeps, ConversationHandler, HandlerResult } from "@/lib/conversation/handlers/types";
import type { ProductDraft, RegistrationDraft, SessionContext } from "@/types/conversation";

export const handleVendorRegistration: ConversationHandler = async (turn, deps) => {
  const draft = turn.context.registration ?? {};
  const state = turn.session.current_state;

  if (state === "VENDOR_REGISTRATION_NAME") {
    const firstName = turn.input.raw.trim();
    if (firstName.length < 2 || turn.input.choice !== null || turn.input.greeting) {
      return {
        state: "VENDOR_REGISTRATION_NAME",
        context: turn.context,
        replies: [textReply(COPY.invalidName)],
      };
    }

    return {
      state: "VENDOR_REGISTRATION_BUSINESS",
      context: withRegistration(turn.context, { firstName }),
      replies: [textReply(COPY.askBusiness)],
    };
  }

  if (state === "VENDOR_REGISTRATION_BUSINESS") {
    const businessName = turn.input.raw.trim();
    if (businessName.length < 2 || turn.input.choice !== null) {
      return {
        state: "VENDOR_REGISTRATION_BUSINESS",
        context: turn.context,
        replies: [textReply(COPY.invalidBusiness)],
      };
    }

    return {
      state: "VENDOR_REGISTRATION_CATEGORY",
      context: withRegistration(turn.context, { businessName }),
      replies: await categoryPrompt(deps),
    };
  }

  if (state === "VENDOR_REGISTRATION_CATEGORY") {
    const categories = await deps.categories.listActive();
    if (categories.length === 0) {
      return {
        state: "MAIN_MENU",
        context: {},
        replies: [textReply(COPY.noCategories)],
      };
    }

    const category = categories[(turn.input.choice ?? 0) - 1];
    if (!category) {
      return {
        state: "VENDOR_REGISTRATION_CATEGORY",
        context: turn.context,
        replies: [textReply(COPY.invalidCategory), ...(await categoryPrompt(deps))],
      };
    }

    const next = withRegistration(turn.context, {
      categoryId: category.id,
      categoryName: category.name,
    });

    if (next.registration?.area || next.registration?.city) {
      return {
        state: "VENDOR_REGISTRATION_LANGUAGE",
        context: next,
        replies: languageMenuReplies(),
      };
    }

    return {
      state: "VENDOR_REGISTRATION_LOCATION",
      context: next,
      replies: [textReply(COPY.askLocation)],
    };
  }

  if (state === "VENDOR_REGISTRATION_LOCATION") {
    const location = parseLocation(turn.input.raw);
    if (!location.area && !location.city) {
      return {
        state: "VENDOR_REGISTRATION_LOCATION",
        context: turn.context,
        replies: [textReply(COPY.invalidLocation)],
      };
    }

    return {
      state: "VENDOR_REGISTRATION_LANGUAGE",
      context: withRegistration(turn.context, location),
      replies: languageMenuReplies(),
    };
  }

  if (state === "VENDOR_REGISTRATION_LANGUAGE") {
    const language = LANGUAGES[(turn.input.choice ?? 0) - 1];
    if (!language) {
      return {
        state: "VENDOR_REGISTRATION_LANGUAGE",
        context: turn.context,
        replies: [textReply(COPY.invalidLanguage), ...languageMenuReplies()],
      };
    }

    const next = withRegistration(turn.context, {
      preferredLanguage: language.code,
      preferredLanguageLabel: language.label,
    });

    return {
      state: "VENDOR_REGISTRATION_CONFIRM",
      context: next,
      replies: [confirmReply(registrationConfirmText(next.registration ?? {}))],
    };
  }

  if (state === "VENDOR_REGISTRATION_CONFIRM") {
    if (turn.input.change) {
      return {
        state: "VENDOR_REGISTRATION_NAME",
        context: pendingContext(turn.context),
        replies: [textReply(COPY.askName)],
      };
    }

    if (!turn.input.yes) {
      return confirmDraft(turn.context);
    }

    const { vendor } = await deps.vendors.register({
      whatsappNumber: turn.message.phoneNumber,
      firstName: draft.firstName ?? "Vendor",
      businessName: draft.businessName ?? "Business",
      categoryId: draft.categoryId,
      city: draft.city,
      area: draft.area,
      preferredLanguage: draft.preferredLanguage ?? "en",
      idempotencyKey: `register:${turn.session.id}`,
    });
    const confirmed = await deps.vendors.confirm(vendor.id);
    await syncReferralIdentity(deps, turn.message.phoneNumber, "VENDOR", confirmed.id);
    await qualifyReferral(deps, turn.message.phoneNumber, "VENDOR", confirmed.id);
    const identity = { userType: "VENDOR" as const, userId: confirmed.id };

    if (turn.context.pendingProduct) {
      const continued = continueProductDraft(turn.context.pendingProduct);
      return {
        ...continued,
        identity,
        replies: [textReply(COPY.registered), ...continued.replies],
      };
    }

    return {
      state: "VENDOR_MENU",
      context: {},
      identity,
      replies: [textReply(COPY.registered), ...vendorMenuReplies()],
    };
  }

  return landingFor(turn.identity.userType);
};

export async function startVendorRegistration(
  deps: ConversationEngineDeps,
  prefill: RegistrationDraft = {},
  pendingProduct?: ProductDraft,
): Promise<HandlerResult> {
  const context: SessionContext = {
    registration: prefill,
    ...(pendingProduct ? { pendingProduct } : {}),
  };

  if (!prefill.firstName) {
    return {
      state: "VENDOR_REGISTRATION_NAME",
      context,
      replies: [textReply(COPY.askName)],
    };
  }

  if (!prefill.businessName) {
    return {
      state: "VENDOR_REGISTRATION_BUSINESS",
      context,
      replies: [textReply(COPY.askBusiness)],
    };
  }

  return {
    state: "VENDOR_REGISTRATION_CATEGORY",
    context,
    replies: await categoryPrompt(deps),
  };
}

function pendingContext(context: SessionContext): SessionContext {
  return context.pendingProduct ? { pendingProduct: context.pendingProduct } : {};
}

function confirmDraft(context: SessionContext): HandlerResult {
  return {
    state: "VENDOR_REGISTRATION_CONFIRM",
    context,
    replies: [confirmReply(registrationConfirmText(context.registration ?? {}))],
  };
}

async function categoryPrompt(deps: ConversationEngineDeps) {
  const categories = await deps.categories.listActive();
  if (categories.length === 0) {
    return [textReply(COPY.noCategories)];
  }
  return categoryMenuReplies(categories);
}
