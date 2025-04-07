import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export type JettonMinterContent = {
    name: string,
    symbol: string,
    decimals: number
};

export type WUConfig = {
    totalSupply: number;
    adminAddress: Address;
    name: string;
    symbol: string;
    decimals: number;
    wallet_code: Cell;
};

export function wUConfigToCell(config: WUConfig): Cell {
    return beginCell().storeCoins(config.totalSupply).storeAddress(config.adminAddress)
        .storeRef(beginCell().storeBuffer(Buffer.from(config.name), 13).storeBuffer(Buffer.from(config.symbol), 4).storeUint(config.decimals, 8).endCell())
        .storeRef(config.wallet_code).endCell();
}

export function jettonContentToCell(content: JettonMinterContent) {
    return beginCell()
        .storeBuffer(Buffer.from(content.name), 13).storeBuffer(Buffer.from(content.symbol), 4)
        .storeUint(content.decimals, 8)
        .endCell();
}

export const Opcodes = {
    mint: 21,
    burn: 0x7bdd97de,
    providerWalletAddress: 0x2c76b973,
    updateAdminAddress: 3,
    internalTransfer: 0x178d4519,
    changeContent: 4
};

export class WUSD implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {
    }

    static createFromAddress(address: Address) {
        return new WUSD(address);
    }

    static createFromConfig(config: WUConfig, code: Cell, workchain = 0) {
        const data = wUConfigToCell(config);
        const init = {code, data};
        return new WUSD(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId?: number;
            jettonValue: bigint;
            toAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.mint, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(via.address)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.value)
                .storeRef(beginCell()
                    .storeUint(Opcodes.internalTransfer, 32)
                    .storeUint(opts.queryId ?? 0, 64).storeCoins(opts.jettonValue)
                    .storeAddress(via.address)
                    .storeAddress(via.address)
                    .storeCoins(0)
                    .endCell())

                .endCell(),
        });

    }

    async sendBurn(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId?: number;
            jettonValue: bigint;
            toAddress: Address;
            respAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.burn, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeCoins(opts.jettonValue)
                .storeAddress(opts.toAddress)
                .storeAddress(opts.respAddress)
                .endCell(),
        });
    }

    /* provide_wallet_address#2c76b973 query_id:uint64 owner_address:MsgAddress include_address:Bool = InternalMsgBody;
    */
    static discoveryMessage(owner: Address, include_address: boolean) {
        return beginCell().storeUint(0x2c76b973, 32).storeUint(0, 64) // op, queryId
            .storeCoins(toNano(0.05)).storeAddress(owner).storeBit(include_address)
            .endCell();
    }

    async sendDiscovery(provider: ContractProvider, via: Sender, owner: Address, include_address: boolean, value:bigint = toNano('0.1')) {
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: WUSD.discoveryMessage(owner, include_address),
            value: value,
        });
    }

    async sendProvideWalletAddress(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryId?: number;
            ownerAddress: Address;
            senderAddress: Address;
        }
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.providerWalletAddress, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(opts.ownerAddress)
                .storeUint(1, 1)
                .storeAddress(opts.senderAddress)
                .endCell(),
        });
    }

    async sendChangeAdmin(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint,
            queryId?: number;
            afterAdminAddress: Address;
        }
    ) {
        if (!via.address) {
            throw new Error("Sender address is required");
        }
        console.log("sendAddress",via.address)
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.updateAdminAddress, 32)
                .storeUint(opts.queryId ?? 0, 64)
                .storeAddress(via.address)
                .storeAddress(opts.afterAdminAddress)
                .endCell(),
        });
    }

    async sendChangeContent(provider: ContractProvider, via: Sender, content: Cell) {
        if (!via.address) {
            throw new Error("Sender address is required");
        }
        await provider.internal(via, {
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: WUSD.changeContentMessage(content,via.address),
            value: toNano("0.05"),
        });
    }

    static changeContentMessage(content: Cell, sendAddress: Address) {
        return beginCell().storeUint(Opcodes.changeContent, 32).storeUint(0, 64) // op, queryId
            .storeAddress(sendAddress)
            .storeRef(content)
            .endCell();
    }

    async getTotalSupply(provider: ContractProvider) {
        const result = await provider.get('get_total_supply', []);
        return result.stack.readNumber();
    }

    async getAdminAddress(provider: ContractProvider) {
        const result = await provider.get('get_admin_address', []);
        return result.stack.readAddress();
    }

    async getWalletAddress(provider: ContractProvider, ownerAddress: Address) {
        const result = await provider.get('get_wallet_address', [{
            type: 'slice',
            cell: beginCell().storeAddress(ownerAddress).endCell()
        }]);
        return result.stack.readAddress();
    }

    async getJettonData(provider: ContractProvider) {
        let res = await provider.get('get_jetton_data', []);
        let totalSupply = res.stack.readBigNumber();
        let adminAddress = res.stack.readAddress();
        let content = res.stack.readCell();
        const cs = content.beginParse()
        const name = cs.loadBuffer(13).toString();
        const symbol = cs.loadBuffer(4).toString();
        const decimals = cs.loadUint(8);
        return {
            totalSupply,
            adminAddress,
            name,
            symbol,
            decimals,
            content
        };
    }

    async getContent(provider: ContractProvider) {
        let res = await this.getJettonData(provider);
        return res.content;
    }


}
