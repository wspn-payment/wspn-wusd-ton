import {Blockchain, internal, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {Address, beginCell, Cell, toNano} from '@ton/core';
import {jettonContentToCell, WUSD} from '../wrappers/WUSD';
import {JettonWallet} from "../wrappers/JettonWallet";
import '@ton/test-utils';
import {compile, sleep} from '@ton/blueprint';
import {Errors, Op} from "../wrappers/JettonConstants";
import {getRandomTon} from "./util";
import {randomAddress} from "@ton/test-utils";

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
        deployer.address;
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
                    wallet_code: jwallet_code,
                    minterAddress: deployer.address,
                    burnerAddress: deployer.address
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

        const totalSupply = await wusd.getTotalSupply();
        console.log("totalSupply", totalSupply)

        const totalSupplyAfter = await wusd.getTotalSupply();
        console.log("totalSupplyAfter", totalSupplyAfter);

        const adminAddress = await wusd.getAdminAddress();
        console.log("adminAddress", adminAddress)

        const totalSupplyAfter2 = await wusd.getTotalSupply();
        console.log("totalSupplyAfter2", totalSupplyAfter2);

        const deployerJettonWallet = await userWallet(deployer.address);

        wusd.sendGrantRole(deployer.getSender(),{
            value: toNano('0.05'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        const totalAfterMint = await wusd.getTotalSupply();
        console.log("totalAfterMint", totalAfterMint);

        let initialJettonBalance = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet balance",initialJettonBalance)

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: deployer.address,
            grantOp: Op.grant_burner
        })

        const burnResult = await wusd.sendBurn(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(3),
            respAddress: deployer.address
        })

        const totalAfterBurn = await wusd.getTotalSupply();
        console.log("totalAfterBurn", totalAfterBurn);

        let afterBurn = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet after burn balance",afterBurn)

    });

    it('admin role can change content', async () => {

        let newContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSD", decimals: 18})
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);

        let newAdmin = await blockchain.treasury('newAdmin');
        await wusd.sendGrantRole(deployer.getSender(),{
            value:toNano(0.03),
            grantAddress: newAdmin.address,
            grantOp: Op.grant_admin
        })

        let changeContent = await wusd.sendChangeContent(deployer.getSender(), newContent);
        expect((await wusd.getContent()).equals(newContent)).toBe(true);


        changeContent = await wusd.sendChangeContent(deployer.getSender(), defaultContent);
        expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
    });
    it('not a admin can not change content', async () => {
        let newContent = jettonContentToCell({name: "Worldwide USD", symbol: "WUSE", decimals: 18});
        let changeContent = await wusd.sendChangeContent(notDeployer.getSender(), newContent);
        // expect((await wusd.getContent()).equals(defaultContent)).toBe(true);
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
        const walletAddress = await wusd.getWalletAddress(deployer.address);
        console.log("walletAddress:", walletAddress)
    })

    it('change admin address', async () => {
        const adminAddress = await wusd.getAdminAddress();
        console.log("before change adminAddress", adminAddress)

        let newAdmin = await blockchain.treasury('newAdmin');

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: newAdmin.address,
            grantOp: Op.grant_admin
        })

        const changeResult = await wusd.sendChangeAdmin(newAdmin.getSender(), {
            value: toNano('0.05'),
            afterAdminAddress: Address.parse("EQDdhET334XLlXwa1JjPRo-2Gvczt8OmRexEOJeUsGmsHlOV")
        });

        await sleep(1000);

        const afterChangeAddress = await wusd.getAdminAddress();
        console.log("after change adminAddress", afterChangeAddress)
    })

    it('only minter address can mint token', async () =>{

        const deployerJettonWallet = await userWallet(deployer.address);

        let minter = await blockchain.treasury('minter');
        const changeResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: minter.address,
            grantOp: Op.grant_minter
        });

        const mintResult = await wusd.sendMint(minter.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        let afterMint = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet after minter balance",afterMint)

    })

    it('remove minter address success', async () =>{

        const deployerJettonWallet = await userWallet(deployer.address);

        let minter = await blockchain.treasury('minter');
        const changeResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: minter.address,
            grantOp: Op.grant_minter
        });

        const removeResult = await wusd.sendRemoveRole(deployer.getSender(),{
            value: toNano('0.05'),
            removeAddress: minter.address,
            removeOp: Op.remove_minter
        });

        expect(removeResult.transactions).toHaveTransaction({
            from:deployer.address,
            to:wusd.address,
            success:true
        })

        const mintResult = await wusd.sendMint(minter.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        let afterMint = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet after minter balance",afterMint)

    })

    it('remove burner address success',async () => {
        let burner = await blockchain.treasury('burner');

        const grantResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: burner.address,
            grantOp: Op.grant_burner
        });

        const removeResult = await wusd.sendRemoveRole(deployer.getSender(),{
            value: toNano('0.05'),
            removeAddress: burner.address,
            removeOp: Op.remove_burner
        });

        console.log(removeResult)
        expect(removeResult.transactions).toHaveTransaction({
            from:deployer.address,
            to:wusd.address,
            success:true
        })

    })

    it('not burner address role can not burn token',async () => {
        const deployerJettonWallet = await userWallet(deployer.address);

        const grantResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        });

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        let burner = await blockchain.treasury('burner');

        const changeResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: burner.address,
            grantOp: Op.grant_burner
        });

        const burnResult =await wusd.sendBurn(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(3),
            respAddress: deployer.address
        });

        let afterBurn = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet after burn balance",afterBurn)

        expect(burnResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: wusd.address,
            aborted: true,
            exitCode: Errors.unauthorized_burn
        })

    })

    it('only burner address role can burn token',async () =>{

        const deployerJettonWallet = await userWallet(deployer.address);
        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(5),
            toAddress: deployer.address
        })

        let burner = await blockchain.treasury('burner');

        const changeResult = await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.05'),
            grantAddress: burner.address,
            grantOp: Op.grant_burner
        });

        const burnResult =await wusd.sendBurn(burner.getSender(), {
            value: toNano('0.05'),
            jettonValue: toNano(3),
            respAddress: deployer.address
        });

        let afterBurn = await deployerJettonWallet.getJettonBalance();
        console.log("deployer wallet after burn balance",afterBurn)

        expect(burnResult.transactions).toHaveTransaction({
            from: burner.address,
            to: wusd.address,
            success: true,
        })

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

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        });

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
        expect(initialJettonBalance).toEqual(5000000000n);
        expect(totalSupply).toEqual(5000000000);

    })

    it('only recover address could recover token from other owner',async ()=>{
        const noDeployerJettonWallet = await userWallet(notDeployer.address);

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: notDeployer.address
        })
        let beforeSalvageBalance = await noDeployerJettonWallet.getJettonBalance();
        console.log("initialJettonBalance",beforeSalvageBalance)

        let recover = await blockchain.treasury('recover');

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: recover.address,
            grantOp: Op.grant_recover
        });

        const recoverResult = await wusd.sendRecover(recover.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano(5),
            toAddress: notDeployer.address,
            respAddress: deployer.address
        })

        let afterRecoverBalance = await noDeployerJettonWallet.getJettonBalance();
        console.log("after salvage the wallet balance",afterRecoverBalance)

        expect(afterRecoverBalance).toEqual(beforeSalvageBalance-toNano(5));

    })

    it('correct send jettons to the other', async ()=>{
        const deployerJettonWallet = await userWallet(deployer.address);
        const unDeployerJettonWallet = await userWallet(notDeployer.address);

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        });

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

        expect(afterSendBalance).toEqual(5000000000n-toNano(1));
        expect(otherReceived).toEqual(5000000000n-afterSendBalance);
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

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

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

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

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

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

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
        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })

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

    it('wallet does not accept internal_transfer not from wallet', async () => {
        const deployerJettonWallet = await userWallet(deployer.address);

        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })
        const mintResult = await wusd.sendMint(deployer.getSender(), {
            value: toNano('0.03'),
            jettonValue: toNano('1'),
            toAddress: deployer.address
        })
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
        // will not into smartContract
        // expect(sendResult.transactions).toHaveTransaction({
        //     from: notDeployer.address,
        //     to: deployerJettonWallet.address,
        //     aborted: true,
        //     exitCode: Errors.not_valid_wallet, //error::unauthorized_incoming_transfer
        // });
        expect(await deployerJettonWallet.getJettonBalance()).toEqual(initialJettonBalance);
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
        await wusd.sendGrantRole(deployer.getSender(), {
            value: toNano('0.03'),
            grantAddress: deployer.address,
            grantOp: Op.grant_minter
        })
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
