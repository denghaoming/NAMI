import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Presale.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { Presale_Abi } from '../../abi/Presale_Abi'
import { showFromWei } from '../../utils'
import BN from 'bn.js'

import copy from 'copy-to-clipboard';

import Header from '../Header';
import Footer from '../Footer';

class Presale extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
    }

    constructor(props) {
        super(props);
        this.refreshInfo = this.refreshInfo.bind(this);
    }
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.refreshInfo();
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
    }

    handleAccountsChanged = () => {
        console.log(WalletState.wallet.lang);
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
        this.getInfo();
    }

    getLocal() {
        let local = {};
        local.presaleTitle = "火热预售中";
        local.presaleSale = "LY 预售";
        local.presaleLimit = "每个持币地址限购一份";
        local.selAmount = "请选择数额";
        local.presaleBuy = "立即购买";
        local.presaleInviteTitle = "高额奖励";
        local.presaleInviteTip = "推广奖励，100u奖励一个币";
        local.presaleInvite = "邀请好友";

        local.presaleInviteReward = "邀请奖励";
        local.presaleClaim = "领取奖励";

        local.linkCopied = "邀请链接已复制";
        local.linkCopyFailed = " 链接复制失败";
        local.participated = "已参与";
        local.notStart = "未开始";
        local.balanceNotEnough = " 余额不足";
        local.approvalFailed = "授权失败";
        local.buySuccess = "购买成功";
        local.buyFailed = "购买失败";
        local.qtyNotEnough = "库存不足";
        return local;
    }

    _refreshInfoIntervel;
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 3000);
    }

    //获取预售信息
    async getInfo() {
        if (WalletState.wallet.chainId != CHAIN_ID) {
            return;
        }
        try {
            const web3 = new Web3(Web3.givenProvider);
            const presaleContract = new web3.eth.Contract(Presale_Abi, WalletState.config.Presale);
            //获取预售信息
            const saleInfo = await presaleContract.methods.getSaleInfo().call();
            //代币合约地址
            let tokenAddress = saleInfo[0];
            //代币精度
            let tokenDecimals = parseInt(saleInfo[1]);
            //代币符号
            let tokenSymbol = saleInfo[2];
            //每份预售价格
            let pricePerSale = new BN(saleInfo[3], 10);
            //每份预售代币
            let tokenAmountPerSale = new BN(saleInfo[4], 10);
            //暂停购买
            let pauseBuy = saleInfo[5];
            //奖励NFT条件，邀请多少个人
            let nftCondition = parseInt(saleInfo[6]);
            //预售代币剩余数量
            let saleTokenAmount = new BN(saleInfo[7], 10);
            //默认上级，首码地址
            let defaultInvitor = saleInfo[8];

            this.setState({
                pauseBuy: pauseBuy,
                salePrice: pricePerSale,
                showPrice: showFromWei(pricePerSale, 18, 6),
                showSaleTokenAmount: showFromWei(saleTokenAmount, tokenDecimals, 2),
                tokenAddress: tokenAddress,
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
                nftCondition: nftCondition,
                defaultInvitor: defaultInvitor,
            });

            //获取用户情况
            let account = WalletState.wallet.account;
            if (account) {
                const userInfo = await presaleContract.methods.getUserInfo(account).call();
                //是否购买过 
                let active = userInfo[0];
                //当前轮NFT奖励的邀请人数
                let nftInviteIndex = parseInt(userInfo[1]);
                //余额
                let balance = userInfo[2];
                //拥有NFT数量
                let nftNum = parseInt(userInfo[3]);
                //NFT累计奖励数量
                let nftReward = userInfo[4];
                //总邀请人数
                let binderLength = parseInt(userInfo[5]);
                this.setState({
                    active: active,
                    balance: balance,
                    showBalance: showFromWei(balance, 18, 6),
                    nftNum: nftNum,
                    binderLength: binderLength,
                    nftReward: showFromWei(nftReward, 18, 6),
                    nftInviteIndex: nftInviteIndex,
                });
            }
        } catch (e) {
            console.log("getInfo", e.message);
            toast.show(e.message);
        } finally {
        }
    }

    //购买预售
    async buy() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        let account = WalletState.wallet.account;
        if(!account){
            this.connectWallet();
            return;
        }
        //已购买
        if (this.state.active) {
            toast.show("已购买");
            // return;
        }
        if (this.state.pauseBuy) {
            toast.show("暂停购买");
            // return;
        }

        //预售价格
        let cost = new BN(this.state.salePrice, 10);
        let balance = new BN(this.state.balance, 10);
        if (balance.lt(cost)) {
            toast.show('余额不足');
            // return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const presaleContract = new web3.eth.Contract(Presale_Abi, WalletState.config.Presale);
            //邀请人
            let invitor = this.getRef();
            if (!invitor) {
                invitor = ZERO_ADDRESS;
            }
            //购买
            var estimateGas = await presaleContract.methods.buy(invitor).estimateGas({ from: account,value:cost });
            var transaction = await presaleContract.methods.buy(invitor).send({ from: account ,value:cost });
            if (transaction.status) {
                toast.show("购买成功");
            } else {
                toast.show("购买失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //获取邀请人
    getRef() {
        //先从链接获取，如果有，直接使用
        var url = window.location.href;
        var obj = new Object();
        var scan_url = url.split("?");
        if (2 == scan_url.length) {
            scan_url = scan_url[1];
            var strs = scan_url.split("&");
            for (var x in strs) {
                var arr = strs[x].split("=");
                obj[arr[0]] = arr[1];
                //链接里有邀请人
                if ("ref" == arr[0] && arr[1]) {
                    return arr[1];
                }
            }
        }
        //从浏览器缓存获取，这里可能部分浏览器不支持
        var storage = window.localStorage;
        if (storage) {
            return storage["ref"];
        }
        return null;
    }

    //邀请好友
    invite() {
        if (WalletState.wallet.account) {
            var url = window.location.href;
            url = url.split("?")[0];
            let inviteLink = url + "?ref=" + WalletState.wallet.account;
            if (copy(inviteLink)) {
                toast.show(this.state.local.linkCopied)
            } else {
                toast.show(this.state.local.linkCopyFailed)
            }
        }
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    render() {
        return (
            <div className="Presale">
                <Header></Header>
                <div className='Module mt20'>
                    <div className='mt10'>剩余加池子代币：{this.state.showSaleTokenAmount}{this.state.tokenSymbol}</div>
                    <div className='button mt30' onClick={this.buy.bind(this)}>支付 {this.state.showPrice} BNB参与</div>
                    <div className='mt10'>余额：{this.state.showBalance} BNB</div>
                </div>
                <div className='Module mt20'>
                    <div className='button' onClick={this.invite.bind(this)}>邀请好友</div>
                    <div className='mt10'>累计邀请人数：{this.state.binderLength}/{this.state.nftCondition}</div>
                    <div className='mt10'>邀请{this.state.nftCondition}人捐赠即可获得1个NFT，不设上限</div>
                    <div className='mt10'>拥有NFT数量：{this.state.nftNum}</div>
                    <div className='mt10'>NFT累计分红：{this.state.nftReward}</div>
                </div>
                <Footer></Footer>
            </div>
        );
    }
}

export default withNavigation(Presale);