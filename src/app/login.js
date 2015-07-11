import React from 'react';
import {root} from 'data';

export class LoginButton extends React.Component {
  new = true;
  state = {};

  componentWillMount() {this.new = false}

  constructor() {
    super();
    root.onAuth(authData => {
      if (this.new) this.state = {authData: authData};
      else this.setState({authData: authData});
    });
  }

  render() {return (
    <div style={{textAlign: 'right', marginRight: '1rem'}}>
      {/* Anonymous */}
      {this.state.authData && this.state.authData.provider === 'anonymous' ?
      <div>
        <p>Anonymous session.</p>
        <button className='sf-button-flat' onClick={this.loginWithTwitter}>
          <span>Sign in with Twitter.</span>
          <span className='sf-icon-twitter inline'></span>
        </button>
      </div> : null}

      {/* Twitter */}
      {this.state.authData && this.state.authData.twitter ?
      <div>
        <p>Signed in as {this.state.authData.twitter.displayName}.</p>
        <button className='sf-button-flat' onClick={this.logout}>
          <span>Sign out</span>
          <span className='sf-icon-sign-out inline'></span>
        </button>
      </div> : null}
    </div>
  )}

  logout = () => {
    root.unauth();
  }

  loginWithTwitter = () => {
    root.authWithOAuthRedirect('twitter', err => {
      if (err) console.warn(err);
    });
  }
}