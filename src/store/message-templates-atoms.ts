import { atom } from "jotai";

import type { MessageTemplate } from "@/types/message-template";

export const templatesAtom = atom<MessageTemplate[]>([]);
