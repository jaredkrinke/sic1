import * as Firebase from "firebase-admin";
import * as fbc from "../fbc.json";

// This file contains V2 data models, for use in tools

// Note: Database integration is copied from src/api.ts rather than shared because I haven't confirmed that sharing the code is supported when deploying to Netlify

// Database integration
const collectionName = "sic1v2";
const database = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore();

export const root = database.collection(collectionName);

export interface UserDocument {
    name?: string;
    solvedCount: number;
}

export enum SolutionFocus {
    cyclesExecuted,
    memoryBytesAccessed,
}

export interface SolutionDocument {
    userId: string;
    testName: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
    timestamp: Firebase.firestore.Timestamp;
}

export interface FailedRequest {
    uri: string;
    timestamp: Firebase.firestore.Timestamp;
    message: string;
    body?: string;
}

export interface Solution {
    userId: string;
    testName: string;
    program: string;
    cyclesExecuted: number;
    memoryBytesAccessed: number;
}
