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

interface PuzzleMailData {
    loadType: "puzzle";
}

interface NonPuzzleMailData {
    subject: React.ReactNode;
}

interface AllMailData {
    to?: string[];
    from: Contact;
    create: (context: MailContext) => React.ReactNode;
    unimportant?: boolean;

    loadLabel?: string;
    loadType?: PuzzleListTypes;

    actions?: string[];
}

export type MailData = AllMailData & (PuzzleMailData | NonPuzzleMailData);

export type Mail = MailData & {
    id: string;
    solvedCount?: number;
};
