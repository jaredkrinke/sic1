import * as Slambda from "slambda";

export const handler = Slambda.createHandler<void, {}>({
    method: "GET",
    validate: function () {},
    createHeaders: Slambda.createCorsWildcardHeaders,

    handle: async (score) => {
        return {};
    },
});

