import { APP_NAME } from '../utils/constants'
import React from 'react'

const Footer = () => {
  return (
    <footer className='w-full px-2 py-1'>
        <p className='text-sm text-slate-400 font-light text-end'>{APP_NAME}&copy; {new Date().getFullYear()}</p>
    </footer>
  )
}

export default Footer