import { WUSD } from '../wrappers/WUSD';
import {NetworkProvider} from "@ton/blueprint";
import {Address, toNano} from "@ton/core";
import {Op} from "../wrappers/JettonConstants"; // 替换为你的 WUSD 合约类路径
require('dotenv').config();

export async function run(provider: NetworkProvider,args: string[]){

    const newOwnerAddress = Address.parse(args[0]);
    const wusdAddress = Address.parse(process.env.CONTRACT_ADDRESS!); // 替换为你的 WUSD 合约地址
    const wusd = provider.open(WUSD.createFromAddress(wusdAddress));

    console.log(provider.sender().address);
    console.log("new Owner Address:",newOwnerAddress);

    const changeResult = await wusd.sendChangeAdmin(provider.sender(),{
        value: toNano('0.03'),
        afterAdminAddress: newOwnerAddress,
    })

    console.log("changeResult",changeResult)

}