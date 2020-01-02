import * as Slambda from "slambda";

export const handler = Slambda.createHandler<void, {}>({
    method: "POST",
    validate: function () {},
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (score) => {
        return {};
    },
});

