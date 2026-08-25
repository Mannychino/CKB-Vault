"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@ckb-ccc/core");
async function main() {
    const client = new core_1.ccc.ClientPublicTestnet("http://127.0.0.1:8114");
    const tip = await client.getTip();
    console.log("Connected to CKB devnet!");
    console.log("Tip block:", tip.toString());
}
main().catch((error) => {
    console.error("Failed to connect:", error);
    process.exit(1);
});
