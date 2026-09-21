import { PRODUCT_UNITS } from "@/types/commerce";
import {
  COPY,
  harvestCancelConfirmText,
  harvestConfirmText,
  harvestListText,
  harvestMenuReplies,
  harvestMonthMenuReplies,
  productCategoryMenuReplies,
  unitMenuReplies,
  vendorMenuReplies,
} from "@/lib/conversation/copy";
import { withHarvest } from "@/lib/conversation/context";
import { landingFor } from "@/lib/conversation/handlers/shared";
import { parseHarvestMonth, upcomingHarvestMonths } from "@/lib/harvest/month";
import { parsePositiveNumber, parseUnit } from "@/lib/conversation/input";
import { confirmReply, textReply, yesNoReply } from "@/lib/conversation/replies";
import type {
  ConversationEngineDeps,
  ConversationHandler,
  HandlerResult,
} from "@/lib/conversation/handlers/types";
import type { HarvestDraft } from "@/types/conversation";

export const handleHarvest: ConversationHandler = async (turn, deps) => {
  if (!turn.identity.userId || !deps.harvest) {
    return landingFor(turn.identity.userType);
  }

  const vendor = await deps.vendors.getById(turn.identity.userId);
  if (!vendor || vendor.status !== "ACTIVE") {
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(COPY.vendorInactive)],
    };
  }

  const state = turn.session.current_state;
  const draft = turn.context.harvest ?? {};

  if (state === "HARVEST_MENU") {
    if (turn.input.choiceId === "back" || turn.input.normalized === "vendor menu") {
      return {
        state: "VENDOR_MENU",
        context: {},
        replies: vendorMenuReplies(),
      };
    }
    if (turn.input.choice === 1) {
      return startHarvestDraft(deps);
    }
    if (turn.input.choice === 2) {
      return showHarvestPlans(turn.identity.userId, deps);
    }
    return {
      state: "HARVEST_MENU",
      context: {},
      replies: harvestMenuReplies(),
    };
  }

  if (state === "HARVEST_CROP") {
    const cropName = turn.input.raw.trim();
    if (cropName.length < 2 || turn.input.choice !== null) {
      return {
        state: "HARVEST_CROP",
        context: turn.context,
        replies: [textReply(COPY.invalidHarvestCrop)],
      };
    }
    return continueHarvestDraft({ ...draft, cropName }, deps);
  }

  if (state === "HARVEST_CATEGORY") {
    const categories = await deps.categories.listActive();
    const picked = categories[(turn.input.choice ?? 0) - 1];
    if (!picked) {
      return {
        state: "HARVEST_CATEGORY",
        context: turn.context,
        replies: [textReply(COPY.invalidCategory), ...productCategoryMenuReplies(categories)],
      };
    }
    return continueHarvestDraft(
      { ...draft, categoryId: picked.id, categoryName: picked.name },
      deps,
    );
  }

  if (state === "HARVEST_QUANTITY") {
    const quantity = parsePositiveNumber(turn.input.raw);
    if (!quantity) {
      return {
        state: "HARVEST_QUANTITY",
        context: turn.context,
        replies: [textReply(COPY.invalidQuantity)],
      };
    }
    return continueHarvestDraft({ ...draft, quantity }, deps);
  }

  if (state === "HARVEST_UNIT") {
    const unit = parseUnit(turn.input.raw);
    if (!unit || !PRODUCT_UNITS.includes(unit)) {
      return {
        state: "HARVEST_UNIT",
        context: turn.context,
        replies: [textReply(COPY.invalidUnit), ...unitMenuReplies()],
      };
    }
    return continueHarvestDraft({ ...draft, unit }, deps);
  }

  if (state === "HARVEST_MONTH") {
    const month = parseHarvestMonth(turn.input.raw);
    if (!month) {
      return {
        state: "HARVEST_MONTH",
        context: turn.context,
        replies: [textReply(COPY.invalidHarvestMonth), ...harvestMonthMenuReplies()],
      };
    }
    return continueHarvestDraft(
      {
        ...draft,
        harvestYear: month.year,
        harvestMonth: month.month,
        harvestLabel: month.label,
      },
      deps,
    );
  }

  if (state === "HARVEST_CONFIRM") {
    if (turn.input.change) {
      return startHarvestDraft(deps);
    }
    if (!turn.input.yes) {
      return {
        state: "HARVEST_CONFIRM",
        context: { harvest: draft },
        replies: [confirmReply(harvestConfirmText(draft))],
      };
    }

    await deps.harvest.create({
      vendorId: vendor.id,
      cropName: draft.cropName ?? "Crop",
      quantity: draft.quantity ?? 1,
      unit: PRODUCT_UNITS.includes(draft.unit as (typeof PRODUCT_UNITS)[number])
        ? (draft.unit as (typeof PRODUCT_UNITS)[number])
        : "kg",
      harvestYear: draft.harvestYear ?? upcomingHarvestMonths()[0]!.year,
      harvestMonth: draft.harvestMonth ?? upcomingHarvestMonths()[0]!.month,
      categoryId: draft.categoryId ?? vendor.primary_category_id ?? undefined,
      idempotencyKey: `harvest:${turn.session.id}:${draft.cropName}:${draft.harvestYear}:${draft.harvestMonth}:${draft.quantity}`,
    });

    return {
      state: "HARVEST_MENU",
      context: {},
      replies: [textReply(COPY.harvestSaved), ...harvestMenuReplies()],
    };
  }

  if (state === "HARVEST_LIST") {
    if (draft.selectedId) {
      if (turn.input.change) {
        return showHarvestPlans(vendor.id, deps);
      }
      if (!turn.input.yes) {
        const selected = await deps.harvest.getById(draft.selectedId);
        return {
          state: "HARVEST_LIST",
          context: withHarvest(turn.context, { selectedId: draft.selectedId }),
          replies: [yesNoReply(selected ? harvestCancelConfirmText(selected) : COPY.invalidHarvestChoice)],
        };
      }
      await deps.harvest.cancel(draft.selectedId, vendor.id);
      return {
        state: "HARVEST_MENU",
        context: {},
        replies: [textReply(COPY.harvestCancelled), ...harvestMenuReplies()],
      };
    }

    const ids = draft.ids ?? [];
    const planId = ids[(turn.input.choice ?? 0) - 1];
    if (!planId) {
      return {
        state: "HARVEST_LIST",
        context: turn.context,
        replies: [textReply(COPY.invalidHarvestChoice)],
      };
    }
    const plan = await deps.harvest.getById(planId);
    if (!plan || plan.vendor_id !== vendor.id) {
      return showHarvestPlans(vendor.id, deps);
    }
    return {
      state: "HARVEST_LIST",
      context: withHarvest(turn.context, { selectedId: plan.id }),
      replies: [yesNoReply(harvestCancelConfirmText(plan))],
    };
  }

  return {
    state: "HARVEST_MENU",
    context: {},
    replies: harvestMenuReplies(),
  };
};

