import { Contact } from "./contacts";
import { PuzzleListTypes } from "./puzzle-list";
import { Shared } from "./shared";

export interface MailContext {
    // Mail-specific context
    from: Contact;

    // Global context
    self: Contact;
    jobTitles: typeof Shared.jobTitles,
}

export interface MailData {
    subject: React.ReactNode;
    to?: string[];
    from: Contact;
    create: (context: MailContext) => React.ReactNode;
    unimportant?: boolean;

    loadLabel?: string;
    loadType?: PuzzleListTypes;

    actions?: string[];
}

export type Mail = MailData & {
    id: string;
    solvedCount?: number;
};
