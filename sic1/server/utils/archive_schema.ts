import * as raw from "./archive.json";
import { UserDocument, SolutionDocument, HistogramDocument } from "./shared";

interface Archive {
    [id: string]: {
        createTime: FirebaseFirestore.Timestamp,
        readTime: FirebaseFirestore.Timestamp,
        updateTime: FirebaseFirestore.Timestamp,
        data: UserDocument | SolutionDocument | HistogramDocument,
    }
}

const archive = raw as Archive;
export { Archive, archive };