import { atom } from "jotai";

import type { WebhookGroup } from "@/types/webhook-group";

export const groupsAtom = atom<WebhookGroup[]>([]);
