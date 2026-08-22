import "dotenv/config";

export const DB_PATH = process.env.DB_PATH ?? "./data/silver.db";

export const SUI_GRAPHQL_URL = "https://graphql.testnet.sui.io/graphql";

export const WORLD_PACKAGE_ID = "0x8b8a46ed766fa1358ce7c5c51f6a164b13d627a63e45343f69ed0ba0446c1aa1";

export const SLV_SSU_MODULE = "shared";
export const SLV_SSU_PACKAGE_ID = "0xc2b4a3860039ee9093187b4ab83cd04a116de5e40282b6842a75b5aeddcedfe7";

export const SLV_GATE_MODULE = "silver_gate";
export const SLV_GATE_PACKAGE_ID = "0xd148ab33aabc536b1c7ca1dc3591ae38d7aa3919e7ba498a1ccba02731f9292a";

export const SLV_LOCATION_MODULE = "silver_location";
export const SLV_LOCATION_PACKAGE_ID = "0x3932625a88d41740fb642ef9438829d3e2258484013907c608fdca8a84f65106";

export const SLV_TOLL_MODULE = "silver_toll";
export const SLV_TOLL_PACKAGE_ID = "0x242ceb08f6fbb301a76975560f6a1aceb91d690b91ea31937b60d41f10a96bdc";



