import React, { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge';

interface LabelProps {
    htmlFor: string;
    className?: string;
    children:ReactNode;
}

const Label = ({htmlFor, className, children} : LabelProps) => {
  return (
    <label htmlFor={htmlFor} className={twMerge(`text-white ${className}`)}>{children}</label>
  )
}

export default Label;