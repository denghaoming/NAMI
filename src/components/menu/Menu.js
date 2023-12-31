import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "./Menu.css"
import menu from "./menu.png"
import WalletState from '../../state/WalletState'
import toast from '../toast/toast'
class Menu extends Component {
    state = {
        show: false,
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
    }

    constructor(props) {
        super(props);
        this.showMenu = this.showMenu.bind(this);
        this.hideMenu = this.hideMenu.bind(this);
    }

    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
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
        local.menuHome = "首页";
        local.menuPresale = "预售";
        local.menuComing = "即将开放";
        return local;
    }

    showMenu() {
        this.setState({ show: true })
    }

    hideMenu() {
        this.setState({ show: false })
    }

    routerTo(path, e) {
        this.setState({ show: false })
        this.props.navigate(path);
    }

    showComing(path, e) {
        toast.show(this.state.local.menuComing);
    }

    render() {
        return (
            <div className="Menu">
                <div className='img' onClick={this.showMenu}>
                    <img src={menu} alt="Menu"></img>
                </div>
                {this.state.show && <div className="Menu-Bg">
                    <div className="Menu-Container">
                        <ul>
                            <li className='mt40'>LY</li>
                            <li onClick={this.routerTo.bind(this, "/")}>{this.state.local.menuHome}</li>
                            <li onClick={this.routerTo.bind(this, "/presale")}>{this.state.local.menuPresale}</li>
                        </ul>
                    </div>
                    <div className="flex-1" onClick={this.hideMenu}></div>
                </div>}
            </div>
        );
    }
}

export default withNavigation(Menu);