export async function openHarvestMenu(): Promise<HandlerResult> {
  return {
    state: "HARVEST_MENU",
    context: {},
    replies: harvestMenuReplies(),
  };
}

async function startHarvestDraft(deps: ConversationEngineDeps): Promise<HandlerResult> {
  const categories = await deps.categories.listActive();
  if (categories.length === 0) {
    return {
      state: "VENDOR_MENU",
      context: {},
      replies: [textReply(COPY.noCategories)],
    };
  }
  return {
    state: "HARVEST_CROP",
    context: { harvest: {} },
    replies: [textReply(COPY.askHarvestCrop)],
  };
}

async function continueHarvestDraft(
  draft: HarvestDraft,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  if (!draft.cropName) {
    return {
      state: "HARVEST_CROP",
      context: { harvest: draft },
      replies: [textReply(COPY.askHarvestCrop)],
    };
  }

  if (!draft.categoryId) {
    const categories = await deps.categories.listActive();
    if (categories.length === 0) {
      return {
        state: "VENDOR_MENU",
        context: {},
        replies: [textReply(COPY.noCategories)],
      };
    }
    return {
      state: "HARVEST_CATEGORY",
      context: { harvest: draft },
      replies: productCategoryMenuReplies(categories),
    };
  }

  if (draft.quantity == null) {
    return {
      state: "HARVEST_QUANTITY",
      context: { harvest: draft },
      replies: [textReply(COPY.askHarvestQuantity)],
    };
  }

  if (!draft.unit) {
    return {
      state: "HARVEST_UNIT",
      context: { harvest: draft },
      replies: unitMenuReplies(),
    };
  }

  if (draft.harvestYear == null || draft.harvestMonth == null) {
    return {
      state: "HARVEST_MONTH",
      context: { harvest: draft },
      replies: harvestMonthMenuReplies(),
    };
  }

  return {
    state: "HARVEST_CONFIRM",
    context: { harvest: draft },
    replies: [confirmReply(harvestConfirmText(draft))],
  };
}

async function showHarvestPlans(
  vendorId: string,
  deps: ConversationEngineDeps,
): Promise<HandlerResult> {
  const plans = (await deps.harvest?.listByVendor(vendorId)) ?? [];
  if (plans.length === 0) {
    return {
      state: "HARVEST_MENU",
      context: {},
      replies: [textReply(COPY.noHarvestPlans), ...harvestMenuReplies()],
    };
  }

  return {
    state: "HARVEST_LIST",
    context: { harvest: { ids: plans.slice(0, 8).map((plan) => plan.id) } },
    replies: [textReply(harvestListText(plans))],
  };
}
