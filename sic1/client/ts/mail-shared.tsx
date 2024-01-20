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

interface AllMailData {
    to?: Readonly<string[]>;
    from: Contact;
    create: (context: MailContext) => React.ReactNode;
    unimportant?: boolean;

    loadLabel?: string;
    loadType?: PuzzleListTypes;

    actions?: Readonly<string[]>;
}

export type PuzzleMailData = AllMailData & {
    loadType: "puzzle";
};

export type NonPuzzleMailData = AllMailData & {
    subject: React.ReactNode;
};

export type MailData = PuzzleMailData | NonPuzzleMailData;

export type Mail = MailData & {
    id: string;
    solvedCount?: number;
};
