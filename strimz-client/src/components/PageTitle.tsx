import React, { ReactNode } from 'react';

interface PageTitleProps {
    children: ReactNode;
}
const PageTitle = ({children}: PageTitleProps) => {
  return (
    <h1 className='text-white text-3xl font-semibold w-full'>
      {children}
    </h1>
  )
}

export default PageTitle;