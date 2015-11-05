import React from 'react'
import {pure} from './utils'
import {read, signals} from './flow'

export const LoginButton = pure(() => {
  const auth = read('auth')

  return (
    <div className='container text-right'>
      {/* Anonymous */}
      {auth && auth.provider === 'anonymous' ?
      <div>
        <p>Anonymous session.</p>
        <p>
          <button className='sf-button-flat' onClick={signals.login.twitter}>
            <span>Sign in with Twitter.</span>
            <span className='fa fa-twitter inline'></span>
          </button>
        </p>
      </div> : null}

      {/* Twitter */}
      {auth && auth.twitter ?
      <div>
        <p>Signed in as {auth.twitter.displayName}.</p>
        <p>
          <button className='sf-button-flat' onClick={signals.logout}>
            <span>Sign out</span>
            <span className='fa fa-sign-out inline'></span>
          </button>
        </p>
      </div> : null}
    </div>
  )
})