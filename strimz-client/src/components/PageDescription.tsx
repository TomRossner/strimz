import React, { ReactNode } from 'react';

interface PageDescriptionProps {
    children: ReactNode;
}

const PageDescription = ({children}: PageDescriptionProps) => {
  return (
    <p className='text-slate-200 italic font-light text-sm mb-5'>{children}</p>
  )
}

export default PageDescription;