import {Blockchain, internal, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, beginCell, Cell, toNano} from '@ton/core';
import {jettonContentToCell, WUSD} from '../wrappers/WUSD';
import {JettonWallet} from "../wrappers/JettonWallet";
import '@ton/test-utils';
import {compile, sleep} from '@ton/blueprint';
import {Errors, Op} from "../wrappers/JettonConstants";
import {getRandomTon} from "./util";
import {randomAddress} from "@ton/test-utils";
import {add} from "@tact-lang/compiler/dist/grammar/grammar";

let fwd_fee = 721000n, gas_consumption = 10000000n, min_tons_for_storage = 10000000n;

describe('WUSD', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('WUSD');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let notDeployer: SandboxContract<TreasuryContract>;

    let wusd: SandboxContract<WUSD>;
    let userWallet: any;
    let defaultContent: any;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        let jwallet_code = await compile('JettonWallet');

        deployer = await blockchain.treasury('deployer');
        notDeployer = await blockchain.treasury('notDeployer');
        defaultContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSD", decimals: 18});

        wusd = blockchain.openContract(
            WUSD.createFromConfig(
                {
                    totalSupply: 0,
                    adminAddress: deployer.address,
                    name: "Worldwide USD",
                    symbol: "WUSD",
                    decimals: 18,
                    wallet_code: jwallet_code
                },
                code
            )
        );

        userWallet = async (address: Address) => blockchain.openContract(
            JettonWallet.createFromAddress(
                await wusd.getWalletAddress(address)
            )
        );

        const deployResult = await wusd.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: wusd.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and wU are ready to use

        const totalSupply = await wusd.getTotalSupply();
        console.log("totalSupply", totalSupply)

        const totalSupplyAfter = await wusd.getTotalSupply();
        console.log("totalSupplyAfter", totalSupplyAfter);

        const adminAddress = await wusd.getAdminAddress();
        console.log("adminAddress", adminAddress)

        const totalSupplyAfter2 = await wusd.getTotalSupply();
        console.log("totalSupplyAfter2", totalSupplyAfter2);

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2")
        })

        const totalAfterMint = await wusd.getTotalSupply();
        console.log("totalAfterMint", totalAfterMint);

        const burnResult = await wusd.sendBurn(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(3),
            toAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
            respAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2")
        })

        const totalAfterBurn = await wusd.getTotalSupply();
        console.log("totalAfterBurn", totalAfterBurn);

    });

    it('minter admin can change content', async () => {
        let newContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSD", decimals: 18})
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
        let changeContent = await wusd.sendChangeContent(deployer.getSender(), newContent);
        expect((await wusd.getContent()).equals(newContent)).toBe(true);
        changeContent = await wusd.sendChangeContent(deployer.getSender(), defaultContent);
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
    });
    it('not a minter admin can not change content', async () => {
        let newContent = beginCell().storeUint(1,1).endCell();
        let changeContent = await wusd.sendChangeContent(notDeployer.getSender(), newContent);
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
        expect(changeContent.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: wusd.address,
            aborted: true,
            exitCode: Errors.not_admin, // error::unauthorized_change_content_request
        });
    });

    it('provide wallet address', async () => {
        // const walletAddress = await wU.getWalletAddress(Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"));
        // console.log(walletAddress)
        console.log("deployerAddress:", deployer.address)
        const provideResult = await wusd.sendProvideWalletAddress(deployer.getSender(), {
            value: toNano('0.05'),
            ownerAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
            senderAddress: Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"),
        })
        console.log(provideResult)

    });

    it('get wallet address', async () => {
        const walletAddress = await wusd.getWalletAddress(Address.parse("EQALw-sfsYmipJXZEKEx05tJn5NJD5ZLxwo8Gv8IVde2OOC2"));
        console.log("walletAddress:", walletAddress)
    })

    it('change admin address', async () => {
        const adminAddress = await wusd.getAdminAddress();
        console.log("before change adminAddress", adminAddress)

        const changeResult = await wusd.sendChangeAdmin(deployer.getSender(), {
            value: toNano('0.05'),
            afterAdminAddress: Address.parse("EQDdhET334XLlXwa1JjPRo-2Gvczt8OmRexEOJeUsGmsHlOV")
        });

        await sleep(1000);

        const afterChangeAddress = await wusd.getAdminAddress();
        console.log("after change adminAddress", afterChangeAddress)
    })

    it('get jetton data', async () => {

        const jettonData = await wusd.getJettonData();
        console.log("jetton data:", jettonData)

    })

    it('not wallet owner should not be able to send jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();

        let initialTotalSupply = await wusd.getTotalSupply();
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        const sendResult = await deployerJettonWallet.sendTransferToken(notDeployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, toNano('0.05'), null);
        console.log("deployerJettonWallet owner address", deployer.getSender())
        console.log("notDeployer address", notDeployer.getSender())
        expect(sendResult.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            // exitCode: Errors.not_owner, //error::unauthorized_transfer
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
        expect(await wusd.getTotalSupply()).toEqual(initialTotalSupply);

        console.log(sendResult.transactions)
    });

    it('impossible to send too much jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = initialJettonBalance + 1n;
        let forwardAmount = toNano('0.05');
        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, forwardAmount, null);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            // exitCode: Errors.balance_error, //error::not_enough_jettons
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2);
    });

    it('correct mint jettons to the owner', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("before mint",initialJettonBalance)

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        await sleep(1000);

        initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after mint",initialJettonBalance)
        const  totalSupply = await wusd.getTotalSupply()
        console.log("total supply",totalSupply)

    })

    it('correct send jettons to the other', async ()=>{
        const deployerJettonWallet = await userWallet(deployer.address);
        const unDeployerJettonWallet = await userWallet(notDeployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        await sleep(1000);

        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after mint",initialJettonBalance)

        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), toNano('0.1'), //tons
            toNano(1), notDeployer.address,
            deployer.address, null, 0, null);

        let afterSendBalance = await deployerJettonWallet.getJettonBalance();
        console.log("after send",afterSendBalance);
        let otherReceived = await unDeployerJettonWallet.getJettonBalance();
        console.log("otherReceived",otherReceived)
    })


    it('malformed forward payload', async() => {

        const deployerJettonWallet    = await userWallet(deployer.address);
        const notDeployerJettonWallet = await userWallet(notDeployer.address);

        let sentAmount     = toNano('0.5');
        let forwardAmount  = getRandomTon(0.01, 0.05); // toNano('0.05');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        let msgPayload     = beginCell().storeUint(0xf8a7ea5, 32).storeUint(0, 64) // op, queryId
            .storeCoins(sentAmount).storeAddress(notDeployer.address)
            .storeAddress(deployer.address)
            .storeMaybeRef(null)
            .storeCoins(toNano('0.05')) // No forward payload indication
            .endCell();
        const res = await blockchain.sendMessage(internal({
            from: deployer.address,
            to: deployerJettonWallet.address,
            body: msgPayload,
            value: toNano('0.2')
        }));


        expect(res.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            // exitCode: 708
        });
    });

    it('correctly sends forward_payload', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        await sleep(2000);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();

        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        const mint2Result = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: notDeployer.address
        })
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        let forwardAmount = toNano('0.05');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();

        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, forwardAmount, forwardPayload);

        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: notDeployerJettonWallet.address,
            to: deployer.address,
        });
        /*
        transfer_notification#7362d09c query_id:uint64 amount:(VarUInteger 16)
                                      sender:MsgAddress forward_payload:(Either Cell ^Cell)
                                      = InternalMsgBody;
        */
        expect(sendResult.transactions).toHaveTransaction({ //notification
            from: notDeployerJettonWallet.address,
            to: notDeployer.address,
            value: forwardAmount,
            body: beginCell().storeUint(Op.transfer_notification, 32).storeUint(0, 64) //default queryId
                .storeCoins(sentAmount)
                .storeAddress(deployer.address)
                .storeUint(1, 1)
                .storeRef(forwardPayload)
                .endCell()
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
    });

    it('no forward_ton_amount - no forward', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        const mint2Result = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: notDeployer.address
        })
        let initialJettonBalance2 = await notDeployerJettonWallet.getJettonBalance();
        let sentAmount = toNano('0.5');
        let forwardAmount = 0n;
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, notDeployer.address,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: notDeployerJettonWallet.address,
            to: deployer.address,
        });

        expect(sendResult.transactions).not.toHaveTransaction({ //no notification
            from: notDeployerJettonWallet.address,
            to: notDeployer.address
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await notDeployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);
    });

    it('check revert on not enough tons for forward', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        await deployer.send({value:toNano('1'), bounce:false, to: deployerJettonWallet.address});
        let sentAmount = toNano('0.1');
        let forwardAmount = toNano('0.3');
        let forwardPayload = beginCell().storeUint(0x1234567890abcdefn, 128).endCell();
        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), forwardAmount, // not enough tons, no tons for gas
            sentAmount, notDeployer.address,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            on: deployerJettonWallet.address,
            aborted: true,
            // exitCode: Errors.not_enough_ton, //error::not_enough_tons
        });
        // Make sure value bounced
        expect(sendResult.transactions).toHaveTransaction({
            from: deployerJettonWallet.address,
            on: deployer.address,
            inMessageBounced: true,
            success: true
        });

        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    });

    // implementation detail
    it('works with minimal ton amount', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.35'),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log('initialJettonBalance',initialJettonBalance)
        const someAddress = Address.parse("EQD__________________________________________0vo");
        const someJettonWallet = await userWallet(someAddress);
        const someResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.1'),
            toAddress: someAddress
        })
        let initialJettonBalance2 = await someJettonWallet.getJettonBalance();
        const deployerBalance = await deployer.getBalance();
        console.log("someJettonWallet add",someJettonWallet.address)
        await deployer.send({value:toNano('1'), bounce:false, to: deployerJettonWallet.address});
        let forwardAmount = toNano('0.3');
        /*
                     forward_ton_amount +
                     fwd_count * fwd_fee +
                     (2 * gas_consumption + min_tons_for_storage));
        */
        let minimalFee = 2n* fwd_fee + 2n*gas_consumption + min_tons_for_storage;
        let sentAmount = forwardAmount + minimalFee; // not enough, need >

        let forwardPayload = null;
        let tonBalance =(await blockchain.getContract(deployerJettonWallet.address)).balance;
        let tonBalance2 = (await blockchain.getContract(someJettonWallet.address)).balance;
        let initBalance = await deployerJettonWallet.getJettonBalance();
        let sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), sentAmount,
            sentAmount, someAddress,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_enough_ton, //error::not_enough_tons
        });

    });

    it('works with minimal ton amount with notification', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.35'),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log('initialJettonBalance',initialJettonBalance)
        const someAddress = Address.parse("EQD__________________________________________0vo");
        const someJettonWallet = await userWallet(someAddress);
        const someResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.1'),
            toAddress: someAddress
        })
        let initialJettonBalance2 = await someJettonWallet.getJettonBalance();
        const deployerBalance = await deployer.getBalance();
        console.log("someJettonWallet add",someJettonWallet.address)
        await deployer.send({value:toNano('1'), bounce:false, to: deployerJettonWallet.address});
        let forwardAmount = toNano('0.3');
        /*
                     forward_ton_amount +
                     fwd_count * fwd_fee +
                     (2 * gas_consumption + min_tons_for_storage));
        */
        let minimalFee = 2n* fwd_fee + 2n*gas_consumption + min_tons_for_storage;
        let sentAmount = forwardAmount + minimalFee; // not enough, need >

        let forwardPayload = null;
        let tonBalance =(await blockchain.getContract(deployerJettonWallet.address)).balance;
        let tonBalance2 = (await blockchain.getContract(someJettonWallet.address)).balance;
        let initBalance = await deployerJettonWallet.getJettonBalance();
        sentAmount += 2000n; // now enough
        console.log("sentAmount",sentAmount)
        let sendResult2 = await deployerJettonWallet.sendTransferToken(deployer.getSender(), sentAmount,
            sentAmount, someAddress,
            deployer.address, null, forwardAmount, forwardPayload);
        expect(sendResult2.transactions).toHaveTransaction({ //no excesses
            from: someJettonWallet.address,
            to: deployer.address,
        });

        expect(sendResult2.transactions).toHaveTransaction({ //notification
            from: someJettonWallet.address,
            to: someAddress,
            value: forwardAmount,
            body: beginCell().storeUint(Op.transfer_notification, 32).storeUint(0, 64) //default queryId
                .storeCoins(sentAmount)
                .storeAddress(deployer.address)
                .storeUint(0, 1)
                .endCell()
        });

        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - sentAmount);
        expect(await someJettonWallet.getJettonBalance()).toEqual(initialJettonBalance2 + sentAmount);

        expect((await blockchain.getContract(someJettonWallet.address)).balance).toBeGreaterThan(min_tons_for_storage);


    });

    //TODO need to be test
    it('wallet does not accept internal_transfer not from wallet', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        /*
          internal_transfer  query_id:uint64 amount:(VarUInteger 16) from:MsgAddress
                             response_address:MsgAddress
                             forward_ton_amount:(VarUInteger 16)
                             forward_payload:(Either Cell ^Cell)
                             = InternalMsgBody;
        */
        let internalTransfer = beginCell().storeUint(0x178d4519, 32).storeUint(0, 64) //default queryId
            .storeCoins(toNano('0.01'))
            .storeAddress(deployer.address)
            .storeAddress(deployer.address)
            .storeCoins(toNano('0.05'))
            .storeUint(0, 1)
            .endCell();
        const sendResult = await blockchain.sendMessage(internal({
            from: notDeployer.address,
            to: deployerJettonWallet.address,
            body: internalTransfer,
            value:toNano('0.3')
        }));
        expect(sendResult.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_valid_wallet, //error::unauthorized_incoming_transfer
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
    });

    it('wallet owner should be able to burn jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.5'),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply = await wusd.getTotalSupply();
        let burnAmount = toNano('0.01');
        const sendResult = await deployerJettonWallet.sendBurn(deployer.getSender(), toNano('0.1'), // ton amount
            burnAmount, deployer.address, null); // amount, response address, custom payload
        expect(sendResult.transactions).toHaveTransaction({ //burn notification
            from: deployerJettonWallet.address,
            to: wusd.address
        });
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: wusd.address,
            to: deployer.address
        });

        const totalSupply = await wusd.getTotalSupply();
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - burnAmount);
        expect(await BigInt(totalSupply)).toEqual(BigInt(initialTotalSupply) - burnAmount);

    });

    it('not wallet owner should not be able to burn jettons', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.5'),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply = await wusd.getTotalSupply();
        let burnAmount = toNano('0.01');
        const sendResult = await deployerJettonWallet.sendBurn(notDeployer.getSender(), toNano('0.1'), // ton amount
            burnAmount, deployer.address, null); // amount, response address, custom payload
        expect(sendResult.transactions).toHaveTransaction({
            from: notDeployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_owner, //error::unauthorized_transfer
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await wusd.getTotalSupply()).toEqual(initialTotalSupply);
    });

    it('wallet owner can not burn more jettons than it has', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.5'),
            toAddress: deployer.address
        })
        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply = await wusd.getTotalSupply();
        let burnAmount = initialJettonBalance + 1n;
        const sendResult = await deployerJettonWallet.sendBurn(deployer.getSender(), toNano('0.1'), // ton amount
            burnAmount, deployer.address, null); // amount, response address, custom payload
        expect(sendResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.balance_error, //error::not_enough_jettons
        });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
        expect(await wusd.getTotalSupply()).toEqual(initialTotalSupply);
    });

    it('minimal burn message fee', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('0.5'),
            toAddress: deployer.address
        })
        let initialJettonBalance   = await deployerJettonWallet.getJettonBalance();
        let initialTotalSupply     = await wusd.getTotalSupply();
        let burnAmount   = toNano('0.01');
        let fwd_fee      = 596000n /*1500012n*/, gas_consumption = 10000000n;
        let minimalFee   = fwd_fee + 2n*gas_consumption;
        console.log("msg_value",minimalFee)
        const sendLow    = await deployerJettonWallet.sendBurn(deployer.getSender(), minimalFee, // ton amount
            burnAmount, deployer.address, null); // amount, response address, custom payload

        expect(sendLow.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.not_enough_gas, //error::burn_fee_not_matched
        });

        const sendExcess = await deployerJettonWallet.sendBurn(deployer.getSender(), minimalFee + 1000n,
            burnAmount, deployer.address, null);

        expect(sendExcess.transactions).toHaveTransaction({
            from: deployer.address,
            to: deployerJettonWallet.address,
            success: true
        });

        const totalSupply = await wusd.getTotalSupply();
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance - burnAmount);
        expect(BigInt(totalSupply)).toEqual(BigInt(initialTotalSupply) - burnAmount);

    });

    it('minter should only accept burn messages from jetton wallets', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('1.5'),
            toAddress: deployer.address
        })
        const burnAmount = toNano('1');
        const burnNotification = (amount: bigint, addr: Address) => {
            return beginCell()
                .storeUint(Op.burn_notification, 32)
                .storeUint(0, 64)
                .storeCoins(amount)
                .storeAddress(addr)
                .storeAddress(deployer.address)
                .endCell();
        }

        let res = await blockchain.sendMessage(internal({
            from: deployerJettonWallet.address,
            to: wusd.address,
            body: burnNotification(burnAmount, randomAddress(0)),
            value: toNano('0.1')
        }));

        expect(res.transactions).toHaveTransaction({
            from: deployerJettonWallet.address,
            to: wusd.address,
            aborted: true,
            exitCode: Errors.not_admin // Unauthorized burn
        });

    });

    it('success accept burn messages from jetton wallets',async ()=>{
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('1.5'),
            toAddress: deployer.address
        })
        const burnAmount = toNano('1');
        const burnNotification = (amount: bigint, addr: Address) => {
            return beginCell()
                .storeUint(Op.burn_notification, 32)
                .storeUint(0, 64)
                .storeCoins(amount)
                .storeAddress(deployer.address)
                .storeAddress(addr)
                .endCell();
        }


        let res = await blockchain.sendMessage(internal({
            from: deployerJettonWallet.address,
            to: wusd.address,
            body: burnNotification(burnAmount, deployer.address),
            value: toNano('0.1')
        }));

        expect(res.transactions).toHaveTransaction({
            from: deployerJettonWallet.address,
            to: wusd.address,
            success: true
        });

    });

    it('report correct discovery address one', async () => {
        let discoveryResult = await wusd.sendDiscovery(deployer.getSender(), deployer.address, true);
        /*
          take_wallet_address#d1735400 query_id:uint64 wallet_address:MsgAddress owner_address:(Maybe ^MsgAddress) = InternalMsgBody;
        */
        const deployerJettonWallet = await userWallet(deployer.address);
        console.log("wallet address",deployerJettonWallet.address)
        expect(discoveryResult.transactions).toHaveTransaction({
            from: wusd.address,
            to: deployer.address,
            success: true,
        });



    });

    it('report correct discovery address two', async () => {
        let discoveryResult = await wusd.sendDiscovery(deployer.getSender(), notDeployer.address, true);
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        expect(discoveryResult.transactions).toHaveTransaction({
            from: wusd.address,
            to: deployer.address,
            success: true,
        });

    });

    it('report correct discovery address three', async () => {
        const notDeployerJettonWallet = await userWallet(notDeployer.address);
        // do not include owner address
        let discoveryResult = await wusd.sendDiscovery(deployer.getSender(), notDeployer.address, false);
        expect(discoveryResult.transactions).toHaveTransaction({
            from: wusd.address,
            to: deployer.address,
            success: true,
        });

    });

    it('Minimal discovery fee', async () => {
        // 5000 gas-units + msg_forward_prices.lump_price + msg_forward_prices.cell_price = 0.0061
        const fwdFee     = 1464012n;
        const minimalFee = fwdFee + 10000000n; // toNano('0.0061');

        let discoveryResult = await wusd.sendDiscovery(deployer.getSender(),
            notDeployer.address,
            false,
            minimalFee);

        expect(discoveryResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: wusd.address,
            aborted: true,
            exitCode: Errors.discovery_fee_not_matched // discovery_fee_not_matched
        });


        discoveryResult = await wusd.sendDiscovery(deployer.getSender(),
            notDeployer.address,
            false,
            minimalFee + 60000000n);

        expect(discoveryResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: wusd.address,
            success: true
        });

    });

    it('Correctly handles not valid address in discovery', async () =>{
        const badAddr       = randomAddress(-1);
        let discoveryResult = await wusd.sendDiscovery(deployer.getSender(),
            badAddr,
            false);

        expect(discoveryResult.transactions).toHaveTransaction({
            from: wusd.address,
            to: deployer.address,
            success: true
        });

        // Include address should still be available

        discoveryResult = await wusd.sendDiscovery(deployer.getSender(),
            badAddr,
            true); // Include addr

        expect(discoveryResult.transactions).toHaveTransaction({
            from: wusd.address,
            to: deployer.address,
            success: true

        });

    });

    it('can not send to masterchain', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('1.5'),
            toAddress: deployer.address
        })
        let sentAmount = toNano('0.5');
        let forwardAmount = toNano('0.05');
        const sendResult = await deployerJettonWallet.sendTransferToken(deployer.getSender(), toNano('0.1'), //tons
            sentAmount, Address.parse("Ef8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAU"),
            deployer.address, null, forwardAmount, null);
        expect(sendResult.transactions).toHaveTransaction({ //excesses
            from: deployer.address,
            to: deployerJettonWallet.address,
            aborted: true,
            exitCode: Errors.wrong_workchain //error::wrong_workchain
        });

    });



});
