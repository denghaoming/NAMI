import React, { Component } from 'react'
import WalletState from '../state/WalletState';
import logo from "../images/logo.png"
import menu from "../images/menu.png"
import { withNavigation } from '../hocs'
import Menu from '../components/menu/Menu';

class Header extends Component {

    state = {
        account: null,
        chainId: null,
        local: {},
    }

    constructor(props) {
        super(props);
    }

    componentDidMount() {
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.handleAccountsChanged();
    }

    componentDidUpdate(prevProps, prevState, snapshot) {

    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged)
    }

    handleAccountsChanged = () => {
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
    }

    getLocal() {
        let local = {}
        if ("EN" == WalletState.wallet.lang) {
            local.lang = "EN";
        } else {
            local.lang = "中文";
        }
        return local;
    }

    changeLang() {
        console.log("changeLang")
        if ("EN" == WalletState.wallet.lang) {
            WalletState.changeLang("ZH");
        } else {
            WalletState.changeLang("EN");
        }
    }

    showMenu(){
        
    }

    render() {
        return (
            <div className="Header">
                <div className='menu'>
                    <Menu></Menu>
                </div>
                <div className='brand'>
                    <img src={logo}></img>
                </div>
            </div>
        );
    }
}

export default withNavigation(Header);