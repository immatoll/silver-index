import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { SUI_GRAPHQL_URL } from "../config.js";

export const graphql =
    new SuiGraphQLClient({
        network: "testnet",
        url: SUI_GRAPHQL_URL
    });