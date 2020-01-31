import * as Contract from "sic1-server-contract";
import * as Firebase from "firebase-admin";
import * as fbc from "fbc";

const root = Firebase
    .initializeApp({ credential: Firebase.credential.cert(fbc as Firebase.ServiceAccount) })
    .firestore()
    .collection("sic1");

(async () => {
    const docs = (await root
        .limit(1)
        .get()).docs;

    docs.forEach((doc) => {
        console.log(doc);
    });
})()
    .catch((reason) => console.log(reason))
    .then(() => console.log("Done."));
