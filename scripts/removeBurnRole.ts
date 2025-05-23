import { WUSD } from '../wrappers/WUSD';
import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {Op} from "../wrappers/JettonConstants"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]): Promise<void> {
    const removeAddress = Address.parse(args[0]);
    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!);
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    console.log("Sender address:", provider.sender().address);
    console.log("Address to remove:", removeAddress);

    try {
        await wusd.sendRemoveRole(provider.sender(), {
            value: toNano('0.03'),
            removeAddress: removeAddress,
            removeOp: Op.remove_burner
        });
        
        console.log("Transaction sent successfully");
        console.log("Note: The transaction has been sent to the blockchain.");
        console.log("To verify the result, you can check the transaction status in the blockchain explorer.");
    } catch (error) {
        console.error("Error sending transaction:", error);
    }
}