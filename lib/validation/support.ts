import { z } from "zod";
import { TICKET_PRIORITIES, TICKET_STATUSES, USER_TYPES } from "@/types/commerce";

export const openSupportTicketSchema = z.object({
  phoneNumber: z.string().min(7).optional(),
  userType: z.enum(USER_TYPES).optional(),
  userId: z.string().min(1).nullable().optional(),
  category: z.string().trim().min(1).default("GENERAL"),
  priority: z.enum(TICKET_PRIORITIES).default("NORMAL"),
  description: z.string().trim().min(1, "A description is required"),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedTo: z.string().min(1).nullable().optional(),
});

export type OpenSupportTicketInput = z.input<typeof openSupportTicketSchema>;
export type UpdateSupportTicketInput = z.input<typeof updateSupportTicketSchema>;
